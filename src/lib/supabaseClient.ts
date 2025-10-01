import { createClient } from "@supabase/supabase-js"

// Usa tus variables de entorno (más seguro que poner la key directo)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
