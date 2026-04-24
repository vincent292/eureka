import { useEffect, useRef, useState } from "react"
import {
  FaBell,
  FaCalendarAlt,
  FaClipboardList,
  FaHome,
  FaSignOutAlt,
  FaTags,
  FaUsers,
} from "react-icons/fa"
import { useNavigate } from "react-router-dom"
import {
  fetchAdminBookings,
  fetchAdminHeroSlides,
  fetchAdminNotifications,
  fetchAdminNoveltyItems,
  fetchAdminPedidosYaPromo,
  fetchAdminPricingRules,
  markNotificationSeen,
  updateBookingStatus,
  updateHeroSlide,
  updateNoveltyItem,
  updatePedidosYaPromo,
  updatePricingRule,
  type AdminBooking,
  type AdminHeroSlide,
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
  const [loading, setLoading] = useState(true)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
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
      ] = await Promise.all([
        fetchAdminBookings(date),
        fetchAdminNotifications(),
        fetchAdminHeroSlides(),
        fetchAdminNoveltyItems(),
        fetchAdminPedidosYaPromo(),
        fetchAdminPricingRules(),
      ])

      setBookings(nextBookings)
      setNotifications(nextNotifications)
      setHeroSlides(nextHeroSlides)
      setNoveltyItems(nextNoveltyItems)
      setPedidosYaPromo(nextPedidosYaPromo)
      setPricingRules(nextPricingRules)
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
      await updateBookingStatus(bookingId, status, bookingNotes[bookingId] || "")
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

  const unseenCount = notifications.filter((notification) => notification.status !== "seen").length
  const pendingBookings = bookings.filter((booking) => booking.status === "pending_payment")
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

  return (
    <main className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <img src="/image/eureka.png" alt="Eureka" />
          <div>
            <strong>Eureka Admin</strong>
            <span>Reservas y contenido</span>
          </div>
        </div>

        <nav className="admin-sidebar__nav">
          {adminSections.map((section) => {
            const Icon = section.icon
            return (
              <button
                key={section.id}
                type="button"
                className={activeSection === section.id ? "is-active" : ""}
                onClick={() => setActiveSection(section.id)}
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
                    {booking.partySize} persona(s) | {booking.durationMinutes} min | Bs{" "}
                    {booking.totalAmount.toFixed(2)}
                  </p>
                  <p>{booking.phone}</p>

                  <textarea
                    value={bookingNotes[booking.id] || ""}
                    onChange={(event) =>
                      setBookingNotes((current) => ({
                        ...current,
                        [booking.id]: event.target.value,
                      }))
                    }
                    placeholder="Notas administrativas"
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
                <h2>Matriz editable de reservas</h2>
              </div>
            </div>

            <div className="admin-price-grid admin-price-grid--wide">
              {pricingRules.map((rule) => (
                <article key={rule.id} className="admin-price-card admin-price-card--stacked">
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
                  <button type="button" className="btn-edit" onClick={() => handlePricingSave(rule)}>
                    Guardar precio
                  </button>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {!loading && activeSection === "landing" ? (
          <section className="admin-content">
            <div className="admin-section-heading">
              <div>
                <span className="admin-kicker">Contenido</span>
                <h2>Landing editable</h2>
              </div>
            </div>

            <section className="admin-panel-card">
              <h3>Hero carousel</h3>
              <div className="admin-editor-grid">
                {heroSlides.map((slide) => (
                  <article key={slide.id} className="admin-editor-card">
                    <label>
                      Imagen
                      <input
                        value={slide.imagePath}
                        onChange={(event) =>
                          setHeroSlides((current) =>
                            current.map((item) =>
                              item.id === slide.id ? { ...item, imagePath: event.target.value } : item,
                            ),
                          )
                        }
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
                      Orden
                      <input
                        type="number"
                        value={slide.sortOrder}
                        onChange={(event) =>
                          setHeroSlides((current) =>
                            current.map((item) =>
                              item.id === slide.id
                                ? { ...item, sortOrder: Number(event.target.value) }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <button type="button" className="btn-edit" onClick={() => handleHeroSave(slide)}>
                      Guardar slide
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section className="admin-panel-card">
              <h3>Novedades</h3>
              <div className="admin-editor-grid">
                {noveltyItems.map((item) => (
                  <article key={item.id} className="admin-editor-card">
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
                        value={item.imagePath}
                        onChange={(event) =>
                          setNoveltyItems((current) =>
                            current.map((entry) =>
                              entry.id === item.id
                                ? { ...entry, imagePath: event.target.value }
                                : entry,
                            ),
                          )
                        }
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
                    <button type="button" className="btn-edit" onClick={() => handleNoveltySave(item)}>
                      Guardar novedad
                    </button>
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
                      Guardar bloque
                    </button>
                  </article>
                </div>
              </section>
            ) : null}
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
