import { supabase } from "./supabaseClient"

export type AdminRole = "staff" | "admin" | "super_admin"

export interface CurrentAdminProfile {
  id: string
  role: AdminRole
  displayName: string | null
  isActive: boolean
  email: string | null
}

export async function getCurrentAdminProfile(): Promise<CurrentAdminProfile | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return null
  }

  const { data, error } = await supabase
    .from("admin_profiles")
    .select("id, role, display_name, is_active")
    .eq("id", session.user.id)
    .eq("is_active", true)
    .maybeSingle()

  if (error) {
    console.warn("No se pudo verificar el perfil admin:", error.message)
    return null
  }

  if (!data) {
    return null
  }

  return {
    id: data.id,
    role: data.role as AdminRole,
    displayName: data.display_name,
    isActive: data.is_active,
    email: session.user.email || null,
  }
}

export async function isCurrentUserAdmin() {
  return Boolean(await getCurrentAdminProfile())
}

export async function isCurrentUserSuperAdmin() {
  const profile = await getCurrentAdminProfile()
  return profile?.role === "super_admin"
}
