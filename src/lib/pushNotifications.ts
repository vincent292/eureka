import { supabase } from "./supabaseClient"

const SERVICE_WORKER_PATH = "/sw.js"

type PushEnableResult = {
  enabled: boolean
  sentTest: boolean
}

type PushSendResult = {
  success: boolean
  delivered: number
  inactive: number
}

const base64UrlToUint8Array = (value: string) => {
  const padding = "=".repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = window.atob(base64)
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = ""
  const bytes = new Uint8Array(buffer)
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return window.btoa(binary)
}

const registerPushServiceWorker = async () => {
  if (!("serviceWorker" in navigator)) {
    return null
  }

  return navigator.serviceWorker.register(SERVICE_WORKER_PATH, { scope: "/" })
}

const persistSubscription = async (subscription: PushSubscription) => {
  const json = subscription.toJSON()
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth

  if (!subscription.endpoint || !p256dh || !auth) {
    throw new Error("No se pudieron leer las claves de la suscripcion push.")
  }

  const { error } = await supabase.rpc("upsert_web_push_subscription", {
    p_endpoint: subscription.endpoint,
    p_p256dh_key: p256dh,
    p_auth_key: auth,
    p_user_agent: navigator.userAgent,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function syncWebPushSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false
  }

  const registration = await registerPushServiceWorker()
  if (!registration) {
    return false
  }

  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    return false
  }

  await persistSubscription(subscription)
  return true
}

export async function enableWebPushNotifications(): Promise<PushEnableResult> {
  if (typeof Notification === "undefined" || !("PushManager" in window)) {
    throw new Error("Este navegador no soporta web push.")
  }

  const vapidPublicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY
  if (!vapidPublicKey) {
    throw new Error("Falta configurar VITE_WEB_PUSH_PUBLIC_KEY.")
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission()

  if (permission !== "granted") {
    return { enabled: false, sentTest: false }
  }

  const registration = await registerPushServiceWorker()
  if (!registration) {
    throw new Error("No se pudo registrar el service worker.")
  }

  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(vapidPublicKey),
    })
  }

  await persistSubscription(subscription)
  const sentTestResult = await sendTestWebPushNotification()
  return { enabled: true, sentTest: sentTestResult.delivered > 0 }
}

export async function disableWebPushNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) {
    return
  }

  await supabase.rpc("deactivate_web_push_subscription", {
    p_endpoint: subscription.endpoint,
  })
  await subscription.unsubscribe()
}

export async function sendTestWebPushNotification() {
  const { data, error } = await supabase.functions.invoke("send-web-push", {
    body: {
      type: "test",
      title: "Push activado",
      body: "Las notificaciones push reales de Eureka ya estan listas en este dispositivo.",
      url: "/admin",
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  const result = data as Partial<PushSendResult> | null
  const delivered = Number(result?.delivered ?? 0)
  const inactive = Number(result?.inactive ?? 0)

  if (delivered <= 0) {
    throw new Error(
      inactive > 0
        ? "No hay una suscripcion push activa en este dispositivo. Vuelve a activar el push."
        : "No se pudo entregar el push de prueba. Revisa permisos, suscripcion y despliegue de la funcion.",
    )
  }

  return {
    success: true,
    delivered,
    inactive,
  }
}

export async function exportCurrentPushKey() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return null
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) {
    return null
  }

  const p256dh = subscription.getKey("p256dh")
  const auth = subscription.getKey("auth")

  return {
    endpoint: subscription.endpoint,
    p256dh: p256dh ? arrayBufferToBase64(p256dh) : null,
    auth: auth ? arrayBufferToBase64(auth) : null,
  }
}
