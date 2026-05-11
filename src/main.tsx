import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "./styles/pdf.css"
import App from './App.tsx'
import { syncWebPushSubscription } from './lib/pushNotifications.ts'

if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    syncWebPushSubscription().catch(() => undefined)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
