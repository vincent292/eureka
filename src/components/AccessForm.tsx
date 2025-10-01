import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Props = { onAccess: (contactId: string) => void };

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

/** Helper seguro para extraer un código/estado de error (si existe) */
function getStatusFromError(err: unknown): number | undefined {
  if (!err) return undefined;
  const anyErr = err as any;
  // Comprobaciones comunes usadas por diferentes libs/APIs
  if (typeof anyErr.status === "number") return anyErr.status;
  if (typeof anyErr.statusCode === "number") return anyErr.statusCode;
  if (typeof anyErr.code === "number") return anyErr.code;
  if (typeof anyErr.code === "string" && /^\d+$/.test(anyErr.code)) {
    return parseInt(anyErr.code, 10);
  }
  return undefined;
}

export default function AccessForm({ onAccess }: Props) {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const insertContactWithRetry = async (phoneVal: string, emailVal: string) => {
    const maxAttempts = 3;
    let attempt = 0;
    let lastError: unknown = null;

    const nonRetryableStatuses = [400, 401, 403, 422];

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
          const status = getStatusFromError(error);
          if (status && nonRetryableStatuses.includes(status)) {
            // error no retryable, tirar hacia afuera
            throw error;
          }
          // retryable -> backoff y reintentar
          await sleep(300 * attempt);
        } else if (data) {
          return data.id;
        } else {
          // caso extraño: sin error y sin data
          lastError = { message: "No data returned" };
          await sleep(300 * attempt);
        }
      } catch (err) {
        console.error("Insert attempt error:", attempt, err);
        lastError = err;
        const status = getStatusFromError(err);
        // Si es 404 (endpoint/schema no existe), no tiene sentido reintentar
        if (status === 404) break;
        await sleep(300 * attempt);
      }
    }

    // luego de intentar, si sigue fallando, lanzar último error para manejarlo arriba
    throw lastError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !email.trim()) {
      setError("Por favor completa teléfono y correo.");
      return;
    }

    if (loading) return;

    if (localStorage.getItem("score_registered") === "true") {
      const existingId = localStorage.getItem("score_contact_id");
      if (existingId) {
        onAccess(existingId);
        return;
      }
    }

    setLoading(true);
    setError("");

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
    } catch (err) {
      console.error("Final error al insertar contact:", err);
      // Guardar pending para intentar luego
      const pending = { phone: phone.trim(), email: email.trim(), ts: Date.now() };
      try {
        localStorage.setItem("pending_contact", JSON.stringify(pending));
      } catch (e) {
        console.error("No se pudo guardar pending_contact en localStorage:", e);
      }

      const status = getStatusFromError(err);
      if (status === 404) {
        setError("Error 404: recurso no encontrado. Revisa la URL/endpoint de Supabase.");
      } else if (status === 401 || status === 403) {
        setError("Error de autenticación/permiso al guardar. Revisa la anon key y políticas RLS.");
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
