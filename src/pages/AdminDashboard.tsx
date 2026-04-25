import { useEffect, useRef, useState } from "react"
import {
  FaBars,
  FaBell,
  FaCalendarAlt,
  FaClipboardList,
  FaHome,
  FaPlus,
  FaPercent,
  FaSave,
  FaSignOutAlt,
  FaTags,
  FaTimes,
  FaTrash,
  FaUsers,
  FaWhatsapp,
} from "react-icons/fa"
import { useNavigate } from "react-router-dom"
import {
  fetchAdminBookings,
  fetchAdminDiscountTokens,
  fetchAdminHeroSlides,
  fetchMessageTemplates,
  fetchAdminNotifications,
  fetchAdminNoveltyItems,
  fetchAdminPedidosYaPromo,
  fetchAdminPricingRules,
  createDiscountToken,
  createHeroSlide,
  createNoveltyItem,
  createPricingRule,
  deleteDiscountToken,
  deleteHeroSlide,
  deleteNoveltyItem,
  deletePricingRule,
  markNotificationSeen,
  reorderHeroSlides,
  reorderNoveltyItems,
  updateBookingStatus,
  updateDiscountToken,
  updateHeroSlide,
  updateMessageTemplate,
  updateNoveltyItem,
  updatePedidosYaPromo,
  updatePricingRule,
  uploadAdminImage,
  type AdminBooking,
  type AdminDiscountToken,
  type AdminHeroSlide,
  type AdminMessageTemplate,
  type AdminNotification,
  type AdminNoveltyItem,
  type AdminPedidosYaPromo,
  type AdminPricingRule,
} from "../lib/adminDashboardService"
import { supabase } from "../lib/supabaseClient"
import "../styles/AdminDashboard.css"

type Contact = {
  id: number
  phone: string
  email: string
  created_at: string
  deleted: boolean
}

type AdminSection =
  | "overview"
  | "reservations"
  | "calendar"
  | "pricing"
  | "landing"
  | "novelties"
  | "messages"
  | "contacts"

const adminSections: Array<{
  id: AdminSection
  label: string
  icon: typeof FaHome
}> = [
  { id: "overview", label: "Resumen", icon: FaHome },
  { id: "reservations", label: "Reservas", icon: FaClipboardList },
  { id: "calendar", label: "Calendario", icon: FaCalendarAlt },
  { id: "pricing", label: "Precios", icon: FaTags },
  { id: "landing", label: "Landing", icon: FaHome },
  { id: "novelties", label: "Novedades", icon: FaPercent },
  { id: "messages", label: "Mensajes", icon: FaWhatsapp },
  { id: "contacts", label: "Contactos", icon: FaUsers },
]

const today = new Date().toISOString().slice(0, 10)

const playNotificationTone = () => {
  const AudioContextCtor = window.AudioContext
  if (!AudioContextCtor) {
    return
  }

  const context = new AudioContextCtor()
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = "sine"
  oscillator.frequency.setValueAtTime(740, context.currentTime)
  oscillator.frequency.linearRampToValueAtTime(920, context.currentTime + 0.14)
  gain.gain.setValueAtTime(0.0001, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.32)

  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + 0.34)
}

const formatReservationTime = (value: string) =>
  new Date(value).toLocaleTimeString("es-BO", {
    hour: "2-digit",
    minute: "2-digit",
  })

const formatReservationDate = (value: string) =>
  new Date(value).toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

const statusLabels: Record<AdminBooking["status"], string> = {
  pending_payment: "Pendiente pago",
  pendiente_verificacion: "Pendiente verificacion",
  confirmed: "Confirmada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
  expired: "Expirada",
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<AdminSection>("overview")
  const [selectedDate, setSelectedDate] = useState(today)
  const [bookings, setBookings] = useState<AdminBooking[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [heroSlides, setHeroSlides] = useState<AdminHeroSlide[]>([])
  const [noveltyItems, setNoveltyItems] = useState<AdminNoveltyItem[]>([])
  const [pedidosYaPromo, setPedidosYaPromo] = useState<AdminPedidosYaPromo | null>(null)
  const [pricingRules, setPricingRules] = useState<AdminPricingRule[]>([])
  const [discountTokens, setDiscountTokens] = useState<AdminDiscountToken[]>([])
  const [messageTemplates, setMessageTemplates] = useState<AdminMessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [draggedHeroId, setDraggedHeroId] = useState<string | null>(null)
  const [draggedNoveltyId, setDraggedNoveltyId] = useState<string | null>(null)
  const [promoMessage, setPromoMessage] = useState(
    "Eres importante para nosotros y tenemos esta promocion lista para ti.",
  )
  const [editId, setEditId] = useState<number | null>(null)
  const [editPhone, setEditPhone] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [saveMessage, setSaveMessage] = useState("")
  const [bookingNotes, setBookingNotes] = useState<Record<string, string>>({})
  const seenNotificationIdsRef = useRef<string[]>([])

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from("contacts")
      .select("id, phone, email, created_at, deleted")
      .eq("deleted", false)
      .order("created_at", { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    setContacts((data || []) as Contact[])
  }

  const loadDashboard = async (date = selectedDate, withLoader = true) => {
    if (withLoader) {
      setLoading(true)
    }

    try {
      const [
        nextBookings,
        nextNotifications,
        nextHeroSlides,
        nextNoveltyItems,
        nextPedidosYaPromo,
        nextPricingRules,
        nextDiscountTokens,
        nextMessageTemplates,
      ] = await Promise.all([
        fetchAdminBookings(date),
        fetchAdminNotifications(),
        fetchAdminHeroSlides(),
        fetchAdminNoveltyItems(),
        fetchAdminPedidosYaPromo(),
        fetchAdminPricingRules(),
        fetchAdminDiscountTokens(),
        fetchMessageTemplates(),
      ])

      setBookings(nextBookings)
      setNotifications(nextNotifications)
      setHeroSlides(nextHeroSlides)
      setNoveltyItems(nextNoveltyItems)
      setPedidosYaPromo(nextPedidosYaPromo)
      setPricingRules(nextPricingRules)
      setDiscountTokens(nextDiscountTokens)
      setMessageTemplates(nextMessageTemplates)
      setBookingNotes(
        Object.fromEntries(
          nextBookings.map((booking) => [booking.id, booking.adminNotes || ""]),
        ),
      )

      const unseenIds = nextNotifications
        .filter((notification) => notification.status !== "seen")
        .map((notification) => notification.id)

      if (
        seenNotificationIdsRef.current.length > 0 &&
        unseenIds.length > seenNotificationIdsRef.current.length
      ) {
        playNotificationTone()
      }

      seenNotificationIdsRef.current = unseenIds

      await fetchContacts()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard(selectedDate).catch((error) => {
      console.error(error)
      setSaveMessage("No se pudo cargar el dashboard.")
      setLoading(false)
    })
  }, [selectedDate])

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadDashboard(selectedDate, false).catch((error) => console.error(error))
    }, 15000)

    return () => window.clearInterval(timer)
  }, [selectedDate])

  useEffect(() => {
    setSidebarOpen(false)
  }, [activeSection])

  const signOut = async () => {
    await supabase.auth.signOut()
    navigate("/admin/login", { replace: true })
  }

  const sendWhatsApp = (phone: string) => {
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(promoMessage)}`
    window.open(url, "_blank")
  }

  const deleteContact = async (id: number) => {
    const { error } = await supabase
      .from("contacts")
      .update({ deleted: true })
      .eq("id", id)

    if (error) {
      setSaveMessage("No se pudo eliminar el contacto.")
      return
    }

    await fetchContacts()
  }

  const saveEdit = async () => {
    if (editId === null) {
      return
    }

    const { error } = await supabase
      .from("contacts")
      .update({ phone: editPhone, email: editEmail })
      .eq("id", editId)

    if (error) {
      setSaveMessage("No se pudo guardar el contacto.")
      return
    }

    setEditId(null)
    await fetchContacts()
  }

  const handleNotificationBell = async () => {
    const nextOpen = !notificationsOpen
    setNotificationsOpen(nextOpen)

    if (nextOpen) {
      const pending = notifications.filter((notification) => notification.status !== "seen")
      await Promise.all(
        pending.map((notification) =>
          markNotificationSeen(notification.id).catch((error) => console.error(error)),
        ),
      )
      loadDashboard(selectedDate, false).catch((error) => console.error(error))
    }
  }

  const handleBookingStatus = async (
    bookingId: string,
    status: AdminBooking["status"],
  ) => {
    try {
      await updateBookingStatus(
        bookingId,
        status,
        bookingNotes[bookingId] || "",
        status === "rejected" ? bookingNotes[bookingId] || "" : undefined,
      )
      setSaveMessage("Reserva actualizada.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo actualizar la reserva.")
    }
  }

  const handlePricingSave = async (rule: AdminPricingRule) => {
    try {
      await updatePricingRule(rule.id, {
        label: rule.label,
        durationMinutes: rule.durationMinutes,
        personCount: rule.personCount,
        price: rule.price,
        sortOrder: rule.sortOrder,
        isActive: rule.isActive,
      })
      setSaveMessage("Precio guardado.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo guardar el precio.")
    }
  }

  const handlePricingCreate = async () => {
    try {
      await createPricingRule()
      setSaveMessage("Precio creado.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo crear el precio.")
    }
  }

  const handlePricingDelete = async (id: string) => {
    try {
      await deletePricingRule(id)
      setSaveMessage("Precio eliminado.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo eliminar el precio.")
    }
  }

  const handleDiscountCreate = async () => {
    try {
      await createDiscountToken()
      setSaveMessage("Token de descuento creado.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo crear el token.")
    }
  }

  const handleDiscountSave = async (token: AdminDiscountToken) => {
    try {
      await updateDiscountToken(token.id, token)
      setSaveMessage("Token guardado.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo guardar el token.")
    }
  }

  const handleDiscountDelete = async (id: string) => {
    try {
      await deleteDiscountToken(id)
      setSaveMessage("Token eliminado.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo eliminar el token.")
    }
  }

  const handleHeroSave = async (slide: AdminHeroSlide) => {
    try {
      await updateHeroSlide(slide.id, {
        title: slide.title,
        subtitle: slide.subtitle,
        imagePath: slide.imagePath,
        altText: slide.altText,
        sortOrder: slide.sortOrder,
        isActive: slide.isActive,
      })
      setSaveMessage("Slide guardado.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo guardar el slide.")
    }
  }

  const handleHeroCreate = async () => {
    try {
      await createHeroSlide()
      setSaveMessage("Slide creado.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo crear el slide.")
    }
  }

  const handleHeroDelete = async (id: string) => {
    try {
      await deleteHeroSlide(id)
      setSaveMessage("Slide eliminado.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo eliminar el slide.")
    }
  }

  const handleHeroUpload = async (slide: AdminHeroSlide, file: File | undefined) => {
    if (!file) return

    try {
      const imagePath = await uploadAdminImage("hero", file)
      await updateHeroSlide(slide.id, { imagePath })
      setSaveMessage("Imagen del slide subida.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo subir la imagen.")
    }
  }

  const moveHeroSlide = async (targetId: string) => {
    if (!draggedHeroId || draggedHeroId === targetId) return

    const fromIndex = heroSlides.findIndex((slide) => slide.id === draggedHeroId)
    const toIndex = heroSlides.findIndex((slide) => slide.id === targetId)
    if (fromIndex < 0 || toIndex < 0) return

    const nextSlides = [...heroSlides]
    const [moved] = nextSlides.splice(fromIndex, 1)
    nextSlides.splice(toIndex, 0, moved)
    const orderedSlides = nextSlides.map((slide, index) => ({ ...slide, sortOrder: index + 1 }))
    setHeroSlides(orderedSlides)
    setDraggedHeroId(null)
    await reorderHeroSlides(orderedSlides)
  }

  const handleNoveltySave = async (item: AdminNoveltyItem) => {
    try {
      await updateNoveltyItem(item.id, {
        title: item.title,
        description: item.description,
        price: item.price,
        imagePath: item.imagePath,
        badge: item.badge,
        sortOrder: item.sortOrder,
        isActive: item.isActive,
      })
      setSaveMessage("Novedad guardada.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo guardar la novedad.")
    }
  }

  const handleNoveltyCreate = async () => {
    try {
      await createNoveltyItem()
      setSaveMessage("Novedad creada.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo crear la novedad.")
    }
  }

  const handleNoveltyDelete = async (id: string) => {
    try {
      await deleteNoveltyItem(id)
      setSaveMessage("Novedad eliminada.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo eliminar la novedad.")
    }
  }

  const handleNoveltyUpload = async (item: AdminNoveltyItem, file: File | undefined) => {
    if (!file) return

    try {
      const imagePath = await uploadAdminImage("novedades", file)
      await updateNoveltyItem(item.id, { imagePath })
      setSaveMessage("Imagen de novedad subida.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo subir la imagen.")
    }
  }

  const moveNoveltyItem = async (targetId: string) => {
    if (!draggedNoveltyId || draggedNoveltyId === targetId) return

    const fromIndex = noveltyItems.findIndex((item) => item.id === draggedNoveltyId)
    const toIndex = noveltyItems.findIndex((item) => item.id === targetId)
    if (fromIndex < 0 || toIndex < 0) return

    const nextItems = [...noveltyItems]
    const [moved] = nextItems.splice(fromIndex, 1)
    nextItems.splice(toIndex, 0, moved)
    const orderedItems = nextItems.map((item, index) => ({ ...item, sortOrder: index + 1 }))
    setNoveltyItems(orderedItems)
    setDraggedNoveltyId(null)
    await reorderNoveltyItems(orderedItems)
  }

  const handlePedidosYaSave = async () => {
    if (!pedidosYaPromo) {
      return
    }

    try {
      await updatePedidosYaPromo(pedidosYaPromo.id, {
        title: pedidosYaPromo.title,
        description: pedidosYaPromo.description,
        imagePath: pedidosYaPromo.imagePath,
        ctaLabel: pedidosYaPromo.ctaLabel,
        ctaUrl: pedidosYaPromo.ctaUrl,
        points: pedidosYaPromo.points,
        isActive: pedidosYaPromo.isActive,
      })
      setSaveMessage("Bloque de PedidosYa guardado.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo guardar PedidosYa.")
    }
  }

  const handleTemplateSave = async (template: AdminMessageTemplate) => {
    try {
      await updateMessageTemplate(template.id, template)
      setSaveMessage("Plantilla guardada.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo guardar la plantilla.")
    }
  }

  const unseenCount = notifications.filter((notification) => notification.status !== "seen").length
  const pendingBookings = bookings.filter((booking) =>
    ["pending_payment", "pendiente_verificacion"].includes(booking.status),
  )
  const confirmedBookings = bookings.filter((booking) => booking.status === "confirmed")
  const totalRevenue = bookings
    .filter((booking) => booking.status === "confirmed")
    .reduce((sum, booking) => sum + booking.totalAmount, 0)

  const bookingsBySlot = bookings.reduce<Record<string, AdminBooking[]>>((groups, booking) => {
    const key = `${formatReservationTime(booking.startsAt)} - ${formatReservationTime(booking.endsAt)}`
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(booking)
    return groups
  }, {})

  const templateFor = (type: AdminMessageTemplate["type"]) =>
    messageTemplates.find((template) => template.type === type)?.content || ""

  const renderTemplate = (
    template: string,
    booking: AdminBooking,
    motivo = bookingNotes[booking.id] || booking.rejectionReason || "",
  ) =>
    template
      .replaceAll("{nombre}", booking.fullName)
      .replaceAll("{fecha}", formatReservationDate(booking.startsAt))
      .replaceAll("{hora}", formatReservationTime(booking.startsAt))
      .replaceAll("{paquete}", booking.packageLabel || `${booking.durationMinutes} min / ${booking.partySize} persona(s)`)
      .replaceAll("{total}", booking.totalAmount.toFixed(2))
      .replaceAll("{referencia}", booking.paymentReference || "")
      .replaceAll("{motivo}", motivo || "Pago no verificado")

  const openWhatsApp = (booking: AdminBooking, type: AdminMessageTemplate["type"]) => {
    const phone = booking.phone.replace(/\D/g, "")
    const text = renderTemplate(templateFor(type), booking)
    window.open(`https://wa.me/591${phone}?text=${encodeURIComponent(text)}`, "_blank")
  }

  return (
    <main className="admin-dashboard">
      <button
        type="button"
        className="admin-sidebar-toggle"
        onClick={() => setSidebarOpen(true)}
        aria-label="Abrir menu del panel"
      >
        <FaBars />
        <span>Menu</span>
      </button>

      {sidebarOpen ? (
        <button
          type="button"
          className="admin-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="Cerrar menu del panel"
        />
      ) : null}

      <aside className={`admin-sidebar${sidebarOpen ? " is-open" : ""}`}>
        <div className="admin-sidebar__brand">
          <img src="/image/eureka.png" alt="Eureka" />
          <div>
            <strong>Eureka Admin</strong>
            <span>Reservas y contenido</span>
          </div>

          <button
            type="button"
            className="admin-sidebar__close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menu"
          >
            <FaTimes />
          </button>
        </div>

        <nav className="admin-sidebar__nav">
          {adminSections.map((section) => {
            const Icon = section.icon
            return (
              <button
                key={section.id}
                type="button"
                className={activeSection === section.id ? "is-active" : ""}
                onClick={() => {
                  setActiveSection(section.id)
                  setSidebarOpen(false)
                }}
              >
                <Icon />
                <span>{section.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="admin-kicker">Dashboard</span>
            <h1>Panel administrador</h1>
          </div>

          <div className="admin-topbar__actions">
            <label className="admin-date-filter">
              <span>Fecha</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
            </label>

            <button
              type="button"
              className="admin-bell"
              onClick={handleNotificationBell}
              aria-label="Notificaciones"
            >
              <FaBell />
              {unseenCount > 0 ? <span>{unseenCount}</span> : null}
            </button>

            <button type="button" className="admin-signout" onClick={signOut}>
              <FaSignOutAlt />
              <span>Salir</span>
            </button>
          </div>
        </header>

        {notificationsOpen ? (
          <section className="admin-notifications">
            <div className="admin-section-heading">
              <div>
                <span className="admin-kicker">Alertas</span>
                <h2>Centro de notificaciones</h2>
              </div>
            </div>

            <div className="admin-notification-list">
              {notifications.length === 0 ? (
                <p>No hay notificaciones por ahora.</p>
              ) : (
                notifications.map((notification) => (
                  <article key={notification.id} className="admin-notification-card">
                    <strong>{notification.eventType}</strong>
                    <p>{notification.message}</p>
                    <span>
                      {notification.recipient} |{" "}
                      {new Date(notification.createdAt).toLocaleString("es-BO")}
                    </span>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : null}

        {saveMessage ? <div className="admin-toast">{saveMessage}</div> : null}

        {loading ? (
          <div className="admin-loading">Cargando dashboard...</div>
        ) : null}

        {!loading && activeSection === "overview" ? (
          <section className="admin-content">
            <div className="admin-stat-grid">
              <article className="admin-stat-card">
                <span>Reservas del dia</span>
                <strong>{bookings.length}</strong>
              </article>
              <article className="admin-stat-card">
                <span>Pendientes</span>
                <strong>{pendingBookings.length}</strong>
              </article>
              <article className="admin-stat-card">
                <span>Confirmadas</span>
                <strong>{confirmedBookings.length}</strong>
              </article>
              <article className="admin-stat-card">
                <span>Ingreso confirmado</span>
                <strong>Bs {totalRevenue.toFixed(2)}</strong>
              </article>
            </div>

            <div className="admin-split">
              <section className="admin-panel-card">
                <div className="admin-section-heading">
                  <div>
                    <span className="admin-kicker">Seguimiento</span>
                    <h2>Reservas que requieren accion</h2>
                  </div>
                </div>

                <div className="admin-booking-list">
                  {pendingBookings.length === 0 ? (
                    <p>No hay reservas pendientes hoy.</p>
                  ) : (
                    pendingBookings.map((booking) => (
                      <article key={booking.id} className="admin-booking-card">
                        <div>
                          <strong>{booking.fullName}</strong>
                          <span>
                            {formatReservationTime(booking.startsAt)} | {booking.partySize} persona(s)
                          </span>
                        </div>
                        <div className="admin-booking-card__actions">
                          <button
                            type="button"
                            className="btn-approve"
                            onClick={() => handleBookingStatus(booking.id, "confirmed")}
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            className="btn-reject"
                            onClick={() => handleBookingStatus(booking.id, "rejected")}
                          >
                            Rechazar
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section className="admin-panel-card">
                <div className="admin-section-heading">
                  <div>
                    <span className="admin-kicker">Actividad</span>
                    <h2>Ultimas notificaciones</h2>
                  </div>
                </div>

                <div className="admin-notification-list">
                  {notifications.slice(0, 5).map((notification) => (
                    <article key={notification.id} className="admin-notification-card">
                      <strong>{notification.eventType}</strong>
                      <p>{notification.message}</p>
                      <span>{new Date(notification.createdAt).toLocaleString("es-BO")}</span>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </section>
        ) : null}

        {!loading && activeSection === "reservations" ? (
          <section className="admin-content">
            <div className="admin-section-heading">
              <div>
                <span className="admin-kicker">Reservas</span>
                <h2>Gestion completa del dia</h2>
              </div>
            </div>

            <div className="admin-reservation-grid">
              {bookings.map((booking) => (
                <article key={booking.id} className="admin-reservation-card">
                  <div className="admin-reservation-card__top">
                    <div>
                      <strong>{booking.fullName}</strong>
                      <span>{booking.reservationCode}</span>
                    </div>
                    <span className={`status-pill status-pill--${booking.status}`}>
                      {statusLabels[booking.status]}
                    </span>
                  </div>

                  <p>
                    {formatReservationDate(booking.startsAt)} |{" "}
                    {formatReservationTime(booking.startsAt)} - {formatReservationTime(booking.endsAt)}
                  </p>
                  <p>
                    {booking.packageLabel || `${booking.partySize} persona(s) | ${booking.durationMinutes} min`}
                  </p>
                  <p>Subtotal: Bs {(booking.totalAmount + booking.discountAmount).toFixed(2)}</p>
                  <p>
                    Descuento: {booking.discountCode || "Sin codigo"} | Bs{" "}
                    {booking.discountAmount.toFixed(2)}
                  </p>
                  <p>Total pagado: Bs {booking.totalAmount.toFixed(2)}</p>
                  <p>{booking.phone}</p>
                  <p>Referencia: {booking.paymentReference || "Sin referencia"}</p>

                  {booking.paymentReceiptPath && !booking.proofDeletedAt ? (
                    <a
                      className="admin-proof-link"
                      href={booking.paymentReceiptPath}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver comprobante
                    </a>
                  ) : (
                    <p>Comprobante eliminado o no disponible</p>
                  )}

                  <textarea
                    value={bookingNotes[booking.id] || ""}
                    onChange={(event) =>
                      setBookingNotes((current) => ({
                        ...current,
                        [booking.id]: event.target.value,
                      }))
                    }
                    placeholder="Notas o motivo de rechazo"
                  />

                  <div className="admin-reservation-card__actions">
                    <button
                      type="button"
                      className="btn-approve"
                      onClick={() => handleBookingStatus(booking.id, "confirmed")}
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      className="btn-reject"
                      onClick={() => handleBookingStatus(booking.id, "rejected")}
                    >
                      Rechazar
                    </button>
                    <button
                      type="button"
                      className="btn-whatsapp"
                      onClick={() => openWhatsApp(booking, "accepted")}
                    >
                      <FaWhatsapp />
                      Aceptacion
                    </button>
                    <button
                      type="button"
                      className="btn-whatsapp"
                      onClick={() => openWhatsApp(booking, "rejected")}
                    >
                      <FaWhatsapp />
                      Rechazo
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {!loading && activeSection === "calendar" ? (
          <section className="admin-content">
            <div className="admin-section-heading">
              <div>
                <span className="admin-kicker">Calendario</span>
                <h2>Vista por bloques horarios</h2>
              </div>
            </div>

            <div className="admin-calendar">
              {Object.entries(bookingsBySlot).length === 0 ? (
                <p>No hay reservas para la fecha seleccionada.</p>
              ) : (
                Object.entries(bookingsBySlot).map(([slot, slotBookings]) => (
                  <article key={slot} className="admin-calendar-slot">
                    <div className="admin-calendar-slot__head">
                      <strong>{slot}</strong>
                      <span>{slotBookings.length}/3 reservas</span>
                    </div>
                    <div className="admin-calendar-slot__body">
                      {slotBookings.map((booking) => (
                        <div key={booking.id} className={`calendar-booking calendar-booking--${booking.status}`}>
                          <strong>{booking.fullName}</strong>
                          <span>
                            {booking.partySize} persona(s) | Bs {booking.totalAmount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : null}

        {!loading && activeSection === "pricing" ? (
          <section className="admin-content">
            <div className="admin-section-heading">
              <div>
                <span className="admin-kicker">Precios</span>
                <h2>Precios y tokens de descuento</h2>
              </div>
              <button type="button" className="btn-approve" onClick={handlePricingCreate}>
                <FaPlus />
                <span>Nuevo precio</span>
              </button>
            </div>

            <div className="admin-price-grid admin-price-grid--wide">
              {pricingRules.map((rule) => (
                <article key={rule.id} className="admin-price-card admin-price-card--stacked">
                  <div className="admin-card-toolbar">
                    <strong>{rule.label}</strong>
                    <label className="admin-switch">
                      <input
                        type="checkbox"
                        checked={rule.isActive}
                        onChange={(event) =>
                          setPricingRules((current) =>
                            current.map((item) =>
                              item.id === rule.id
                                ? { ...item, isActive: event.target.checked }
                                : item,
                            ),
                          )
                        }
                      />
                      Activo
                    </label>
                  </div>
                  <label>
                    Etiqueta
                    <input
                      value={rule.label}
                      onChange={(event) =>
                        setPricingRules((current) =>
                          current.map((item) =>
                            item.id === rule.id ? { ...item, label: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Duracion (min)
                    <input
                      type="number"
                      value={rule.durationMinutes}
                      onChange={(event) =>
                        setPricingRules((current) =>
                          current.map((item) =>
                            item.id === rule.id
                              ? { ...item, durationMinutes: Number(event.target.value) }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Personas
                    <input
                      type="number"
                      value={rule.personCount}
                      onChange={(event) =>
                        setPricingRules((current) =>
                          current.map((item) =>
                            item.id === rule.id
                              ? { ...item, personCount: Number(event.target.value) }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Precio Bs
                    <input
                      type="number"
                      step="0.5"
                      value={rule.price}
                      onChange={(event) =>
                        setPricingRules((current) =>
                          current.map((item) =>
                            item.id === rule.id
                              ? { ...item, price: Number(event.target.value) }
                              : item,
                          ),
                        )
                      }
                      />
                  </label>
                  <label>
                    Orden
                    <input
                      type="number"
                      value={rule.sortOrder}
                      onChange={(event) =>
                        setPricingRules((current) =>
                          current.map((item) =>
                            item.id === rule.id
                              ? { ...item, sortOrder: Number(event.target.value) }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <div className="admin-inline-actions">
                    <button type="button" className="btn-edit" onClick={() => handlePricingSave(rule)}>
                      <FaSave />
                      <span>Guardar</span>
                    </button>
                    <button type="button" className="btn-reject" onClick={() => handlePricingDelete(rule.id)}>
                      <FaTrash />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <section className="admin-panel-card">
              <div className="admin-section-heading">
                <div>
                  <span className="admin-kicker">Descuentos</span>
                  <h2>Tokens de un solo uso</h2>
                </div>
                <button type="button" className="btn-approve" onClick={handleDiscountCreate}>
                  <FaPlus />
                  <span>Generar token</span>
                </button>
              </div>

              <div className="admin-editor-grid">
                {discountTokens.map((token) => (
                  <article key={token.id} className="admin-editor-card">
                    <div className="admin-card-toolbar">
                      <strong>{token.code}</strong>
                      <span>
                        {token.usedCount}/{token.maxUses} usos
                      </span>
                    </div>
                    <label>
                      Codigo
                      <input
                        value={token.code}
                        onChange={(event) =>
                          setDiscountTokens((current) =>
                            current.map((item) =>
                              item.id === token.id
                                ? { ...item, code: event.target.value.toUpperCase() }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Nombre interno
                      <input
                        value={token.label}
                        onChange={(event) =>
                          setDiscountTokens((current) =>
                            current.map((item) =>
                              item.id === token.id ? { ...item, label: event.target.value } : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <div className="admin-mini-grid">
                      <label>
                        Tipo
                        <select
                          value={token.discountType}
                          onChange={(event) =>
                            setDiscountTokens((current) =>
                              current.map((item) =>
                                item.id === token.id
                                  ? {
                                      ...item,
                                      discountType: event.target.value as AdminDiscountToken["discountType"],
                                    }
                                  : item,
                              ),
                            )
                          }
                        >
                          <option value="percent">Porcentaje</option>
                          <option value="fixed">Monto fijo</option>
                        </select>
                      </label>
                      <label>
                        Valor
                        <input
                          type="number"
                          step="0.5"
                          value={token.discountValue}
                          onChange={(event) =>
                            setDiscountTokens((current) =>
                              current.map((item) =>
                                item.id === token.id
                                  ? { ...item, discountValue: Number(event.target.value) }
                                  : item,
                              ),
                            )
                          }
                        />
                      </label>
                      <label>
                        Usos
                        <input
                          type="number"
                          min="1"
                          value={token.maxUses}
                          onChange={(event) =>
                            setDiscountTokens((current) =>
                              current.map((item) =>
                                item.id === token.id
                                  ? { ...item, maxUses: Number(event.target.value) }
                                  : item,
                              ),
                            )
                          }
                        />
                      </label>
                    </div>
                    <label>
                      Expira
                      <input
                        type="datetime-local"
                        value={token.expiresAt ? token.expiresAt.slice(0, 16) : ""}
                        onChange={(event) =>
                          setDiscountTokens((current) =>
                            current.map((item) =>
                              item.id === token.id
                                ? { ...item, expiresAt: event.target.value || null }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="admin-switch">
                      <input
                        type="checkbox"
                        checked={token.isActive}
                        onChange={(event) =>
                          setDiscountTokens((current) =>
                            current.map((item) =>
                              item.id === token.id
                                ? { ...item, isActive: event.target.checked }
                                : item,
                            ),
                          )
                        }
                      />
                      Activo
                    </label>
                    <div className="admin-inline-actions">
                      <button type="button" className="btn-edit" onClick={() => handleDiscountSave(token)}>
                        <FaSave />
                        <span>Guardar</span>
                      </button>
                      <button type="button" className="btn-reject" onClick={() => handleDiscountDelete(token.id)}>
                        <FaTrash />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>
        ) : null}

        {!loading && activeSection === "landing" ? (
          <section className="admin-content">
            <div className="admin-section-heading">
              <div>
                <span className="admin-kicker">Contenido</span>
                <h2>Hero de la landing</h2>
              </div>
              <button type="button" className="btn-approve" onClick={handleHeroCreate}>
                <FaPlus />
                <span>Nuevo slide</span>
              </button>
            </div>

            <section className="admin-panel-card">
              <div className="admin-editor-grid admin-editor-grid--preview">
                {heroSlides.map((slide) => (
                  <article
                    key={slide.id}
                    className="admin-editor-card admin-editor-card--draggable"
                    draggable
                    onDragStart={() => setDraggedHeroId(slide.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => moveHeroSlide(slide.id)}
                  >
                    <div className="admin-preview-card">
                      <img src={slide.imagePath} alt={slide.altText} />
                      <div>
                        <span>Orden {slide.sortOrder}</span>
                        <strong>{slide.altText || "Slide sin alt"}</strong>
                      </div>
                    </div>
                    <label>
                      Subir imagen
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => handleHeroUpload(slide, event.target.files?.[0])}
                      />
                    </label>
                    <label>
                      Alt
                      <input
                        value={slide.altText}
                        onChange={(event) =>
                          setHeroSlides((current) =>
                            current.map((item) =>
                              item.id === slide.id ? { ...item, altText: event.target.value } : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={slide.isActive}
                        onChange={(event) =>
                          setHeroSlides((current) =>
                            current.map((item) =>
                              item.id === slide.id
                                ? { ...item, isActive: event.target.checked }
                                : item,
                            ),
                          )
                        }
                      />
                      Activo
                    </label>
                    <div className="admin-inline-actions">
                      <button type="button" className="btn-edit" onClick={() => handleHeroSave(slide)}>
                        <FaSave />
                        <span>Guardar</span>
                      </button>
                      <button type="button" className="btn-reject" onClick={() => handleHeroDelete(slide.id)}>
                        <FaTrash />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>
        ) : null}

        {!loading && activeSection === "novelties" ? (
          <section className="admin-content">
            <div className="admin-section-heading">
              <div>
                <span className="admin-kicker">Contenido</span>
                <h2>Novedades y promos</h2>
              </div>
              <button type="button" className="btn-approve" onClick={handleNoveltyCreate}>
                <FaPlus />
                <span>Nueva novedad</span>
              </button>
            </div>

            <section className="admin-panel-card">
              <div className="admin-editor-grid admin-editor-grid--preview">
                {noveltyItems.map((item) => (
                  <article
                    key={item.id}
                    className="admin-editor-card admin-editor-card--draggable"
                    draggable
                    onDragStart={() => setDraggedNoveltyId(item.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => moveNoveltyItem(item.id)}
                  >
                    <div className="admin-preview-card">
                      <img src={item.imagePath} alt={item.title} />
                      <div>
                        <span>{item.badge}</span>
                        <strong>{item.title}</strong>
                      </div>
                    </div>
                    <label>
                      Titulo
                      <input
                        value={item.title}
                        onChange={(event) =>
                          setNoveltyItems((current) =>
                            current.map((entry) =>
                              entry.id === item.id ? { ...entry, title: event.target.value } : entry,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Descripcion
                      <textarea
                        value={item.description}
                        onChange={(event) =>
                          setNoveltyItems((current) =>
                            current.map((entry) =>
                              entry.id === item.id
                                ? { ...entry, description: event.target.value }
                                : entry,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Imagen
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => handleNoveltyUpload(item, event.target.files?.[0])}
                      />
                    </label>
                    <label>
                      Badge
                      <input
                        value={item.badge}
                        onChange={(event) =>
                          setNoveltyItems((current) =>
                            current.map((entry) =>
                              entry.id === item.id ? { ...entry, badge: event.target.value } : entry,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Precio
                      <input
                        type="number"
                        step="0.5"
                        value={item.price ?? ""}
                        onChange={(event) =>
                          setNoveltyItems((current) =>
                            current.map((entry) =>
                              entry.id === item.id
                                ? {
                                    ...entry,
                                    price: event.target.value ? Number(event.target.value) : null,
                                  }
                                : entry,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="admin-switch">
                      <input
                        type="checkbox"
                        checked={item.isActive}
                        onChange={(event) =>
                          setNoveltyItems((current) =>
                            current.map((entry) =>
                              entry.id === item.id
                                ? { ...entry, isActive: event.target.checked }
                                : entry,
                            ),
                          )
                        }
                      />
                      Activa
                    </label>
                    <div className="admin-inline-actions">
                      <button type="button" className="btn-edit" onClick={() => handleNoveltySave(item)}>
                        <FaSave />
                        <span>Guardar</span>
                      </button>
                      <button type="button" className="btn-reject" onClick={() => handleNoveltyDelete(item.id)}>
                        <FaTrash />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {pedidosYaPromo ? (
              <section className="admin-panel-card">
                <h3>Bloque PedidosYa</h3>
                <div className="admin-editor-grid admin-editor-grid--single">
                  <article className="admin-editor-card">
                    <label>
                      Titulo
                      <input
                        value={pedidosYaPromo.title}
                        onChange={(event) =>
                          setPedidosYaPromo((current) =>
                            current ? { ...current, title: event.target.value } : current,
                          )
                        }
                      />
                    </label>
                    <label>
                      Descripcion
                      <textarea
                        value={pedidosYaPromo.description}
                        onChange={(event) =>
                          setPedidosYaPromo((current) =>
                            current ? { ...current, description: event.target.value } : current,
                          )
                        }
                      />
                    </label>
                    <label>
                      Imagen
                      <input
                        value={pedidosYaPromo.imagePath}
                        onChange={(event) =>
                          setPedidosYaPromo((current) =>
                            current ? { ...current, imagePath: event.target.value } : current,
                          )
                        }
                      />
                    </label>
                    <label>
                      CTA label
                      <input
                        value={pedidosYaPromo.ctaLabel}
                        onChange={(event) =>
                          setPedidosYaPromo((current) =>
                            current ? { ...current, ctaLabel: event.target.value } : current,
                          )
                        }
                      />
                    </label>
                    <label>
                      CTA URL
                      <input
                        value={pedidosYaPromo.ctaUrl}
                        onChange={(event) =>
                          setPedidosYaPromo((current) =>
                            current ? { ...current, ctaUrl: event.target.value } : current,
                          )
                        }
                      />
                    </label>
                    <label>
                      Puntos
                      <textarea
                        value={pedidosYaPromo.points.join("\n")}
                        onChange={(event) =>
                          setPedidosYaPromo((current) =>
                            current
                              ? {
                                  ...current,
                                  points: event.target.value
                                    .split("\n")
                                    .map((value) => value.trim())
                                    .filter(Boolean),
                                }
                              : current,
                          )
                        }
                      />
                    </label>
                    <button type="button" className="btn-edit" onClick={handlePedidosYaSave}>
                      <FaSave />
                      <span>Guardar bloque</span>
                    </button>
                  </article>
                </div>
              </section>
            ) : null}
          </section>
        ) : null}

        {!loading && activeSection === "messages" ? (
          <section className="admin-content">
            <div className="admin-section-heading">
              <div>
                <span className="admin-kicker">WhatsApp</span>
                <h2>Plantillas de mensajes</h2>
              </div>
            </div>

            <div className="admin-editor-grid">
              {messageTemplates.map((template) => (
                <article key={template.id} className="admin-editor-card">
                  <div className="admin-card-toolbar">
                    <strong>{template.type === "accepted" ? "Aceptacion" : "Rechazo"}</strong>
                    <label className="admin-switch">
                      <input
                        type="checkbox"
                        checked={template.active}
                        onChange={(event) =>
                          setMessageTemplates((current) =>
                            current.map((item) =>
                              item.id === template.id
                                ? { ...item, active: event.target.checked }
                                : item,
                            ),
                          )
                        }
                      />
                      Activa
                    </label>
                  </div>
                  <textarea
                    rows={10}
                    value={template.content}
                    onChange={(event) =>
                      setMessageTemplates((current) =>
                        current.map((item) =>
                          item.id === template.id
                            ? { ...item, content: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                  <p className="admin-template-help">
                    Variables: {"{nombre}"}, {"{fecha}"}, {"{hora}"}, {"{paquete}"},{" "}
                    {"{total}"}, {"{referencia}"}, {"{motivo}"}
                  </p>
                  <button type="button" className="btn-edit" onClick={() => handleTemplateSave(template)}>
                    <FaSave />
                    <span>Guardar plantilla</span>
                  </button>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {!loading && activeSection === "contacts" ? (
          <section className="admin-content">
            <div className="admin-section-heading">
              <div>
                <span className="admin-kicker">Contactos</span>
                <h2>Base de clientes</h2>
              </div>
            </div>

            <div className="promo-box promo-box--panel">
              <input
                type="text"
                value={promoMessage}
                onChange={(event) => setPromoMessage(event.target.value)}
                placeholder="Escribe tu mensaje promocional"
              />
            </div>

            <div className="table-container">
              <table className="contacts-table">
                <thead>
                  <tr>
                    <th>Telefono</th>
                    <th>Email</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr key={contact.id}>
                      <td data-label="Telefono">
                        {editId === contact.id ? (
                          <input
                            value={editPhone}
                            onChange={(event) => setEditPhone(event.target.value)}
                          />
                        ) : (
                          contact.phone
                        )}
                      </td>
                      <td data-label="Email">
                        {editId === contact.id ? (
                          <input
                            value={editEmail}
                            onChange={(event) => setEditEmail(event.target.value)}
                          />
                        ) : (
                          contact.email
                        )}
                      </td>
                      <td data-label="Fecha">
                        {new Date(contact.created_at).toLocaleString("es-BO")}
                      </td>
                      <td data-label="Acciones">
                        {editId === contact.id ? (
                          <>
                            <button className="btn-edit" onClick={saveEdit}>
                              Guardar
                            </button>
                            <button className="btn-reject" onClick={() => setEditId(null)}>
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="btn-edit"
                              onClick={() => {
                                setEditId(contact.id)
                                setEditPhone(contact.phone)
                                setEditEmail(contact.email)
                              }}
                            >
                              Editar
                            </button>
                            <button className="btn-reject" onClick={() => deleteContact(contact.id)}>
                              Eliminar
                            </button>
                            <button
                              className="btn-whatsapp"
                              onClick={() => sendWhatsApp(contact.phone)}
                            >
                              WhatsApp
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  )
}
