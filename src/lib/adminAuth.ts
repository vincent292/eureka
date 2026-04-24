import { supabase } from "./supabaseClient"

export async function isCurrentUserAdmin() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return false
  }

  const { data, error } = await supabase
    .from("admin_profiles")
    .select("id")
    .eq("id", session.user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn("No se pudo verificar el rol admin:", error.message)
    return false
  }

  return Boolean(data)
}
