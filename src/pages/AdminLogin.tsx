import { useState } from "react"
import type { FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import "../styles/AdminLogin.css"

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setMessage("")

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setMessage("No se pudo iniciar sesion. Revisa tus credenciales.")
      return
    }

    navigate("/admin", { replace: true })
  }

  return (
    <main className="admin-login-page">
      <Link to="/" className="admin-login-home" aria-label="Volver a la landing">
        <img src="/image/eureka.png" alt="Eureka" />
        <span>Volver al sitio</span>
      </Link>

      <form className="admin-login-card" onSubmit={handleSubmit}>
        <img src="/image/eureka.png" alt="Eureka" className="admin-login-logo" />
        <span>Panel Eureka</span>
        <h1>Ingreso administrador</h1>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Ingresando..." : "Entrar"}
        </button>

        {message ? <p>{message}</p> : null}
      </form>
    </main>
  )
}
