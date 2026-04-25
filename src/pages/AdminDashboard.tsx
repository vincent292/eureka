import { useEffect, useRef, useState } from "react"
import {
  FaBars,
  FaBell,
  FaCalendarAlt,
  FaClipboardList,
  FaDownload,
  FaEdit,
  FaHome,
  FaList,
  FaPlus,
  FaPercent,
  FaQrcode,
  FaSave,
  FaSignOutAlt,
  FaTags,
  FaThLarge,
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
  fetchAdminPaymentQrHistory,
  fetchAdminPaymentQrs,
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
  updateBookingSchedule,
  updateDiscountToken,
  updateHeroSlide,
  updateMessageTemplate,
  updateNoveltyItem,
  updatePedidosYaPromo,
  updatePaymentQrProtected,
  updatePricingRule,
  uploadAdminImage,
  type AdminBooking,
  type AdminDiscountToken,
  type AdminHeroSlide,
  type AdminMessageTemplate,
  type AdminNotification,
  type AdminNoveltyItem,
  type AdminPedidosYaPromo,
  type AdminPaymentQr,
  type AdminPaymentQrHistory,
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

type ReservationViewMode = "grid" | "list"
type CalendarViewMode = "day" | "week" | "month"
type AdminViewMode = "grid" | "list"
type AdminEditorModal =
  | { type: "pricing"; id: string }
  | { type: "discount"; id: string }
  | { type: "hero"; id: string }
  | { type: "novelty"; id: string }
  | { type: "pedidosya"; id: string }
  | { type: "paymentQr"; id: string }
  | null

type AdminSection =
  | "overview"
  | "reservations"
  | "calendar"
  | "pricing"
  | "discounts"
  | "paymentQr"
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
  { id: "discounts", label: "Tokens", icon: FaPercent },
  { id: "paymentQr", label: "QR de pago", icon: FaQrcode },
  { id: "landing", label: "Landing", icon: FaHome },
  { id: "novelties", label: "Novedades", icon: FaTags },
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

const formatDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

const buildDateTime = (dateKey: string, hour: number) => {
  const hourLabel = `${hour}`.padStart(2, "0")
  return new Date(`${dateKey}T${hourLabel}:00:00`).toISOString()
}

const addDays = (date: Date, days: number) => {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

const getWeekDays = (dateKey: string) => {
  const base = new Date(`${dateKey}T00:00:00`)
  const mondayOffset = (base.getDay() + 6) % 7
  const monday = addDays(base, -mondayOffset)
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
}

const getMonthDays = (dateKey: string) => {
  const base = new Date(`${dateKey}T00:00:00`)
  const first = new Date(base.getFullYear(), base.getMonth(), 1)
  const startOffset = (first.getDay() + 6) % 7
  const gridStart = addDays(first, -startOffset)
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
}

const calendarHours = Array.from({ length: 14 }, (_, index) => index + 9)

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
  const [calendarBookings, setCalendarBookings] = useState<AdminBooking[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [heroSlides, setHeroSlides] = useState<AdminHeroSlide[]>([])
  const [noveltyItems, setNoveltyItems] = useState<AdminNoveltyItem[]>([])
  const [pedidosYaPromo, setPedidosYaPromo] = useState<AdminPedidosYaPromo | null>(null)
  const [pricingRules, setPricingRules] = useState<AdminPricingRule[]>([])
  const [discountTokens, setDiscountTokens] = useState<AdminDiscountToken[]>([])
  const [paymentQrs, setPaymentQrs] = useState<AdminPaymentQr[]>([])
  const [paymentQrHistory, setPaymentQrHistory] = useState<AdminPaymentQrHistory[]>([])
  const [messageTemplates, setMessageTemplates] = useState<AdminMessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [reservationViewMode, setReservationViewMode] = useState<ReservationViewMode>("grid")
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>("day")
  const [pricingViewMode, setPricingViewMode] = useState<AdminViewMode>("grid")
  const [tokenViewMode, setTokenViewMode] = useState<AdminViewMode>("grid")
  const [landingViewMode, setLandingViewMode] = useState<AdminViewMode>("grid")
  const [noveltyViewMode, setNoveltyViewMode] = useState<AdminViewMode>("grid")
  const [editorModal, setEditorModal] = useState<AdminEditorModal>(null)
  const [qrSecret, setQrSecret] = useState("")
  const [draggedBookingId, setDraggedBookingId] = useState<string | null>(null)
  const [expandedMonthDay, setExpandedMonthDay] = useState<string | null>(null)
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(
    typeof Notification !== "undefined" && Notification.permission === "granted",
  )
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
        nextCalendarBookings,
        nextNotifications,
        nextHeroSlides,
        nextNoveltyItems,
        nextPedidosYaPromo,
        nextPricingRules,
        nextDiscountTokens,
        nextPaymentQrs,
        nextPaymentQrHistory,
        nextMessageTemplates,
      ] = await Promise.all([
        fetchAdminBookings(date),
        fetchAdminBookings(),
        fetchAdminNotifications(),
        fetchAdminHeroSlides(),
        fetchAdminNoveltyItems(),
        fetchAdminPedidosYaPromo(),
        fetchAdminPricingRules(),
        fetchAdminDiscountTokens(),
        fetchAdminPaymentQrs(),
        fetchAdminPaymentQrHistory(),
        fetchMessageTemplates(),
      ])

      setBookings(nextBookings)
      setCalendarBookings(nextCalendarBookings)
      setNotifications(nextNotifications)
      setHeroSlides(nextHeroSlides)
      setNoveltyItems(nextNoveltyItems)
      setPedidosYaPromo(nextPedidosYaPromo)
      setPricingRules(nextPricingRules)
      setDiscountTokens(nextDiscountTokens)
      setPaymentQrs(nextPaymentQrs)
      setPaymentQrHistory(nextPaymentQrHistory)
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
        const newestNotification = nextNotifications.find(
          (notification) => !seenNotificationIdsRef.current.includes(notification.id),
        )
        playNotificationTone()
        if (browserNotificationsEnabled && newestNotification && document.hidden) {
          new Notification("Eureka Admin", {
            body: newestNotification.message,
            icon: "/image/eureka.png",
          })
        }
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

  const requestBrowserNotifications = async () => {
    if (typeof Notification === "undefined") {
      setSaveMessage("Este navegador no soporta notificaciones.")
      return
    }

    const permission = await Notification.requestPermission()
    const enabled = permission === "granted"
    setBrowserNotificationsEnabled(enabled)
    setSaveMessage(
      enabled
        ? "Notificaciones del navegador activadas mientras el panel este abierto."
        : "No se activaron las notificaciones del navegador.",
    )
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

  const handleBookingDrop = async (dateKey: string, hour: number) => {
    if (!draggedBookingId) return

    try {
      await updateBookingSchedule(draggedBookingId, buildDateTime(dateKey, hour))
      setSaveMessage("Reserva reagendada desde el calendario.")
      const draggedDate = calendarBookings.find((booking) => booking.id === draggedBookingId)?.startsAt
      await loadDashboard(draggedDate ? formatDateKey(new Date(draggedDate)) : selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo reagendar la reserva.")
    } finally {
      setDraggedBookingId(null)
    }
  }

  const handleBookingDateDrop = async (dateKey: string) => {
    const draggedBooking = calendarBookings.find((booking) => booking.id === draggedBookingId)
    if (!draggedBooking) return

    await handleBookingDrop(dateKey, new Date(draggedBooking.startsAt).getHours())
  }

  const handleBookingTimeEdit = async (booking: AdminBooking, newTime: string) => {
    try {
      const dateKey = formatDateKey(new Date(booking.startsAt))
      await updateBookingSchedule(
        booking.id,
        new Date(`${dateKey}T${newTime}:00`).toISOString(),
        "Hora editada manualmente desde el calendario admin.",
      )
      setSaveMessage("Hora de reserva actualizada.")
      await loadDashboard(dateKey, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo actualizar la hora.")
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
      const token = await createDiscountToken()
      setSaveMessage(`Token creado correctamente: ${token.code}`)
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

  const handlePedidosYaUpload = async (file: File | undefined) => {
    if (!file || !pedidosYaPromo) return

    try {
      const imagePath = await uploadAdminImage("novedades", file)
      await updatePedidosYaPromo(pedidosYaPromo.id, { imagePath })
      setSaveMessage("Imagen de PedidosYa subida.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo subir la imagen.")
    }
  }

  const handlePaymentQrUpload = async (qr: AdminPaymentQr, file: File | undefined) => {
    if (!file) return

    try {
      const imagePath = await uploadAdminImage("qr", file)
      setPaymentQrs((current) =>
        current.map((item) => (item.id === qr.id ? { ...item, imagePath } : item)),
      )
      setSaveMessage("Imagen QR subida. Ingresa la clave y guarda para activar el cambio.")
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo subir el QR.")
    }
  }

  const handlePaymentQrSave = async (qr: AdminPaymentQr) => {
    try {
      await updatePaymentQrProtected(qr, qrSecret)
      setQrSecret("")
      setSaveMessage("QR de pago actualizado y registrado en historial.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo actualizar el QR.")
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

  const bookingsByDateKey = calendarBookings.reduce<Record<string, AdminBooking[]>>((groups, booking) => {
    const key = formatDateKey(new Date(booking.startsAt))
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(booking)
    return groups
  }, {})
  const weekDays = getWeekDays(selectedDate)
  const monthDays = getMonthDays(selectedDate)
  const selectedMonth = new Date(`${selectedDate}T00:00:00`).getMonth()

  const bookingsForDateHour = (dateKey: string, hour: number) =>
    (bookingsByDateKey[dateKey] || []).filter((booking) => new Date(booking.startsAt).getHours() === hour)

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

  const downloadProof = async (booking: AdminBooking) => {
    if (!booking.paymentReceiptPath) return

    try {
      const response = await fetch(booking.paymentReceiptPath)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = booking.paymentReceiptOriginalName || `${booking.reservationCode}-comprobante`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      setSaveMessage("No se pudo descargar el comprobante.")
    }
  }

  const editingPricing = editorModal?.type === "pricing" ? pricingRules.find((item) => item.id === editorModal.id) : null
  const editingToken = editorModal?.type === "discount" ? discountTokens.find((item) => item.id === editorModal.id) : null
  const editingHero = editorModal?.type === "hero" ? heroSlides.find((item) => item.id === editorModal.id) : null
  const editingNovelty = editorModal?.type === "novelty" ? noveltyItems.find((item) => item.id === editorModal.id) : null
  const editingPedidosYa = editorModal?.type === "pedidosya" ? pedidosYaPromo : null
  const editingPaymentQr = editorModal?.type === "paymentQr" ? paymentQrs.find((item) => item.id === editorModal.id) : null

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
              <button type="button" className="btn-edit" onClick={requestBrowserNotifications}>
                {browserNotificationsEnabled ? "Navegador activo" : "Activar navegador"}
              </button>
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
              <div className="admin-view-toggle" aria-label="Cambiar vista de reservas">
                <button
                  type="button"
                  className={reservationViewMode === "grid" ? "is-active" : ""}
                  onClick={() => setReservationViewMode("grid")}
                >
                  <FaThLarge />
                  Mosaico
                </button>
                <button
                  type="button"
                  className={reservationViewMode === "list" ? "is-active" : ""}
                  onClick={() => setReservationViewMode("list")}
                >
                  <FaList />
                  Lista
                </button>
              </div>
            </div>

            <div className={`admin-reservation-grid admin-reservation-grid--${reservationViewMode}`}>
              {bookings.map((booking) => (
                <article
                  key={booking.id}
                  className="admin-reservation-card"
                >
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
                  <p>Carnet: {booking.nationalId || "Sin carnet"}</p>
                  <p>Subtotal: Bs {(booking.totalAmount + booking.discountAmount).toFixed(2)}</p>
                  <div className="admin-discount-line">
                    <span>{booking.discountCode || "Sin codigo aplicado"}</span>
                    <strong>- Bs {booking.discountAmount.toFixed(2)}</strong>
                  </div>
                  <p>Total pagado: Bs {booking.totalAmount.toFixed(2)}</p>
                  <p>WhatsApp: {booking.phone}</p>
                  <p>Referencia: {booking.paymentReference || "Sin referencia"}</p>

                  {booking.paymentReceiptPath && !booking.proofDeletedAt ? (
                    <div className="admin-proof-actions">
                      <a
                        className="admin-proof-link"
                        href={booking.paymentReceiptPath}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ver comprobante
                      </a>
                      <button
                        type="button"
                        className="admin-proof-link admin-proof-link--download"
                        onClick={() => downloadProof(booking)}
                      >
                        <FaDownload />
                        Descargar
                      </button>
                    </div>
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
                <h2>Agenda de reservas</h2>
                <p className="admin-template-help">
                  Mostrando todas las reservas. El filtro de fecha solo enfoca la vista, no limita el calendario.
                </p>
              </div>
              <div className="admin-view-toggle">
                {(["day", "week", "month"] as CalendarViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={calendarViewMode === mode ? "is-active" : ""}
                    onClick={() => setCalendarViewMode(mode)}
                  >
                    {mode === "day" ? "Dia" : mode === "week" ? "Semana" : "Mes"}
                  </button>
                ))}
              </div>
            </div>

            <div className={`admin-google-calendar admin-google-calendar--${calendarViewMode}`}>
              {calendarViewMode === "day" ? (
                <div className="admin-day-calendar">
                  {calendarHours.map((hour) => {
                    const slotBookings = bookingsForDateHour(selectedDate, hour)
                    return (
                      <div
                        key={hour}
                        className={`admin-hour-row${slotBookings.length >= 3 ? " is-full" : ""}`}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => handleBookingDrop(selectedDate, hour)}
                      >
                        <span className="admin-hour-label">{`${hour}:00`}</span>
                        <div className="admin-hour-dropzone">
                          {slotBookings.length === 0 ? <span>Disponible</span> : null}
                          {slotBookings.map((booking) => (
                            <div
                              key={booking.id}
                              className={`calendar-booking calendar-booking--${booking.status}`}
                              draggable
                              onDragStart={() => setDraggedBookingId(booking.id)}
                              onDragEnd={() => setDraggedBookingId(null)}
                            >
                              <strong>{booking.fullName}</strong>
                              <span>
                                {formatReservationTime(booking.startsAt)} | {booking.partySize} persona(s)
                              </span>
                              <input
                                type="time"
                                value={new Date(booking.startsAt).toTimeString().slice(0, 5)}
                                onPointerDown={(event) => event.stopPropagation()}
                                onClick={(event) => event.stopPropagation()}
                                onChange={(event) => handleBookingTimeEdit(booking, event.target.value)}
                                aria-label={`Editar hora de ${booking.fullName}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : null}

              {calendarViewMode === "week" ? (
                <div className="admin-week-calendar">
                  {weekDays.map((day) => {
                    const dateKey = formatDateKey(day)
                    return (
                      <div key={dateKey} className="admin-week-day">
                        <strong>{day.toLocaleDateString("es-BO", { weekday: "short", day: "2-digit" })}</strong>
                        {calendarHours.map((hour) => {
                          const slotBookings = bookingsForDateHour(dateKey, hour)
                          return (
                            <div
                              key={`${dateKey}-${hour}`}
                              className="admin-week-slot"
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => handleBookingDrop(dateKey, hour)}
                            >
                              <span>{`${hour}:00`}</span>
                              {slotBookings.map((booking) => (
                                <button
                                  key={booking.id}
                                  type="button"
                                  className={`calendar-booking calendar-booking--${booking.status}`}
                                  draggable
                                  onDragStart={() => setDraggedBookingId(booking.id)}
                                  onDragEnd={() => setDraggedBookingId(null)}
                                >
                                  {booking.fullName}
                                </button>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              ) : null}

              {calendarViewMode === "month" ? (
                <div className="admin-month-calendar">
                  {monthDays.map((day) => {
                    const dateKey = formatDateKey(day)
                    const dayBookings = bookingsByDateKey[dateKey] || []
                    const visibleBookings = expandedMonthDay === dateKey ? dayBookings : dayBookings.slice(0, 3)
                    return (
                      <div
                        key={dateKey}
                        className={`admin-month-day${day.getMonth() !== selectedMonth ? " is-muted" : ""}`}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => handleBookingDateDrop(dateKey)}
                      >
                        <strong>{day.getDate()}</strong>
                        {visibleBookings.map((booking) => (
                          <span
                            key={booking.id}
                            className={`calendar-booking calendar-booking--${booking.status}`}
                            draggable
                            onDragStart={() => setDraggedBookingId(booking.id)}
                            onDragEnd={() => setDraggedBookingId(null)}
                          >
                            {formatReservationTime(booking.startsAt)} {booking.fullName}
                          </span>
                        ))}
                        {dayBookings.length > 3 ? (
                          <button
                            type="button"
                            className="admin-month-more"
                            onClick={() => setExpandedMonthDay((current) => (current === dateKey ? null : dateKey))}
                          >
                            {expandedMonthDay === dateKey ? "Ver menos" : `+${dayBookings.length - 3} mas`}
                          </button>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {!loading && activeSection === "pricing" ? (
          <section className="admin-content">
            <div className="admin-section-heading">
              <div>
                <span className="admin-kicker">Precios</span>
                <h2>Precios de reservas</h2>
              </div>
              <div className="admin-inline-actions">
                <div className="admin-view-toggle">
                  <button type="button" className={pricingViewMode === "grid" ? "is-active" : ""} onClick={() => setPricingViewMode("grid")}>
                    <FaThLarge /> Mosaico
                  </button>
                  <button type="button" className={pricingViewMode === "list" ? "is-active" : ""} onClick={() => setPricingViewMode("list")}>
                    <FaList /> Lista
                  </button>
                </div>
                <button type="button" className="btn-approve" onClick={handlePricingCreate}>
                  <FaPlus />
                  <span>Nuevo precio</span>
                </button>
              </div>
            </div>

            <div className={`admin-preview-grid admin-preview-grid--${pricingViewMode}`}>
              {pricingRules.map((rule) => (
                <article key={rule.id} className="admin-preview-tile">
                  <span className={`status-pill status-pill--${rule.isActive ? "confirmed" : "cancelled"}`}>
                    {rule.isActive ? "Activo" : "Inactivo"}
                  </span>
                  <strong>{rule.label}</strong>
                  <p>{rule.durationMinutes} min | {rule.personCount} persona(s)</p>
                  <h3>Bs {rule.price.toFixed(2)}</h3>
                  <div className="admin-inline-actions">
                    <button type="button" className="btn-edit" onClick={() => setEditorModal({ type: "pricing", id: rule.id })}>
                      <FaEdit />
                      <span>Editar</span>
                    </button>
                    <button type="button" className="btn-reject" onClick={() => handlePricingDelete(rule.id)}>
                      <FaTrash />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>

          </section>
        ) : null}

        {!loading && activeSection === "discounts" ? (
          <section className="admin-content">
            <div className="admin-section-heading">
              <div>
                <span className="admin-kicker">Descuentos</span>
                <h2>Tokens de un solo uso</h2>
              </div>
              <div className="admin-inline-actions">
                <div className="admin-view-toggle">
                  <button type="button" className={tokenViewMode === "grid" ? "is-active" : ""} onClick={() => setTokenViewMode("grid")}>
                    <FaThLarge /> Mosaico
                  </button>
                  <button type="button" className={tokenViewMode === "list" ? "is-active" : ""} onClick={() => setTokenViewMode("list")}>
                    <FaList /> Lista
                  </button>
                </div>
                <button type="button" className="btn-approve" onClick={handleDiscountCreate}>
                  <FaPlus />
                  <span>Generar token</span>
                </button>
              </div>
            </div>

            <div className={`admin-preview-grid admin-preview-grid--${tokenViewMode}`}>
              {discountTokens.map((token) => (
                <article key={token.id} className="admin-preview-tile admin-preview-tile--token">
                  <span className={`status-pill status-pill--${token.isActive ? "confirmed" : "cancelled"}`}>
                    {token.usedCount}/{token.maxUses} usos
                  </span>
                  <strong>{token.code}</strong>
                  <p>{token.label}</p>
                  <h3>{token.discountType === "percent" ? `${token.discountValue}%` : `Bs ${token.discountValue}`}</h3>
                  <div className="admin-inline-actions">
                    <button type="button" className="btn-edit" onClick={() => setEditorModal({ type: "discount", id: token.id })}>
                      <FaEdit />
                      <span>Editar</span>
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
        ) : null}

        {!loading && activeSection === "paymentQr" ? (
          <section className="admin-content">
            <div className="admin-section-heading">
              <div>
                <span className="admin-kicker">Pago</span>
                <h2>QR de reservas</h2>
                <p className="admin-template-help">
                  Para cambiar el QR debes ingresar la clave de proteccion. Cada cambio guarda historial con fecha.
                </p>
              </div>
            </div>

            <div className="admin-preview-grid">
              {paymentQrs.map((qr) => (
                <article key={qr.id} className="admin-preview-tile admin-preview-tile--image">
                  <div className="admin-preview-card admin-preview-card--qr">
                    <img src={qr.imagePath} alt={qr.label} />
                    <div>
                      <span>{qr.isActive ? "Activo" : "Inactivo"}</span>
                      <strong>{qr.label}</strong>
                    </div>
                  </div>
                  <p>Actualizado: {new Date(qr.updatedAt).toLocaleString("es-BO")}</p>
                  <button type="button" className="btn-edit" onClick={() => setEditorModal({ type: "paymentQr", id: qr.id })}>
                    <FaEdit />
                    Editar QR
                  </button>
                </article>
              ))}
            </div>

            <section className="admin-panel-card">
              <div className="admin-section-heading">
                <div>
                  <span className="admin-kicker">Historial</span>
                  <h2>Cambios anteriores</h2>
                </div>
              </div>
              <div className="admin-preview-grid admin-preview-grid--list">
                {paymentQrHistory.length === 0 ? <p>No hay cambios registrados todavia.</p> : null}
                {paymentQrHistory.map((qr) => (
                  <article key={qr.id} className="admin-preview-tile admin-preview-tile--image">
                    <div className="admin-preview-card admin-preview-card--qr">
                      <img src={qr.imagePath} alt={qr.label} />
                      <div>
                        <span>{new Date(qr.changedAt).toLocaleString("es-BO")}</span>
                        <strong>{qr.label}</strong>
                      </div>
                    </div>
                    <p>{qr.instructions || "Sin instrucciones"}</p>
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
              <div className="admin-inline-actions">
                <div className="admin-view-toggle">
                  <button type="button" className={landingViewMode === "grid" ? "is-active" : ""} onClick={() => setLandingViewMode("grid")}>
                    <FaThLarge /> Mosaico
                  </button>
                  <button type="button" className={landingViewMode === "list" ? "is-active" : ""} onClick={() => setLandingViewMode("list")}>
                    <FaList /> Lista
                  </button>
                </div>
                <button type="button" className="btn-approve" onClick={handleHeroCreate}>
                  <FaPlus />
                  <span>Nuevo slide</span>
                </button>
              </div>
            </div>

            <section className="admin-panel-card">
              <div className={`admin-preview-grid admin-preview-grid--${landingViewMode}`}>
                {heroSlides.map((slide) => (
                  <article
                    key={slide.id}
                    className="admin-preview-tile admin-preview-tile--image admin-editor-card--draggable"
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
                    <div className="admin-inline-actions">
                      <button type="button" className="btn-edit" onClick={() => setEditorModal({ type: "hero", id: slide.id })}>
                        <FaEdit />
                        <span>Editar</span>
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
              <div className="admin-inline-actions">
                <div className="admin-view-toggle">
                  <button type="button" className={noveltyViewMode === "grid" ? "is-active" : ""} onClick={() => setNoveltyViewMode("grid")}>
                    <FaThLarge /> Mosaico
                  </button>
                  <button type="button" className={noveltyViewMode === "list" ? "is-active" : ""} onClick={() => setNoveltyViewMode("list")}>
                    <FaList /> Lista
                  </button>
                </div>
                <button type="button" className="btn-approve" onClick={handleNoveltyCreate}>
                  <FaPlus />
                  <span>Nueva novedad</span>
                </button>
              </div>
            </div>

            <section className="admin-panel-card">
              <div className={`admin-preview-grid admin-preview-grid--${noveltyViewMode}`}>
                {noveltyItems.map((item) => (
                  <article
                    key={item.id}
                    className="admin-preview-tile admin-preview-tile--image admin-editor-card--draggable"
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
                    <div className="admin-inline-actions">
                      <button type="button" className="btn-edit" onClick={() => setEditorModal({ type: "novelty", id: item.id })}>
                        <FaEdit />
                        <span>Editar</span>
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
                <div className="admin-preview-grid admin-preview-grid--list">
                  <article className="admin-preview-tile admin-preview-tile--image">
                    <div className="admin-preview-card">
                      <img src={pedidosYaPromo.imagePath} alt={pedidosYaPromo.title} />
                      <div>
                        <span>{pedidosYaPromo.isActive ? "Activo" : "Inactivo"}</span>
                        <strong>{pedidosYaPromo.title}</strong>
                      </div>
                    </div>
                    <p>{pedidosYaPromo.description}</p>
                    <div className="admin-inline-actions">
                      <button type="button" className="btn-edit" onClick={() => setEditorModal({ type: "pedidosya", id: pedidosYaPromo.id })}>
                        <FaEdit />
                        <span>Editar bloque</span>
                      </button>
                    </div>
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

        {editorModal ? (
          <div className="admin-modal" role="dialog" aria-modal="true">
            <div className="admin-modal-card">
              <div className="admin-modal-head">
                <div>
                  <span className="admin-kicker">Editar</span>
                  <h2>
                    {editorModal.type === "pricing" ? "Precio" : null}
                    {editorModal.type === "discount" ? "Token" : null}
                    {editorModal.type === "hero" ? "Slide" : null}
                    {editorModal.type === "novelty" ? "Novedad" : null}
                    {editorModal.type === "pedidosya" ? "PedidosYa" : null}
                  </h2>
                </div>
                <button type="button" className="admin-modal-close" onClick={() => setEditorModal(null)}>
                  <FaTimes />
                </button>
              </div>

              {editingPricing ? (
                <div className="admin-modal-form">
                  <label>Etiqueta<input value={editingPricing.label} onChange={(event) => setPricingRules((current) => current.map((item) => item.id === editingPricing.id ? { ...item, label: event.target.value } : item))} /></label>
                  <div className="admin-mini-grid">
                    <label>Duracion<input type="number" value={editingPricing.durationMinutes} onChange={(event) => setPricingRules((current) => current.map((item) => item.id === editingPricing.id ? { ...item, durationMinutes: Number(event.target.value) } : item))} /></label>
                    <label>Personas<input type="number" value={editingPricing.personCount} onChange={(event) => setPricingRules((current) => current.map((item) => item.id === editingPricing.id ? { ...item, personCount: Number(event.target.value) } : item))} /></label>
                    <label>Precio Bs<input type="number" step="0.5" value={editingPricing.price} onChange={(event) => setPricingRules((current) => current.map((item) => item.id === editingPricing.id ? { ...item, price: Number(event.target.value) } : item))} /></label>
                  </div>
                  <label>Orden<input type="number" value={editingPricing.sortOrder} onChange={(event) => setPricingRules((current) => current.map((item) => item.id === editingPricing.id ? { ...item, sortOrder: Number(event.target.value) } : item))} /></label>
                  <label className="admin-switch"><input type="checkbox" checked={editingPricing.isActive} onChange={(event) => setPricingRules((current) => current.map((item) => item.id === editingPricing.id ? { ...item, isActive: event.target.checked } : item))} />Activo</label>
                  <button type="button" className="btn-edit" onClick={() => { handlePricingSave(editingPricing); setEditorModal(null) }}><FaSave />Guardar precio</button>
                </div>
              ) : null}

              {editingToken ? (
                <div className="admin-modal-form">
                  <label>Codigo<input value={editingToken.code} onChange={(event) => setDiscountTokens((current) => current.map((item) => item.id === editingToken.id ? { ...item, code: event.target.value.toUpperCase() } : item))} /></label>
                  <label>Nombre interno<input value={editingToken.label} onChange={(event) => setDiscountTokens((current) => current.map((item) => item.id === editingToken.id ? { ...item, label: event.target.value } : item))} /></label>
                  <div className="admin-mini-grid">
                    <label>Tipo<select value={editingToken.discountType} onChange={(event) => setDiscountTokens((current) => current.map((item) => item.id === editingToken.id ? { ...item, discountType: event.target.value as AdminDiscountToken["discountType"] } : item))}><option value="percent">Porcentaje</option><option value="fixed">Monto fijo</option></select></label>
                    <label>Valor<input type="number" step="0.5" value={editingToken.discountValue} onChange={(event) => setDiscountTokens((current) => current.map((item) => item.id === editingToken.id ? { ...item, discountValue: Number(event.target.value) } : item))} /></label>
                    <label>Usos<input type="number" min="1" value={editingToken.maxUses} onChange={(event) => setDiscountTokens((current) => current.map((item) => item.id === editingToken.id ? { ...item, maxUses: Number(event.target.value) } : item))} /></label>
                  </div>
                  <label>Expira<input type="datetime-local" value={editingToken.expiresAt ? editingToken.expiresAt.slice(0, 16) : ""} onChange={(event) => setDiscountTokens((current) => current.map((item) => item.id === editingToken.id ? { ...item, expiresAt: event.target.value || null } : item))} /></label>
                  <label className="admin-switch"><input type="checkbox" checked={editingToken.isActive} onChange={(event) => setDiscountTokens((current) => current.map((item) => item.id === editingToken.id ? { ...item, isActive: event.target.checked } : item))} />Activo</label>
                  <button type="button" className="btn-edit" onClick={() => { handleDiscountSave(editingToken); setEditorModal(null) }}><FaSave />Guardar token</button>
                </div>
              ) : null}

              {editingHero ? (
                <div className="admin-modal-form">
                  <div className="admin-preview-card"><img src={editingHero.imagePath} alt={editingHero.altText} /><div><span>Vista previa</span><strong>{editingHero.altText}</strong></div></div>
                  <label>Subir imagen<input type="file" accept="image/*" onChange={(event) => handleHeroUpload(editingHero, event.target.files?.[0])} /></label>
                  <label>Alt<input value={editingHero.altText} onChange={(event) => setHeroSlides((current) => current.map((item) => item.id === editingHero.id ? { ...item, altText: event.target.value } : item))} /></label>
                  <label className="admin-switch"><input type="checkbox" checked={editingHero.isActive} onChange={(event) => setHeroSlides((current) => current.map((item) => item.id === editingHero.id ? { ...item, isActive: event.target.checked } : item))} />Activo</label>
                  <button type="button" className="btn-edit" onClick={() => { handleHeroSave(editingHero); setEditorModal(null) }}><FaSave />Guardar slide</button>
                </div>
              ) : null}

              {editingNovelty ? (
                <div className="admin-modal-form">
                  <div className="admin-preview-card"><img src={editingNovelty.imagePath} alt={editingNovelty.title} /><div><span>{editingNovelty.badge}</span><strong>{editingNovelty.title}</strong></div></div>
                  <label>Titulo<input value={editingNovelty.title} onChange={(event) => setNoveltyItems((current) => current.map((item) => item.id === editingNovelty.id ? { ...item, title: event.target.value } : item))} /></label>
                  <label>Descripcion<textarea value={editingNovelty.description} onChange={(event) => setNoveltyItems((current) => current.map((item) => item.id === editingNovelty.id ? { ...item, description: event.target.value } : item))} /></label>
                  <label>Imagen<input type="file" accept="image/*" onChange={(event) => handleNoveltyUpload(editingNovelty, event.target.files?.[0])} /></label>
                  <div className="admin-mini-grid">
                    <label>Badge<input value={editingNovelty.badge} onChange={(event) => setNoveltyItems((current) => current.map((item) => item.id === editingNovelty.id ? { ...item, badge: event.target.value } : item))} /></label>
                    <label>Precio<input type="number" step="0.5" value={editingNovelty.price ?? ""} onChange={(event) => setNoveltyItems((current) => current.map((item) => item.id === editingNovelty.id ? { ...item, price: event.target.value ? Number(event.target.value) : null } : item))} /></label>
                  </div>
                  <label className="admin-switch"><input type="checkbox" checked={editingNovelty.isActive} onChange={(event) => setNoveltyItems((current) => current.map((item) => item.id === editingNovelty.id ? { ...item, isActive: event.target.checked } : item))} />Activa</label>
                  <button type="button" className="btn-edit" onClick={() => { handleNoveltySave(editingNovelty); setEditorModal(null) }}><FaSave />Guardar novedad</button>
                </div>
              ) : null}

              {editingPedidosYa ? (
                <div className="admin-modal-form">
                  <div className="admin-preview-card"><img src={editingPedidosYa.imagePath} alt={editingPedidosYa.title} /><div><span>PedidosYa</span><strong>{editingPedidosYa.title}</strong></div></div>
                  <label>Titulo<input value={editingPedidosYa.title} onChange={(event) => setPedidosYaPromo((current) => current ? { ...current, title: event.target.value } : current)} /></label>
                  <label>Descripcion<textarea value={editingPedidosYa.description} onChange={(event) => setPedidosYaPromo((current) => current ? { ...current, description: event.target.value } : current)} /></label>
                  <label>Subir imagen<input type="file" accept="image/*" onChange={(event) => handlePedidosYaUpload(event.target.files?.[0])} /></label>
                  <label>CTA label<input value={editingPedidosYa.ctaLabel} onChange={(event) => setPedidosYaPromo((current) => current ? { ...current, ctaLabel: event.target.value } : current)} /></label>
                  <label>CTA URL<input value={editingPedidosYa.ctaUrl} onChange={(event) => setPedidosYaPromo((current) => current ? { ...current, ctaUrl: event.target.value } : current)} /></label>
                  <label>Puntos<textarea value={editingPedidosYa.points.join("\n")} onChange={(event) => setPedidosYaPromo((current) => current ? { ...current, points: event.target.value.split("\n").map((value) => value.trim()).filter(Boolean) } : current)} /></label>
                  <label className="admin-switch"><input type="checkbox" checked={editingPedidosYa.isActive} onChange={(event) => setPedidosYaPromo((current) => current ? { ...current, isActive: event.target.checked } : current)} />Activo</label>
                  <button type="button" className="btn-edit" onClick={() => { handlePedidosYaSave(); setEditorModal(null) }}><FaSave />Guardar bloque</button>
                </div>
              ) : null}

              {editingPaymentQr ? (
                <div className="admin-modal-form">
                  <div className="admin-preview-card admin-preview-card--qr">
                    <img src={editingPaymentQr.imagePath} alt={editingPaymentQr.label} />
                    <div><span>QR activo</span><strong>{editingPaymentQr.label}</strong></div>
                  </div>
                  <label>Nombre<input value={editingPaymentQr.label} onChange={(event) => setPaymentQrs((current) => current.map((item) => item.id === editingPaymentQr.id ? { ...item, label: event.target.value } : item))} /></label>
                  <label>Subir nuevo QR<input type="file" accept="image/*" onChange={(event) => handlePaymentQrUpload(editingPaymentQr, event.target.files?.[0])} /></label>
                  <label>Instrucciones<textarea value={editingPaymentQr.instructions || ""} onChange={(event) => setPaymentQrs((current) => current.map((item) => item.id === editingPaymentQr.id ? { ...item, instructions: event.target.value } : item))} /></label>
                  <label className="admin-switch"><input type="checkbox" checked={editingPaymentQr.isActive} onChange={(event) => setPaymentQrs((current) => current.map((item) => item.id === editingPaymentQr.id ? { ...item, isActive: event.target.checked } : item))} />Activo</label>
                  <label>Clave para cambiar QR<input type="password" value={qrSecret} onChange={(event) => setQrSecret(event.target.value)} placeholder="Clave obligatoria" /></label>
                  <button type="button" className="btn-edit" onClick={() => { handlePaymentQrSave(editingPaymentQr); setEditorModal(null) }}><FaSave />Guardar QR protegido</button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  )
}
