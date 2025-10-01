import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Props = { onAccess: (contactId: string) => void };

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export default function AccessForm({ onAccess }: Props) {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Intenta sincronizar cualquier contacto pendiente al montar
  useEffect(() => {
    const trySyncPending = async () => {
      const pending = localStorage.getItem("pending_contact");
      if (!pending) return;
      try {
        const { phone: p, email: e } = JSON.parse(pending);
        if (p && e) {
          console.log("Intentando sincronizar contacto pendiente:", { p, e });
          const insertedId = await insertContactWithRetry(p, e);
          if (insertedId) {
            localStorage.removeItem("pending_contact");
            localStorage.setItem("score_registered", "true");
            localStorage.setItem("score_contact_id", String(insertedId));
            onAccess(String(insertedId));
          }
        }
      } catch (err) {
        console.error("Error al sincronizar pending_contact:", err);
      }
    };

    trySyncPending();
  }, [onAccess]);

  // Reintentos con backoff exponencial
  const insertContactWithRetry = async (phoneVal: string, emailVal: string) => {
    const maxAttempts = 3;
    let attempt = 0;
    let lastError: any = null;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        const { data, error } = await supabase
          .from("contacts")
          .insert([{ phone: phoneVal, email: emailVal, deleted: false }])
          .select("id")
          .single();

        console.log("Supabase insert attempt", attempt, { data, error });

        if (error) {
          lastError = error;
          // Si es error que claramente no tiene sentido reintentar (p. ej. constraint), romper
          const nonRetryableStatuses = [400, 401, 403, 422];
          if (error.status && nonRetryableStatuses.includes(error.status)) {
            throw error;
          }
          // si no, esperar y reintentar
          await sleep(300 * attempt); // backoff
        } else if (data) {
          return data.id;
        } else {
          // caso raro: sin error y sin data
          lastError = { message: "No data returned" };
          await sleep(300 * attempt);
        }
      } catch (err) {
        console.error("Insert attempt error:", attempt, err);
        lastError = err;
        // Si es error fatal (ej. 404 del endpoint), devolver al caller
        if (err && err.status && err.status === 404) {
          // No reintentar si endpoint no existe
          break;
        }
        await sleep(300 * attempt);
      }
    }

    // después de reintentos, si sigue fallando, lanzamos el último error
    throw lastError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !email.trim()) {
      setError("Por favor completa teléfono y correo.");
      return;
    }

    // Previene dobles envíos
    if (loading) return;

    // Si ya hay registro (por localStorage), evita reinsertar
    if (localStorage.getItem("score_registered") === "true") {
      const existingId = localStorage.getItem("score_contact_id");
      if (existingId) {
        onAccess(existingId);
        return;
      }
    }

    setLoading(true);
    setError("");

    // DEBUG: mostrar la configuración relevante (en prod verifica esto en la console del browser)
    console.log("Supabase config:", {
      url: import.meta.env.VITE_SUPABASE_URL,
      key: import.meta.env.VITE_SUPABASE_ANON_KEY ? "PRESENT" : "MISSING",
      navigatorOnline: navigator.onLine,
    });

    try {
      const insertedId = await insertContactWithRetry(phone.trim(), email.trim());
      if (insertedId) {
        localStorage.setItem("score_registered", "true");
        localStorage.setItem("score_contact_id", String(insertedId));
        onAccess(String(insertedId));
      }
    } catch (err: any) {
      console.error("Final error al insertar contact:", err);
      // Si la petición falló por problemas de red / límite, guardamos en pending para reintentar luego
      const pending = { phone: phone.trim(), email: email.trim(), ts: Date.now() };
      localStorage.setItem("pending_contact", JSON.stringify(pending));

      const status = err?.status ?? err?.code ?? "unknown";
      if (status === 404) {
        setError("Error 404: recurso no encontrado. Revisa la URL/endpoint de Supabase.");
      } else {
        setError("No se pudo guardar ahora. Se guardó localmente y se intentará sincronizar luego.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: "2rem auto", padding: 16 }}>
      <h2 style={{ textAlign: "center" }}>Ingresa tus datos para continuar</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          type="tel"
          placeholder="Número de teléfono"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          style={{ padding: 8, borderRadius: 6 }}
        />
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: 8, borderRadius: 6 }}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
          <button type="submit" disabled={loading} style={{ padding: "8px 16px", borderRadius: 6 }}>
            {loading ? "Guardando..." : "Continuar"}
          </button>
        </div>
        {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}
      </form>
    </div>
  );
}
