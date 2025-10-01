import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AccessForm({ onAccess }: { onAccess: (contactId: string) => void }) {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !email.trim()) {
      setError("Por favor completa teléfono y correo.");
      return;
    }
    setLoading(true);
    setError("");

    // DEBUG: Verifica la conexión primero
    console.log("Supabase config:", {
      url: import.meta.env.VITE_SUPABASE_URL,
      key: import.meta.env.VITE_SUPABASE_ANON_KEY ? "PRESENT" : "MISSING"
    });

    try {
      // Insert incluyendo el campo 'deleted'
      const { data, error } = await supabase
        .from("contacts")
        .insert([{ 
          phone: phone.trim(), 
          email: email.trim(),
          deleted: false  // ← AÑADE ESTO
        }])
        .select("id")
        .single();  // ← Cambia limit(1) por single()

      console.log("Insert result:", { data, error });

      if (error) {
        console.error("Full error details:", error);
        setError(`Error: ${error.message}`);
      } else if (data) {
        const insertedId = data.id;
        localStorage.setItem("score_registered", "true");
        localStorage.setItem("score_contact_id", insertedId);
        onAccess(insertedId);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("Error inesperado al guardar");
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