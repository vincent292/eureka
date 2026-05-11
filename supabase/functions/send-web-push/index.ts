import { createClient } from "npm:@supabase/supabase-js@2.58.0"
import webpush from "npm:web-push@3.6.7"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

type PushRequest = {
  type?: "test" | "broadcast"
  title?: string
  body?: string
  url?: string
  tag?: string
  target?: "self" | "all"
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const vapidPublicKey = Deno.env.get("WEB_PUSH_VAPID_PUBLIC_KEY") ?? ""
const vapidPrivateKey = Deno.env.get("WEB_PUSH_VAPID_PRIVATE_KEY") ?? ""
const vapidSubject = Deno.env.get("WEB_PUSH_VAPID_SUBJECT") ?? "mailto:admin@eureka.local"

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      throw new Error("Faltan variables de entorno de Supabase para web push.")
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("Faltan WEB_PUSH_VAPID_PUBLIC_KEY o WEB_PUSH_VAPID_PRIVATE_KEY.")
    }

    const authorization = request.headers.get("Authorization")
    if (!authorization) {
      return new Response(JSON.stringify({ error: "No autorizado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Sesion invalida." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: isSuperAdmin, error: superAdminError } = await userClient.rpc("is_super_admin")
    if (superAdminError || !isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Permisos insuficientes." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const payload = (await request.json().catch(() => ({}))) as PushRequest

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    let query = serviceClient
      .from("web_push_subscriptions")
      .select("id, user_id, endpoint, p256dh_key, auth_key")
      .eq("is_active", true)

    if ((payload.target || payload.type || "test") === "self" || (payload.type || "test") === "test") {
      query = query.eq("user_id", user.id)
    }

    const { data: subscriptions, error: subscriptionsError } = await query

    if (subscriptionsError) {
      throw new Error(subscriptionsError.message)
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ success: true, delivered: 0, inactive: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const notificationPayload = JSON.stringify({
      title: payload.title || "Eureka Admin",
      body: payload.body || "Nueva alerta disponible.",
      icon: "/image/eureka.png",
      badge: "/image/eureka.png",
      url: payload.url || "/admin",
      tag: payload.tag || "eureka-admin-push",
      renotify: false,
    })

    let delivered = 0
    let inactive = 0

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh_key,
              auth: subscription.auth_key,
            },
          },
          notificationPayload,
        )
        delivered += 1
      } catch (error) {
        const statusCode = typeof error === "object" && error && "statusCode" in error
          ? Number((error as { statusCode?: number }).statusCode)
          : null

        if (statusCode === 404 || statusCode === 410) {
          inactive += 1
          await serviceClient
            .from("web_push_subscriptions")
            .update({ is_active: false, last_seen_at: new Date().toISOString() })
            .eq("id", subscription.id)
        } else {
          console.error("send-web-push", error)
        }
      }
    }

    return new Response(JSON.stringify({ success: true, delivered, inactive }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo enviar web push."
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
