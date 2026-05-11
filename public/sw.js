self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
  const fallback = {
    title: "Eureka Admin",
    body: "Tienes una nueva alerta.",
    icon: "/image/eureka.png",
    badge: "/image/eureka.png",
    url: "/admin",
  }

  let payload = fallback
  try {
    if (event.data) {
      payload = { ...fallback, ...event.data.json() }
    }
  } catch (_error) {
    payload = fallback
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      data: {
        url: payload.url || "/admin",
      },
      tag: payload.tag || "eureka-admin-alert",
      renotify: Boolean(payload.renotify),
    }),
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || "/admin"

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }

      return undefined
    }),
  )
})
