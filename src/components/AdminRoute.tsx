import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { isCurrentUserAdmin } from "../lib/adminAuth"
import { supabase } from "../lib/supabaseClient"
import "../styles/AdminLogin.css"

interface AdminRouteProps {
  children: ReactNode
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function checkAccess() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      setAuthenticated(Boolean(session))
      setAuthorized(session ? await isCurrentUserAdmin() : false)
      setLoading(false)
    }

    checkAccess()

    const { data } = supabase.auth.onAuthStateChange(() => {
      checkAccess()
    })

    return () => {
      isMounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return <main className="admin-gate">Verificando acceso...</main>
  }

  if (!authenticated) {
    return <Navigate to="/admin/login" replace />
  }

  if (!authorized) {
    return (
      <main className="admin-gate">
        Tu usuario no tiene permisos para entrar al panel.
      </main>
    )
  }

  return children
}
