import { useEffect, useRef, useState } from "react"
import {
  FaBars,
  FaBell,
  FaCalendarAlt,
  FaBoxes,
  FaCashRegister,
  FaClipboardList,
  FaDownload,
  FaEdit,
  FaHome,
  FaList,
  FaPlus,
  FaPercent,
  FaQrcode,
  FaSave,
  FaShieldAlt,
  FaSignOutAlt,
  FaTags,
  FaThLarge,
  FaTimes,
  FaTrash,
  FaUsers,
  FaWhatsapp,
} from "react-icons/fa"
import { useNavigate } from "react-router-dom"
import InventoryPanel from "../components/InventoryPanel"
import CashRegisterPanel from "../components/CashRegisterPanel"
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
  fetchAdminProductCategories,
  fetchAdminProducts,
  fetchAdminRestaurantTables,
  fetchAdminLiveOrders,
  fetchAdminPricingRules,
  fetchSuperAdminOverview,
  cleanupOldOrderReceipts,
  createDiscountToken,
  createHeroSlide,
  createNoveltyItem,
  createProduct,
  createProductCategory,
  createProductOption,
  createProductOptionGroup,
  createProductVariant,
  createPricingRule,
  createRestaurantTable,
  deleteDiscountToken,
  deleteHeroSlide,
  deleteNoveltyItem,
  deleteProduct,
  deleteProductCategory,
  deleteProductOption,
  deleteProductOptionGroup,
  deleteProductVariant,
  deletePricingRule,
  deleteRestaurantTable,
  deleteSuperAdminEntity,
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
  updateProduct,
  updateProductCategory,
  updateProductOption,
  updateProductOptionGroup,
  updateProductVariant,
  updatePricingRule,
  updateLiveOrderStatus,
  updateRestaurantTable,
  runSuperAdminBulkAction,
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
  type AdminProduct,
  type AdminProductCategory,
  type AdminProductOption,
  type AdminProductOptionGroup,
  type AdminProductVariant,
  type AdminPricingRule,
  type AdminLiveOrder,
  type AdminOrderStatus,
  type AdminPaymentStatus,
  type AdminRestaurantTable,
  type SuperAdminBulkAction,
  type SuperAdminEntityType,
  type SuperAdminOverview,
} from "../lib/adminDashboardService"
import { getCurrentAdminProfile, type CurrentAdminProfile } from "../lib/adminAuth"
import { resolveCatalogImage } from "../lib/contentService"
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
type ReservationDateScope = "day" | "upcoming" | "all"
type CalendarViewMode = "day" | "week" | "month"
type AdminViewMode = "grid" | "list"
type OrderBoardMode = "active" | "delivered"
type ProductStatusFilter = "all" | "active" | "inactive"
type SuperAdminConfirmAction =
  | {
      kind: "bulk"
      action: SuperAdminBulkAction
      title: string
      description: string
      confirmation: string
    }
  | {
      kind: "entity"
      entityType: SuperAdminEntityType
      entityId: string
      title: string
      description: string
      confirmation?: string
    }

type AdminEditorModal =
  | { type: "pricing"; id: string }
  | { type: "discount"; id: string }
  | { type: "hero"; id: string }
  | { type: "novelty"; id: string }
  | { type: "pedidosya"; id: string }
  | { type: "paymentQr"; id: string }
  | { type: "productCategory"; id: string }
  | { type: "product"; id: string }
  | { type: "table"; id: string }
  | null

type ProductCategoryDraft = Omit<AdminProductCategory, "id" | "createdAt" | "slug"> & {
  id: string
  slug: string
  createdAt: string
}

type ProductDraft = Omit<AdminProduct, "id" | "createdAt" | "slug"> & {
  id: string
  slug: string
  createdAt: string
}

type AdminSection =
  | "overview"
  | "reservations"
  | "calendar"
  | "pricing"
  | "discounts"
  | "paymentQr"
  | "products"
  | "tables"
  | "orders"
  | "cash"
  | "inventory"
  | "landing"
  | "novelties"
  | "messages"
  | "contacts"
  | "superAdmin"

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
  { id: "products", label: "Productos", icon: FaClipboardList },
  { id: "tables", label: "Mesas", icon: FaQrcode },
  { id: "orders", label: "Pedidos en vivo", icon: FaBell },
  { id: "cash", label: "Caja", icon: FaCashRegister },
  { id: "inventory", label: "Inventario", icon: FaBoxes },
  { id: "landing", label: "Landing", icon: FaHome },
  { id: "novelties", label: "Novedades", icon: FaTags },
  { id: "messages", label: "Mensajes", icon: FaWhatsapp },
  { id: "contacts", label: "Contactos", icon: FaUsers },
  { id: "superAdmin", label: "Super Admin", icon: FaShieldAlt },
]

const formatDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

const today = formatDateKey(new Date())
const qrExpiryAlertDays = 7
const defaultPaymentQrForm = {
  label: "QR de pago Eureka",
  instructions: "Escanea este QR para realizar el pago.",
  expiresAt: "",
}
const allowedQrImageTypes = ["image/png", "image/jpeg", "image/webp"]
const allowedCatalogImageTypes = ["image/png", "image/jpeg", "image/webp"]
const orderStatusLabels: Record<AdminOrderStatus, string> = {
  new: "Nuevo",
  pending_review: "Revision",
  accepted: "Aceptado",
  preparing: "Preparando",
  ready: "Listo",
  delivered: "Entregado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
}

const paymentStatusLabels: Record<AdminPaymentStatus, string> = {
  pending: "QR pendiente",
  paid: "Pagado",
  rejected: "Pago rechazado",
  cash_pending: "Caja pendiente",
}

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

const getQrExpiryStatus = (expiresAt: string | null) => {
  if (!expiresAt) {
    return {
      label: "Sin vencimiento",
      tone: "neutral",
      daysLeft: null,
    }
  }

  const expiresTime = new Date(expiresAt).getTime()
  const diffDays = Math.ceil((expiresTime - Date.now()) / 86400000)

  if (diffDays < 0) {
    return {
      label: "Vencido",
      tone: "danger",
      daysLeft: diffDays,
    }
  }

  if (diffDays <= qrExpiryAlertDays) {
    return {
      label: `Vence en ${diffDays} dia${diffDays === 1 ? "" : "s"}`,
      tone: "warning",
      daysLeft: diffDays,
    }
  }

  return {
    label: `Vence el ${new Date(expiresAt).toLocaleDateString("es-BO")}`,
    tone: "ok",
    daysLeft: diffDays,
  }
}

const getElapsedMinutes = (start: string, end?: string | null) =>
  Math.max(0, Math.floor(((end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime()) / 60000))

const getOrderTimeTone = (order: AdminLiveOrder) => {
  const minutes = getElapsedMinutes(order.createdAt, order.deliveredAt || order.rejectedAt)
  if (minutes > 30) return "danger"
  if (minutes > 15) return "warning"
  return "ok"
}

const formatElapsedTime = (order: AdminLiveOrder) => {
  const minutes = getElapsedMinutes(order.createdAt, order.deliveredAt || order.rejectedAt)
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
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

const addMonths = (date: Date, months: number) => {
  const copy = new Date(date)
  copy.setMonth(copy.getMonth() + months)
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
  paid: "Pagada",
  in_game: "En juego",
  completed: "Finalizada",
  no_show: "No asistio",
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
  const [productCategories, setProductCategories] = useState<AdminProductCategory[]>([])
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [restaurantTables, setRestaurantTables] = useState<AdminRestaurantTable[]>([])
  const [liveOrders, setLiveOrders] = useState<AdminLiveOrder[]>([])
  const [messageTemplates, setMessageTemplates] = useState<AdminMessageTemplate[]>([])
  const [adminProfile, setAdminProfile] = useState<CurrentAdminProfile | null>(null)
  const [superAdminOverview, setSuperAdminOverview] = useState<SuperAdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [reservationViewMode, setReservationViewMode] = useState<ReservationViewMode>("grid")
  const [reservationDateScope, setReservationDateScope] = useState<ReservationDateScope>("day")
  const [reservationReturnDate, setReservationReturnDate] = useState<string | null>(null)
  const [showFuturePreview, setShowFuturePreview] = useState(false)
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>("day")
  const [orderBoardMode, setOrderBoardMode] = useState<OrderBoardMode>("active")
  const [pricingViewMode, setPricingViewMode] = useState<AdminViewMode>("grid")
  const [tokenViewMode, setTokenViewMode] = useState<AdminViewMode>("grid")
  const [landingViewMode, setLandingViewMode] = useState<AdminViewMode>("grid")
  const [noveltyViewMode, setNoveltyViewMode] = useState<AdminViewMode>("grid")
  const [productViewMode, setProductViewMode] = useState<AdminViewMode>("grid")
  const [productSearch, setProductSearch] = useState("")
  const [selectedProductCategoryId, setSelectedProductCategoryId] = useState("all")
  const [productStatusFilter, setProductStatusFilter] = useState<ProductStatusFilter>("all")
  const [orderSoundEnabled, setOrderSoundEnabled] = useState(false)
  const [clockTick, setClockTick] = useState(0)
  const [editorModal, setEditorModal] = useState<AdminEditorModal>(null)
  const [draftProductCategory, setDraftProductCategory] = useState<ProductCategoryDraft | null>(null)
  const [draftProduct, setDraftProduct] = useState<ProductDraft | null>(null)
  const [superAdminConfirmAction, setSuperAdminConfirmAction] = useState<SuperAdminConfirmAction | null>(null)
  const [superAdminConfirmation, setSuperAdminConfirmation] = useState("")
  const [superAdminWorking, setSuperAdminWorking] = useState(false)
  const [qrSecret, setQrSecret] = useState("")
  const [pendingPaymentQrFiles, setPendingPaymentQrFiles] = useState<Record<string, File>>({})
  const [newPaymentQrFile, setNewPaymentQrFile] = useState<File | null>(null)
  const [newPaymentQrPreviewUrl, setNewPaymentQrPreviewUrl] = useState("")
  const [newPaymentQrForm, setNewPaymentQrForm] = useState(defaultPaymentQrForm)
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
  const dirtyBookingNoteIdsRef = useRef<Set<string>>(new Set())

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
      const nextAdminProfile = await getCurrentAdminProfile()
      setAdminProfile(nextAdminProfile)

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
        nextProductCategories,
        nextProducts,
        nextRestaurantTables,
        nextLiveOrders,
        nextMessageTemplates,
        nextSuperAdminOverview,
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
        fetchAdminProductCategories(),
        fetchAdminProducts(),
        fetchAdminRestaurantTables(),
        fetchAdminLiveOrders(),
        fetchMessageTemplates(),
        nextAdminProfile?.role === "super_admin" ? fetchSuperAdminOverview() : Promise.resolve(null),
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
      setProductCategories(nextProductCategories)
      setProducts(nextProducts)
      setRestaurantTables(nextRestaurantTables)
      setLiveOrders(nextLiveOrders)
      setMessageTemplates(nextMessageTemplates)
      setSuperAdminOverview(nextSuperAdminOverview)
      setBookingNotes((current) => {
        const nextNotes: Record<string, string> = {}
        ;[...nextCalendarBookings, ...nextBookings].forEach((booking) => {
          nextNotes[booking.id] = dirtyBookingNoteIdsRef.current.has(booking.id)
            ? current[booking.id] || ""
            : booking.adminNotes || booking.rejectionReason || ""
        })
        return nextNotes
      })

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
    if (editorModal || draftProductCategory || draftProduct) {
      return
    }

    const timer = window.setInterval(() => {
      loadDashboard(selectedDate, false).catch((error) => console.error(error))
    }, 15000)

    return () => window.clearInterval(timer)
  }, [draftProduct, draftProductCategory, editorModal, selectedDate])

  useEffect(() => {
    setSidebarOpen(false)
  }, [activeSection])

  useEffect(() => {
    if (activeSection === "superAdmin" && adminProfile?.role !== "super_admin") {
      setActiveSection("overview")
    }
  }, [activeSection, adminProfile?.role])

  useEffect(() => {
    setShowFuturePreview(false)
  }, [selectedDate, activeSection])

  useEffect(() => {
    if (!newPaymentQrFile) {
      setNewPaymentQrPreviewUrl("")
      return
    }

    const previewUrl = URL.createObjectURL(newPaymentQrFile)
    setNewPaymentQrPreviewUrl(previewUrl)

    return () => URL.revokeObjectURL(previewUrl)
  }, [newPaymentQrFile])

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick((current) => current + 1), 60000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    cleanupOldOrderReceipts().catch((error) => console.error(error))
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel("eureka-live-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        () => {
          loadDashboard(selectedDate, false).catch((error) => console.error(error))
          setSaveMessage("Nuevo pedido recibido.")
          if (orderSoundEnabled) {
            playNotificationTone()
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orderSoundEnabled, selectedDate])

  useEffect(() => {
    const channel = supabase
      .channel("eureka-live-bookings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          loadDashboard(selectedDate, false).catch((error) => console.error(error))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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
      dirtyBookingNoteIdsRef.current.delete(bookingId)
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

    if (!allowedQrImageTypes.includes(file.type)) {
      setSaveMessage("Solo se admiten imagenes PNG, JPG, JPEG o WEBP para el QR.")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setSaveMessage("La imagen del QR debe pesar 5 MB o menos.")
      return
    }

    setPendingPaymentQrFiles((current) => ({ ...current, [qr.id]: file }))
    setSaveMessage("QR seleccionado. Ingresa la clave, fecha de vencimiento y guarda para subirlo.")
  }

  const handleNewPaymentQrUpload = (file: File | undefined) => {
    if (!file) return

    if (!allowedQrImageTypes.includes(file.type)) {
      setSaveMessage("Solo se admiten imagenes PNG, JPG, JPEG o WEBP para el QR.")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setSaveMessage("La imagen del QR debe pesar 5 MB o menos.")
      return
    }

    setNewPaymentQrFile(file)
    setSaveMessage("QR seleccionado. Completa la fecha y la clave para activarlo.")
  }

  const handlePaymentQrCreate = async () => {
    try {
      if (!newPaymentQrFile) {
        setSaveMessage("Sube una imagen QR antes de guardar.")
        return
      }

      if (!newPaymentQrForm.expiresAt) {
        setSaveMessage("Elige una fecha de expiracion para el QR.")
        return
      }

      if (!qrSecret.trim()) {
        setSaveMessage("Ingresa la clave para cambiar el QR.")
        return
      }

      const imagePath = await uploadAdminImage("qr", newPaymentQrFile)
      await updatePaymentQrProtected(
        {
          id: activePaymentQr?.id || null,
          label: newPaymentQrForm.label.trim() || "QR de pago Eureka",
          imagePath,
          instructions: newPaymentQrForm.instructions,
          isActive: true,
          expiresAt: new Date(`${newPaymentQrForm.expiresAt}T23:59:59`).toISOString(),
        },
        qrSecret,
      )

      setQrSecret("")
      setNewPaymentQrFile(null)
      setNewPaymentQrForm(defaultPaymentQrForm)
      setSaveMessage("QR de pago creado y activado.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo crear el QR.")
    }
  }

  const handlePaymentQrSave = async (qr: AdminPaymentQr) => {
    try {
      if (!qrSecret.trim()) {
        setSaveMessage("Ingresa la clave para cambiar el QR.")
        return
      }

      if (!qr.expiresAt) {
        setSaveMessage("Elige una fecha de expiracion para el QR.")
        return
      }

      const pendingFile = pendingPaymentQrFiles[qr.id]
      const qrToSave = pendingFile
        ? { ...qr, imagePath: await uploadAdminImage("qr", pendingFile) }
        : qr

      await updatePaymentQrProtected(qrToSave, qrSecret)
      setQrSecret("")
      setPendingPaymentQrFiles((current) => {
        const next = { ...current }
        delete next[qr.id]
        return next
      })
      setSaveMessage("QR de pago actualizado y registrado en historial.")
      setEditorModal(null)
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo actualizar el QR.")
    }
  }

  const validateCatalogImage = (file: File) => {
    if (!allowedCatalogImageTypes.includes(file.type)) {
      throw new Error("Solo se admiten imagenes PNG, JPG, JPEG o WEBP.")
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("La imagen debe pesar 5 MB o menos.")
    }
  }

  const closeCatalogModal = () => {
    setEditorModal(null)
    setDraftProductCategory(null)
    setDraftProduct(null)
  }

  const handleProductCategoryCreate = () => {
    const draftId = `draft-category-${Date.now()}`
    setDraftProductCategory({
      id: draftId,
      name: "",
      slug: "",
      description: "",
      imagePath: null,
      sortOrder: productCategories.length + 1,
      isActive: true,
      createdAt: new Date().toISOString(),
    })
    setEditorModal({ type: "productCategory", id: draftId })
  }

  const patchProductCategoryDraft = (patch: Partial<AdminProductCategory>) => {
    if (draftProductCategory) {
      setDraftProductCategory({ ...draftProductCategory, ...patch })
      return
    }

    if (editingProductCategory) {
      setProductCategories((current) =>
        current.map((item) => (item.id === editingProductCategory.id ? { ...item, ...patch } : item)),
      )
    }
  }

  const handleProductCategorySubmit = async (category: AdminProductCategory) => {
    if (!category.name.trim()) {
      setSaveMessage("El nombre de la categoria es obligatorio.")
      return
    }

    try {
      if (draftProductCategory && category.id === draftProductCategory.id) {
        await createProductCategory({
          name: category.name,
          description: category.description,
          imagePath: category.imagePath,
          sortOrder: category.sortOrder,
          isActive: category.isActive,
        })
        setSaveMessage("Categoria creada.")
      } else {
        await updateProductCategory(category.id, category)
        setSaveMessage("Categoria guardada.")
      }

      closeCatalogModal()
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo guardar la categoria.")
    }
  }

  const handleProductCategorySave = async (category: AdminProductCategory) => {
    await handleProductCategorySubmit(category)
  }

  const handleProductCategoryDelete = async (category: AdminProductCategory) => {
    const productsInCategory = products.filter((product) => product.categoryId === category.id)
    if (
      productsInCategory.length > 0 &&
      !window.confirm("Esta categoria tiene productos. Se desactivara en lugar de eliminarse.")
    ) {
      return
    }

    try {
      if (productsInCategory.length > 0) {
        await updateProductCategory(category.id, { isActive: false })
        setSaveMessage("Categoria desactivada porque tiene productos.")
      } else {
        await deleteProductCategory(category.id)
        setSaveMessage("Categoria eliminada.")
      }
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo eliminar la categoria.")
    }
  }

  const handleProductCategoryUpload = async (_category: AdminProductCategory, file: File | undefined) => {
    if (!file) return

    try {
      validateCatalogImage(file)
      const imagePath = await uploadAdminImage("products", file)
      patchProductCategoryDraft({ imagePath })
      setSaveMessage("Imagen lista para guardar.")
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo subir la imagen.")
    }
  }

  const handleProductCreate = () => {
    const categoryId =
      selectedProductCategoryId !== "all" ? selectedProductCategoryId : productCategories[0]?.id

    if (!categoryId) {
      setSaveMessage("Crea una categoria antes de agregar productos.")
      return
    }

    const draftId = `draft-product-${Date.now()}`
    setDraftProduct({
      id: draftId,
      categoryId,
      name: "",
      slug: "",
      description: "",
      basePrice: 0,
      imagePath: null,
      productType: "simple",
      isActive: true,
      isFeatured: false,
      sortOrder: products.filter((product) => product.categoryId === categoryId).length + 1,
      createdAt: new Date().toISOString(),
      variants: [],
      optionGroups: [],
    })
    setEditorModal({ type: "product", id: draftId })
  }

  const patchProductDraft = (patch: Partial<AdminProduct>) => {
    if (draftProduct) {
      setDraftProduct({ ...draftProduct, ...patch })
      return
    }

    if (editingProduct) {
      setProducts((current) =>
        current.map((item) => (item.id === editingProduct.id ? { ...item, ...patch } : item)),
      )
    }
  }

  const handleProductSubmit = async (product: AdminProduct) => {
    if (!product.name.trim()) {
      setSaveMessage("El nombre del producto es obligatorio.")
      return
    }

    if (!product.categoryId) {
      setSaveMessage("El producto debe tener categoria.")
      return
    }

    if (product.basePrice < 0) {
      setSaveMessage("El precio base no puede ser negativo.")
      return
    }

    try {
      if (draftProduct && product.id === draftProduct.id) {
        await createProduct(product.categoryId, {
          name: product.name,
          description: product.description,
          basePrice: product.basePrice,
          imagePath: product.imagePath,
          productType: product.productType,
          isActive: product.isActive,
          isFeatured: product.isFeatured,
          sortOrder: product.sortOrder,
        })
        setSelectedProductCategoryId(product.categoryId)
        setSaveMessage("Producto creado.")
      } else {
        await updateProduct(product.id, product)
        setSaveMessage("Producto guardado.")
      }

      closeCatalogModal()
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo guardar el producto.")
    }
  }

  const handleProductSave = async (product: AdminProduct) => {
    await handleProductSubmit(product)
  }

  const handleProductDelete = async (product: AdminProduct) => {
    if (!window.confirm(`Eliminar ${product.name}? Tambien se eliminaran sus variantes y opciones.`)) {
      return
    }

    try {
      await deleteProduct(product.id)
      setSaveMessage("Producto eliminado.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo eliminar el producto.")
    }
  }

  const handleProductUpload = async (_product: AdminProduct, file: File | undefined) => {
    if (!file) return

    try {
      validateCatalogImage(file)
      const imagePath = await uploadAdminImage("products", file)
      patchProductDraft({ imagePath })
      setSaveMessage("Imagen lista para guardar.")
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo subir la imagen.")
    }
  }

  const handleVariantCreate = async (productId: string) => {
    try {
      await createProductVariant(productId)
      setSaveMessage("Variante agregada.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo crear la variante.")
    }
  }

  const handleVariantSave = async (variant: AdminProductVariant) => {
    if (!variant.name.trim()) {
      setSaveMessage("La variante necesita nombre.")
      return
    }

    if (variant.price < 0) {
      setSaveMessage("El precio de la variante no puede ser negativo.")
      return
    }

    try {
      await updateProductVariant(variant.id, variant)
      setSaveMessage("Variante guardada.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo guardar la variante.")
    }
  }

  const handleOptionGroupCreate = async (productId: string) => {
    try {
      await createProductOptionGroup(productId)
      setSaveMessage("Grupo de opciones agregado.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo crear el grupo.")
    }
  }

  const handleOptionGroupSave = async (group: AdminProductOptionGroup) => {
    if (!group.name.trim()) {
      setSaveMessage("El grupo necesita nombre.")
      return
    }

    if (group.maxSelect < group.minSelect) {
      setSaveMessage("El maximo de opciones no puede ser menor que el minimo.")
      return
    }

    try {
      await updateProductOptionGroup(group.id, group)
      setSaveMessage("Grupo de opciones guardado.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo guardar el grupo.")
    }
  }

  const handleOptionCreate = async (optionGroupId: string) => {
    try {
      await createProductOption(optionGroupId)
      setSaveMessage("Opcion agregada.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo crear la opcion.")
    }
  }

  const handleOptionSave = async (option: AdminProductOption) => {
    if (!option.name.trim()) {
      setSaveMessage("La opcion necesita nombre.")
      return
    }

    if (option.extraPrice < 0) {
      setSaveMessage("El precio extra no puede ser negativo.")
      return
    }

    try {
      await updateProductOption(option.id, option)
      setSaveMessage("Opcion guardada.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo guardar la opcion.")
    }
  }

  const handleVariantDelete = async (id: string) => {
    try {
      await deleteProductVariant(id)
      setSaveMessage("Variante eliminada.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo eliminar la variante.")
    }
  }

  const handleOptionGroupDelete = async (id: string) => {
    try {
      await deleteProductOptionGroup(id)
      setSaveMessage("Grupo eliminado.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo eliminar el grupo.")
    }
  }

  const handleOptionDelete = async (id: string) => {
    try {
      await deleteProductOption(id)
      setSaveMessage("Opcion eliminada.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo eliminar la opcion.")
    }
  }

  const handleTableCreate = async () => {
    const nextNumber = Math.max(0, ...restaurantTables.map((table) => table.tableNumber)) + 1
    try {
      await createRestaurantTable(nextNumber)
      setSaveMessage("Mesa creada con QR unico.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo crear la mesa.")
    }
  }

  const handleTableSave = async (table: AdminRestaurantTable) => {
    if (table.tableNumber <= 0) {
      setSaveMessage("El numero de mesa debe ser mayor a cero.")
      return
    }

    if (!table.tableCode.trim()) {
      setSaveMessage("La mesa necesita un codigo unico.")
      return
    }

    try {
      await updateRestaurantTable(table.id, table)
      setSaveMessage("Mesa guardada.")
      setEditorModal(null)
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo guardar la mesa.")
    }
  }

  const handleTableDelete = async (table: AdminRestaurantTable) => {
    if (!window.confirm(`Eliminar o desactivar ${table.tableName || `Mesa ${table.tableNumber}`}?`)) {
      return
    }

    try {
      await deleteRestaurantTable(table.id)
      setSaveMessage("Mesa eliminada o desactivada.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo eliminar la mesa.")
    }
  }

  const publicTableUrl = (tableCode: string) => `${window.location.origin}/menu/mesa/${tableCode}`
  const tableQrUrl = (tableCode: string) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(publicTableUrl(tableCode))}`

  const handleOrderStatus = async (
    order: AdminLiveOrder,
    orderStatus: AdminOrderStatus,
    paymentStatus?: AdminPaymentStatus | null,
  ) => {
    try {
      await updateLiveOrderStatus(order.id, orderStatus, paymentStatus)
      setSaveMessage("Pedido actualizado.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo actualizar el pedido.")
    }
  }

  const handleOrderReject = async (order: AdminLiveOrder) => {
    const reason = window.prompt("Motivo de rechazo")
    if (reason === null) return

    try {
      await updateLiveOrderStatus(order.id, "rejected", "rejected", reason)
      setSaveMessage("Pedido rechazado.")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo rechazar el pedido.")
    }
  }

  const openOrderWhatsApp = (order: AdminLiveOrder, type: "accepted" | "rejected") => {
    const phone = order.customerPhone.replace(/\D/g, "")
    const message =
      type === "accepted"
        ? `Hola ${order.customerName}, tu pedido ${order.orderCode} fue aceptado y esta en preparacion.`
        : `Hola ${order.customerName}, tu pedido ${order.orderCode} fue rechazado. Motivo: ${order.rejectionReason || "No pudimos procesarlo."}`
    window.open(`https://wa.me/591${phone}?text=${encodeURIComponent(message)}`, "_blank")
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

  const openSuperAdminAction = (action: SuperAdminConfirmAction) => {
    setSuperAdminConfirmAction(action)
    setSuperAdminConfirmation("")
  }

  const executeSuperAdminAction = async () => {
    if (!superAdminConfirmAction) return
    const requiredConfirmation = superAdminConfirmAction.confirmation || ""

    if (requiredConfirmation && superAdminConfirmation !== requiredConfirmation) {
      setSaveMessage(`Debes escribir exactamente: ${requiredConfirmation}`)
      return
    }

    setSuperAdminWorking(true)
    try {
      if (superAdminConfirmAction.kind === "bulk") {
        await runSuperAdminBulkAction(superAdminConfirmAction.action, superAdminConfirmation)
      } else {
        await deleteSuperAdminEntity(
          superAdminConfirmAction.entityType,
          superAdminConfirmAction.entityId,
          superAdminConfirmation,
        )
      }

      setSaveMessage("Accion Super Admin ejecutada.")
      setSuperAdminConfirmAction(null)
      setSuperAdminConfirmation("")
      await loadDashboard(selectedDate, false)
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "No se pudo ejecutar la accion.")
    } finally {
      setSuperAdminWorking(false)
    }
  }

  const isSuperAdmin = adminProfile?.role === "super_admin"
  const visibleAdminSections = adminSections.filter((section) => section.id !== "superAdmin" || isSuperAdmin)
  const superAdminDangerActions: SuperAdminConfirmAction[] = [
    {
      kind: "bulk",
      action: "delete_all_orders",
      title: "Eliminar todos los pedidos",
      description: "Borra pedidos, items, opciones y comprobantes asociados.",
      confirmation: "ELIMINAR PEDIDOS",
    },
    {
      kind: "bulk",
      action: "delete_rejected_orders",
      title: "Eliminar pedidos rechazados",
      description: "Limpia solo los pedidos rechazados y sus comprobantes.",
      confirmation: "ELIMINAR RECHAZADOS",
    },
    {
      kind: "bulk",
      action: "delete_all_bookings",
      title: "Eliminar todas las reservas",
      description: "Borra reservas, notificaciones y comprobantes relacionados.",
      confirmation: "ELIMINAR RESERVAS",
    },
    {
      kind: "bulk",
      action: "delete_past_bookings",
      title: "Eliminar reservas pasadas",
      description: "Borra reservas anteriores a la fecha actual.",
      confirmation: "ELIMINAR RESERVAS PASADAS",
    },
    {
      kind: "bulk",
      action: "reset_payment_qr",
      title: "Resetear QR de pago",
      description: "Elimina QR activos, inactivos, historial e imagenes asociadas sin usar la clave de proteccion del formulario.",
      confirmation: "",
    },
    {
      kind: "bulk",
      action: "delete_catalog",
      title: "Eliminar catalogo",
      description: "Borra categorias, productos, variantes, opciones e imagenes.",
      confirmation: "ELIMINAR CATALOGO",
    },
    {
      kind: "bulk",
      action: "delete_tables",
      title: "Eliminar mesas",
      description: "Borra mesas y pedidos asociados a mesas.",
      confirmation: "ELIMINAR MESAS",
    },
    {
      kind: "bulk",
      action: "cleanup_old_receipts",
      title: "Limpiar comprobantes antiguos",
      description: "Marca como eliminados los comprobantes vencidos y borra archivos del storage.",
      confirmation: "LIMPIAR COMPROBANTES",
    },
  ]

  const pendingLiveOrderCount = liveOrders.filter((order) =>
    ["new", "pending_review"].includes(order.orderStatus),
  ).length
  const unseenCount = notifications.filter((notification) => notification.status !== "seen").length + pendingLiveOrderCount
  const pendingBookings = bookings.filter((booking) =>
    ["pending_payment", "pendiente_verificacion"].includes(booking.status),
  )
  const confirmedBookings = bookings.filter((booking) => booking.status === "confirmed")
  const totalRevenue = bookings
    .filter((booking) => booking.status === "confirmed")
    .reduce((sum, booking) => sum + booking.totalAmount, 0)
  const upcomingBookings = calendarBookings
    .filter((booking) => formatDateKey(new Date(booking.startsAt)) >= today)
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())
  const visibleReservationBookings =
    reservationDateScope === "day"
      ? bookings
      : reservationDateScope === "upcoming"
        ? upcomingBookings
        : [...calendarBookings].sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())
  const futurePreviewBookings = upcomingBookings.slice(0, 6)

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

  const handleReservationScopeChange = (scope: ReservationDateScope) => {
    setShowFuturePreview(false)
    setReservationDateScope(scope)
  }

  const openFuturePreview = () => {
    setReservationDateScope("day")
    setShowFuturePreview(true)
  }

  const shiftCalendarDate = (direction: -1 | 1) => {
    const current = new Date(`${selectedDate}T00:00:00`)
    const nextDate =
      calendarViewMode === "month"
        ? addMonths(current, direction)
        : addDays(current, calendarViewMode === "week" ? direction * 7 : direction)
    setSelectedDate(formatDateKey(nextDate))
  }

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
  const editingProductCategory = editorModal?.type === "productCategory"
    ? (editorModal.id === draftProductCategory?.id
        ? draftProductCategory
        : productCategories.find((item) => item.id === editorModal.id)) || null
    : null
  const editingProduct = editorModal?.type === "product"
    ? (editorModal.id === draftProduct?.id
        ? draftProduct
        : products.find((item) => item.id === editorModal.id)) || null
    : null
  const editingTable = editorModal?.type === "table" ? restaurantTables.find((item) => item.id === editorModal.id) : null
  const activePaymentQr = paymentQrs.find((qr) => qr.isActive) || null
  const qrExpiryAlerts = paymentQrs
    .map((qr) => ({ qr, status: getQrExpiryStatus(qr.expiresAt) }))
    .filter(({ status }) => status.tone === "warning" || status.tone === "danger")
  const categoryById = new Map(productCategories.map((category) => [category.id, category]))
  const visibleProducts = products.filter((product) => {
    const searchText = `${product.name} ${product.description || ""} ${categoryById.get(product.categoryId)?.name || ""}`.toLowerCase()
    const matchesSearch = searchText.includes(productSearch.trim().toLowerCase())
    const matchesCategory =
      selectedProductCategoryId === "all" || product.categoryId === selectedProductCategoryId
    const matchesStatus =
      productStatusFilter === "all" ||
      (productStatusFilter === "active" ? product.isActive : !product.isActive)

    return matchesSearch && matchesCategory && matchesStatus
  })
  const selectedCategory = selectedProductCategoryId === "all"
    ? null
    : productCategories.find((category) => category.id === selectedProductCategoryId) || null
  const selectedCategoryProducts = selectedCategory
    ? visibleProducts.filter((product) => product.categoryId === selectedCategory.id)
    : visibleProducts
  const selectedCategoryProductCount = selectedCategory
    ? products.filter((product) => product.categoryId === selectedCategory.id).length
    : products.length
  const activeLiveOrders = liveOrders.filter((order) => order.orderStatus !== "delivered")
  const deliveredLiveOrders = liveOrders.filter((order) => order.orderStatus === "delivered")
  const visibleLiveOrders = orderBoardMode === "active" ? activeLiveOrders : deliveredLiveOrders
  const liveOrdersForRender = visibleLiveOrders.map((order) => ({
    ...order,
    timeTone: getOrderTimeTone(order),
    elapsedLabel: formatElapsedTime(order),
    refreshKey: clockTick,
  }))
  const nextOrderAction = (order: AdminLiveOrder) => {
    if (order.orderStatus === "new" || order.orderStatus === "pending_review") {
      return { label: "Aceptar", status: "accepted" as AdminOrderStatus, className: "btn-approve" }
    }
    if (order.orderStatus === "accepted") {
      return { label: "Preparando", status: "preparing" as AdminOrderStatus, className: "btn-edit" }
    }
    if (order.orderStatus === "preparing") {
      return { label: "Listo", status: "ready" as AdminOrderStatus, className: "btn-edit" }
    }
    if (order.orderStatus === "ready") {
      return { label: "Entregado", status: "delivered" as AdminOrderStatus, className: "btn-approve" }
    }
    return null
  }

  const renderFutureReservationsPreview = (title: string) => (
    <article className="admin-empty-state">
      <strong>{title}</strong>
      <p>
        Las reservas se filtran por la fecha de juego. Si acabas de registrar una reserva con otra fecha,
        revisala abajo, cambia la fecha del panel o entra a reservas futuras.
      </p>
      <div className="admin-inline-actions">
        <button type="button" className="btn-edit" onClick={openFuturePreview}>
          Ver reservas futuras
        </button>
        <button type="button" className="btn-approve" onClick={() => handleReservationScopeChange("all")}>
          Ver todas
        </button>
      </div>
      {futurePreviewBookings.length > 0 ? (
        <div className="admin-empty-state__list">
          {futurePreviewBookings.map((booking) => (
            <button
              key={booking.id}
              type="button"
              onClick={() => {
                setReservationReturnDate(selectedDate)
                setShowFuturePreview(false)
                setReservationDateScope("day")
                setSelectedDate(formatDateKey(new Date(booking.startsAt)))
              }}
            >
              <span>{booking.fullName} | {booking.reservationCode}</span>
              <strong>
                {formatReservationDate(booking.startsAt)} - {formatReservationTime(booking.startsAt)}
              </strong>
            </button>
          ))}
        </div>
      ) : null}
    </article>
  )

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
          {visibleAdminSections.map((section) => {
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
            {adminProfile ? (
              <span className={`admin-role-badge ${isSuperAdmin ? "admin-role-badge--super" : ""}`}>
                {isSuperAdmin ? "SUPER ADMIN" : adminProfile.role.toUpperCase()}
              </span>
            ) : null}
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
                <h2>
                  {reservationDateScope === "day"
                    ? "Gestion completa del dia"
                    : reservationDateScope === "upcoming"
                      ? "Reservas futuras"
                      : "Todas las reservas"}
                </h2>
              </div>
              <div className="admin-reservation-toolbar">
                <div className="admin-view-toggle" aria-label="Filtrar reservas">
                  <button
                    type="button"
                    className={reservationDateScope === "day" ? "is-active" : ""}
                    onClick={() => handleReservationScopeChange("day")}
                  >
                    Del dia
                  </button>
                  <button
                    type="button"
                    className={reservationDateScope === "upcoming" ? "is-active" : ""}
                    onClick={() => handleReservationScopeChange("upcoming")}
                  >
                    Futuras
                  </button>
                  <button
                    type="button"
                    className={reservationDateScope === "all" ? "is-active" : ""}
                    onClick={() => handleReservationScopeChange("all")}
                  >
                    Todas
                  </button>
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
                {reservationReturnDate ? (
                  <button
                    type="button"
                    className="btn-edit"
                    onClick={() => {
                      setSelectedDate(reservationReturnDate)
                      setReservationReturnDate(null)
                      handleReservationScopeChange("day")
                    }}
                  >
                    Atras
                  </button>
                ) : null}
              </div>
            </div>

            <div className={`admin-reservation-grid admin-reservation-grid--${reservationViewMode}`}>
              {reservationDateScope === "day" && visibleReservationBookings.length > 0 && !showFuturePreview ? (
                <div className="admin-reservation-quick-actions">
                  <button type="button" className="btn-edit" onClick={openFuturePreview}>
                    Ver reservas futuras
                  </button>
                </div>
              ) : null}

              {showFuturePreview
                ? renderFutureReservationsPreview("Reservas futuras")
                : visibleReservationBookings.length === 0
                  ? renderFutureReservationsPreview(
                    reservationDateScope === "day"
                      ? `No hay reservas para ${new Date(`${selectedDate}T00:00:00`).toLocaleDateString("es-BO")}.`
                      : reservationDateScope === "upcoming"
                        ? "No hay reservas futuras registradas."
                        : "No hay reservas registradas.",
                  )
                  : null}

              {!showFuturePreview ? visibleReservationBookings.map((booking) => (
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
                  <p>Total reserva: Bs {booking.totalAmount.toFixed(2)}</p>
                  <p>
                    Pago elegido: {booking.paymentType === "deposit_50" ? "50%" : "100%"} | Pagado ahora: Bs{" "}
                    {booking.amountDue.toFixed(2)}
                  </p>
                  {booking.totalAmount - booking.amountDue > 0 ? (
                    <p>Saldo pendiente: Bs {(booking.totalAmount - booking.amountDue).toFixed(2)}</p>
                  ) : null}
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
                      {
                        dirtyBookingNoteIdsRef.current.add(booking.id)
                        setBookingNotes((current) => ({
                          ...current,
                          [booking.id]: event.target.value,
                        }))
                      }
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
                    {isSuperAdmin ? (
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => openSuperAdminAction({
                          kind: "entity",
                          entityType: "booking",
                          entityId: booking.id,
                          title: `Eliminar reserva ${booking.reservationCode}`,
                          description: "Borra esta reserva, notificaciones y comprobante asociado.",
                        })}
                      >
                        <FaTrash />
                        Eliminar reserva
                      </button>
                    ) : null}
                  </div>
                </article>
              )) : null}
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
              <div className="admin-calendar-toolbar">
                <div className="admin-calendar-nav">
                  <button type="button" className="btn-edit" onClick={() => shiftCalendarDate(-1)}>
                    Anterior
                  </button>
                  <button type="button" className="btn-approve" onClick={() => setSelectedDate(today)}>
                    Hoy
                  </button>
                  <button type="button" className="btn-edit" onClick={() => shiftCalendarDate(1)}>
                    Siguiente
                  </button>
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
                    {isSuperAdmin ? (
                      <button type="button" className="btn-reject" onClick={() => handlePricingDelete(rule.id)}>
                        <FaTrash />
                        <span>Eliminar</span>
                      </button>
                    ) : null}
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
                    {isSuperAdmin ? (
                      <button type="button" className="btn-reject" onClick={() => handleDiscountDelete(token.id)}>
                        <FaTrash />
                        <span>Eliminar</span>
                      </button>
                    ) : null}
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
              {isSuperAdmin ? (
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => openSuperAdminAction(superAdminDangerActions[4])}
                >
                  <FaTrash />
                  <span>Limpiar QR e historial</span>
                </button>
              ) : null}
            </div>

            {qrExpiryAlerts.length > 0 ? (
              <div className="admin-alert-list">
                {qrExpiryAlerts.map(({ qr, status }) => (
                  <div key={qr.id} className={`admin-alert admin-alert--${status.tone}`}>
                    <FaBell />
                    <span>
                      {qr.label}: {status.label}. Actualiza el QR antes de que deje de mostrarse en reservas.
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            <section className="admin-panel-card admin-qr-manager">
              <div>
                <span className="admin-kicker">QR activo actual</span>
                {activePaymentQr ? (
                  <>
                    <div className="admin-preview-card admin-preview-card--qr">
                      <img src={activePaymentQr.imagePath} alt={activePaymentQr.label} />
                      <div>
                        <span>{getQrExpiryStatus(activePaymentQr.expiresAt).label}</span>
                        <strong>{activePaymentQr.label}</strong>
                      </div>
                    </div>
                    <p className="admin-template-help">
                      {activePaymentQr.expiresAt
                        ? `QR valido hasta: ${new Date(activePaymentQr.expiresAt).toLocaleDateString("es-BO")}`
                        : "QR sin fecha de expiracion"}
                    </p>
                  </>
                ) : (
                  <div className="admin-empty-state">
                    <FaQrcode />
                    <strong>No hay QR activo configurado</strong>
                    <p>Sube una imagen, define su fecha de expiracion y guarda con la clave.</p>
                  </div>
                )}

                {newPaymentQrPreviewUrl ? (
                  <div className="admin-qr-preview-new">
                    <span className="admin-kicker">Vista previa nuevo QR</span>
                    <div className="admin-preview-card admin-preview-card--qr">
                      <img src={newPaymentQrPreviewUrl} alt="Vista previa del nuevo QR" />
                      <div>
                        <span>Pendiente de guardar</span>
                        <strong>{newPaymentQrForm.label || "Nuevo QR"}</strong>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="admin-modal-form">
                <label>
                  Nombre
                  <input
                    value={newPaymentQrForm.label}
                    onChange={(event) =>
                      setNewPaymentQrForm((current) => ({ ...current, label: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Subir nuevo QR
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => handleNewPaymentQrUpload(event.target.files?.[0])}
                  />
                  {newPaymentQrFile ? <small>{newPaymentQrFile.name}</small> : null}
                </label>
                <label>
                  Fecha de expiracion
                  <input
                    type="date"
                    min={today}
                    value={newPaymentQrForm.expiresAt}
                    onChange={(event) =>
                      setNewPaymentQrForm((current) => ({ ...current, expiresAt: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Instrucciones
                  <textarea
                    value={newPaymentQrForm.instructions}
                    onChange={(event) =>
                      setNewPaymentQrForm((current) => ({ ...current, instructions: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Clave de proteccion
                  <input
                    type="password"
                    value={qrSecret}
                    onChange={(event) => setQrSecret(event.target.value)}
                    placeholder="Clave obligatoria"
                  />
                </label>
                <button type="button" className="btn-edit" onClick={handlePaymentQrCreate}>
                  <FaSave />
                  <span>Actualizar QR</span>
                </button>
              </div>
            </section>

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
                  <p className={`admin-expiry admin-expiry--${getQrExpiryStatus(qr.expiresAt).tone}`}>
                    {getQrExpiryStatus(qr.expiresAt).label}
                  </p>
                  <button type="button" className="btn-edit" onClick={() => setEditorModal({ type: "paymentQr", id: qr.id })}>
                    <FaEdit />
                    Editar QR
                  </button>
                  {isSuperAdmin ? (
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => openSuperAdminAction({
                        kind: "entity",
                        entityType: "payment_qr",
                        entityId: qr.id,
                        title: `Eliminar QR ${qr.label}`,
                        description: "Borra este QR, sus cambios historicos relacionados y sus imagenes.",
                      })}
                    >
                      <FaTrash />
                      Eliminar QR
                    </button>
                  ) : null}
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
                    <p>{qr.expiresAt ? `Vencia: ${new Date(qr.expiresAt).toLocaleDateString("es-BO")}` : "Sin vencimiento registrado"}</p>
                  </article>
                ))}
              </div>
            </section>
          </section>
        ) : null}

        {!loading && activeSection === "products" ? (
          <section className="admin-content">
            <div className="admin-section-heading">
              <div>
                <span className="admin-kicker">Catalogo</span>
                <h2>Catalogo de productos</h2>
                <p className="admin-template-help">
                  Gestiona categorias, productos, variantes y opciones para el flujo de pedidos.
                </p>
              </div>
              <div className="admin-inline-actions">
                <button type="button" className="btn-approve" onClick={handleProductCategoryCreate}>
                  <FaPlus />
                  <span>Nueva categoria</span>
                </button>
              </div>
            </div>

            <section className="admin-panel-card admin-product-tools">
              <input
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Buscar producto, categoria o descripcion"
              />
              <select
                value={selectedProductCategoryId}
                onChange={(event) => setSelectedProductCategoryId(event.target.value)}
              >
                <option value="all">Todas las categorias</option>
                {productCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select
                value={productStatusFilter}
                onChange={(event) => setProductStatusFilter(event.target.value as ProductStatusFilter)}
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
              <div className="admin-view-toggle">
                <button type="button" className={productViewMode === "grid" ? "is-active" : ""} onClick={() => setProductViewMode("grid")}>
                  <FaThLarge /> Mosaico
                </button>
                <button type="button" className={productViewMode === "list" ? "is-active" : ""} onClick={() => setProductViewMode("list")}>
                  <FaList /> Lista
                </button>
              </div>
            </section>

            <section className="admin-panel-card">
              <div className="admin-section-heading">
                <div>
                  <span className="admin-kicker">Categorias</span>
                  <h2>Secciones del menu</h2>
                </div>
              </div>
              <div className="admin-category-strip">
                <button
                  type="button"
                  className={selectedProductCategoryId === "all" ? "is-active" : ""}
                  onClick={() => setSelectedProductCategoryId("all")}
                >
                  Todas
                  <span>{products.length}</span>
                </button>
                {productCategories.map((category) => (
                  <article
                    key={category.id}
                    className={`admin-category-card ${selectedProductCategoryId === category.id ? "is-active" : ""} ${!category.isActive ? "is-muted" : ""}`}
                  >
                    <button
                      type="button"
                      className="admin-category-card__main"
                      onClick={() => setSelectedProductCategoryId(category.id)}
                    >
                      <img src={resolveCatalogImage(category.imagePath)} alt={category.name} />
                      <div>
                        <strong>{category.name}</strong>
                        <span>
                          {products.filter((product) => product.categoryId === category.id).length} productos
                        </span>
                      </div>
                    </button>
                    <div className="admin-category-card__actions">
                      <button
                        type="button"
                        className="btn-edit"
                        onClick={() => setEditorModal({ type: "productCategory", id: category.id })}
                      >
                        <FaEdit />
                      </button>
                      {isSuperAdmin ? (
                        <button
                          type="button"
                          className="btn-reject"
                          onClick={() => handleProductCategoryDelete(category)}
                        >
                          <FaTrash />
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="admin-panel-card">
              <div className="admin-section-heading">
                <div>
                  <span className="admin-kicker">Productos</span>
                  <h2>{selectedCategory ? selectedCategory.name : "Todos los productos"}</h2>
                  <p className="admin-template-help">
                    {selectedCategory
                      ? `${selectedCategoryProductCount} producto(s) dentro de esta categoria.`
                      : "Selecciona una categoria para enfocarte y crear productos ahi dentro."}
                  </p>
                </div>
                {selectedCategory ? (
                  <div className="admin-inline-actions">
                    <button type="button" className="btn-edit" onClick={handleProductCreate}>
                      <FaPlus />
                      <span>Nuevo producto</span>
                    </button>
                  </div>
                ) : null}
              </div>

              <div className={`admin-product-grid admin-product-grid--${productViewMode}`}>
              {selectedCategoryProducts.length === 0 ? (
                <section className="admin-panel-card">
                  <p className="admin-template-help">No hay productos para este filtro.</p>
                </section>
              ) : null}
              {selectedCategoryProducts.map((product) => {
                const category = categoryById.get(product.categoryId)
                const priceLabel = product.variants.length > 0
                  ? `Desde Bs ${Math.min(...product.variants.map((variant) => variant.price)).toFixed(2)}`
                  : `Bs ${product.basePrice.toFixed(2)}`

                return (
                  <article key={product.id} className={`admin-product-card ${!product.isActive ? "is-muted" : ""}`}>
                    <div className="admin-product-image">
                      <img src={resolveCatalogImage(product.imagePath)} alt={product.name} />
                    </div>
                    <div className="admin-product-body">
                      <div className="admin-card-toolbar">
                        <span className={`status-pill status-pill--${product.isActive ? "confirmed" : "cancelled"}`}>
                          {product.isActive ? "Activo" : "Inactivo"}
                        </span>
                        {product.productType === "combo" ? <span className="admin-product-badge">Combo</span> : null}
                      </div>
                      <strong>{product.name}</strong>
                      <p>{product.description || "Sin descripcion"}</p>
                      <div className="admin-product-meta">
                        <span>{category?.name || "Sin categoria"}</span>
                        <strong>{priceLabel}</strong>
                      </div>
                      <div className="admin-product-meta">
                        <span>{product.variants.length} variantes</span>
                        <span>{product.optionGroups.length} grupos de opciones</span>
                      </div>
                    </div>
                    <div className="admin-inline-actions">
                      <button type="button" className="btn-edit" onClick={() => setEditorModal({ type: "product", id: product.id })}>
                        <FaEdit />
                        <span>Editar</span>
                      </button>
                      {isSuperAdmin ? (
                        <button type="button" className="btn-reject" onClick={() => handleProductDelete(product)}>
                          <FaTrash />
                          <span>Eliminar</span>
                        </button>
                      ) : null}
                    </div>
                  </article>
                )
              })}
              </div>
            </section>
          </section>
        ) : null}

        {!loading && activeSection === "tables" ? (
          <section className="admin-content">
            <div className="admin-section-heading">
              <div>
                <span className="admin-kicker">Mesas</span>
                <h2>QR por mesa</h2>
                <p className="admin-template-help">
                  Cada mesa tiene una URL publica unica para que los clientes hagan pedidos.
                </p>
              </div>
              <button type="button" className="btn-approve" onClick={handleTableCreate}>
                <FaPlus />
                <span>Nueva mesa</span>
              </button>
            </div>

            <div className="admin-table-grid">
              {restaurantTables.map((table) => (
                <article key={table.id} className={`admin-table-card ${!table.isActive ? "is-muted" : ""}`}>
                  <div className="admin-table-card__qr">
                    <img src={tableQrUrl(table.tableCode)} alt={`QR ${table.tableName || table.tableNumber}`} />
                  </div>
                  <div className="admin-table-card__body">
                    <span className={`status-pill status-pill--${table.isActive ? "confirmed" : "cancelled"}`}>
                      {table.isActive ? "Activa" : "Inactiva"}
                    </span>
                    <h3>{table.tableName || `Mesa ${table.tableNumber}`}</h3>
                    <p>{table.tableCode}</p>
                    <a href={publicTableUrl(table.tableCode)} target="_blank" rel="noreferrer">
                      {publicTableUrl(table.tableCode)}
                    </a>
                  </div>
                  <div className="admin-inline-actions">
                    <a className="btn-edit" href={tableQrUrl(table.tableCode)} download={`mesa-${table.tableNumber}-qr.png`}>
                      <FaDownload />
                      <span>QR</span>
                    </a>
                    <button type="button" className="btn-edit" onClick={() => setEditorModal({ type: "table", id: table.id })}>
                      <FaEdit />
                      <span>Editar</span>
                    </button>
                    {isSuperAdmin ? (
                      <button type="button" className="btn-reject" onClick={() => handleTableDelete(table)}>
                        <FaTrash />
                        <span>Eliminar</span>
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {!loading && activeSection === "orders" ? (
          <section className="admin-content">
            <div className="admin-section-heading">
              <div>
                <span className="admin-kicker">Pedidos</span>
                <h2>Pedidos en vivo</h2>
                <p className="admin-template-help">
                  Nuevos pedidos por mesa con tiempos, pagos y comprobantes.
                </p>
              </div>
              <div className="admin-inline-actions">
                <div className="admin-view-toggle">
                  <button
                    type="button"
                    className={orderBoardMode === "active" ? "is-active" : ""}
                    onClick={() => setOrderBoardMode("active")}
                  >
                    Activos ({activeLiveOrders.length})
                  </button>
                  <button
                    type="button"
                    className={orderBoardMode === "delivered" ? "is-active" : ""}
                    onClick={() => setOrderBoardMode("delivered")}
                  >
                    Entregados ({deliveredLiveOrders.length})
                  </button>
                </div>
                <button type="button" className="btn-approve" onClick={() => { setOrderSoundEnabled(true); playNotificationTone() }}>
                  <FaBell />
                  <span>{orderSoundEnabled ? "Sonido activo" : "Activar sonido"}</span>
                </button>
                <button type="button" className="btn-edit" onClick={() => loadDashboard(selectedDate, false)}>
                  <FaSave />
                  <span>Actualizar</span>
                </button>
              </div>
            </div>

            <div className="admin-live-order-grid">
              {liveOrdersForRender.length === 0 ? (
                <section className="admin-panel-card">
                  <p className="admin-template-help">
                    {orderBoardMode === "active"
                      ? "No hay pedidos activos por ahora."
                      : "Todavia no hay pedidos entregados en esta vista."}
                  </p>
                </section>
              ) : null}
              {liveOrdersForRender.map((order) => {
                const nextAction = nextOrderAction(order)

                return (
                <article key={`${order.id}-${order.refreshKey}`} className={`admin-live-order admin-live-order--${order.timeTone}`}>
                  <div className="admin-live-order__head">
                    <div>
                      <span className="admin-kicker">Mesa {order.tableNumber || "-"}</span>
                      <h3>{order.orderCode}</h3>
                    </div>
                    <span className={`admin-order-time admin-order-time--${order.timeTone}`}>
                      {order.deliveredAt ? `Total ${order.elapsedLabel}` : order.elapsedLabel}
                    </span>
                  </div>

                  <div className="admin-order-status-line">
                    {(["accepted", "preparing", "ready", "delivered"] as AdminOrderStatus[]).map((status) => (
                      <span key={status} className={order.orderStatus === status ? "is-current" : ""}>
                        {orderStatusLabels[status]}
                      </span>
                    ))}
                  </div>

                  <div className="admin-order-meta-card">
                    <p><strong>{order.customerName}</strong><span>{order.customerPhone}</span></p>
                    <p><strong>{paymentStatusLabels[order.paymentStatus]}</strong><span>{order.paymentMethod === "qr" ? "Pago QR" : "Caja/efectivo"}</span></p>
                  </div>

                  <div className="admin-order-items">
                    {order.items.map((item) => (
                      <div key={item.id}>
                        <strong>{item.quantity} x {item.productName}</strong>
                        {item.variantName ? <span>Variacion: {item.variantName}</span> : null}
                        {item.options.length > 0 ? (
                          <ul>
                            {item.options.map((option) => (
                              <li key={option.id}>{option.groupName}: {option.optionName}</li>
                            ))}
                          </ul>
                        ) : null}
                        {item.notes ? <em>Nota: {item.notes}</em> : null}
                      </div>
                    ))}
                  </div>
                  {order.receipts.filter((receipt) => !receipt.isDeleted).map((receipt) => (
                    <a key={receipt.id} className="admin-proof-link" href={receipt.imagePath} target="_blank" rel="noreferrer">
                      Ver comprobante
                    </a>
                  ))}
                  {order.rejectionReason ? <p className="admin-order-reason">Motivo: {order.rejectionReason}</p> : null}
                  <div className="admin-product-meta">
                    <span>Creado: {new Date(order.createdAt).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}</span>
                    <strong>Bs {order.total.toFixed(2)}</strong>
                  </div>
                  <div className="admin-inline-actions">
                    {nextAction ? (
                      <button
                        type="button"
                        className={nextAction.className}
                        onClick={() =>
                          handleOrderStatus(
                            order,
                            nextAction.status,
                            nextAction.status === "accepted" ? "paid" : undefined,
                          )
                        }
                      >
                        {nextAction.label}
                      </button>
                    ) : null}
                    {order.orderStatus !== "delivered" && order.orderStatus !== "rejected" ? (
                      <button type="button" className="btn-reject" onClick={() => handleOrderReject(order)}>
                      Rechazar
                      </button>
                    ) : null}
                    <button type="button" className="btn-whatsapp" onClick={() => openOrderWhatsApp(order, order.orderStatus === "rejected" ? "rejected" : "accepted")}>
                      <FaWhatsapp />
                    </button>
                    {isSuperAdmin ? (
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => openSuperAdminAction({
                          kind: "entity",
                          entityType: "order",
                          entityId: order.id,
                          title: `Eliminar pedido ${order.orderCode}`,
                          description: "Borra este pedido con items, opciones y comprobantes asociados.",
                        })}
                      >
                        <FaTrash />
                        Eliminar pedido
                      </button>
                    ) : null}
                  </div>
                </article>
                )
              })}
            </div>
          </section>
        ) : null}

        {!loading && activeSection === "cash" ? (
          <section className="admin-content">
            <CashRegisterPanel
              products={products}
              productCategories={productCategories}
              bookings={calendarBookings}
              liveOrders={liveOrders}
              paymentQrs={paymentQrs}
              isSuperAdmin={isSuperAdmin}
              onRefresh={() => loadDashboard(selectedDate, false)}
              setSaveMessage={setSaveMessage}
            />
          </section>
        ) : null}

        {!loading && activeSection === "inventory" ? (
          <section className="admin-content">
            <InventoryPanel isSuperAdmin={isSuperAdmin} />
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
                      {isSuperAdmin ? (
                        <button type="button" className="btn-reject" onClick={() => handleHeroDelete(slide.id)}>
                          <FaTrash />
                          <span>Eliminar</span>
                        </button>
                      ) : null}
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
                      {isSuperAdmin ? (
                        <button type="button" className="btn-reject" onClick={() => handleNoveltyDelete(item.id)}>
                          <FaTrash />
                          <span>Eliminar</span>
                        </button>
                      ) : null}
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

        {!loading && activeSection === "superAdmin" && isSuperAdmin ? (
          <section className="admin-content admin-super-admin">
            <div className="admin-section-heading">
              <div>
                <span className="admin-kicker">Acceso total</span>
                <h2>Super Admin</h2>
                <p className="admin-template-help">
                  Acciones destructivas protegidas por rol y confirmacion fuerte. Esta zona no esta disponible para admins normales.
                </p>
              </div>
            </div>

            <div className="admin-super-grid">
              <article className="admin-panel-card admin-super-card">
                <span className="admin-kicker">Pedidos</span>
                <strong>{superAdminOverview?.orders.total ?? liveOrders.length}</strong>
                <p>{superAdminOverview?.orders.pending ?? 0} pendientes | {superAdminOverview?.orders.rejected ?? 0} rechazados</p>
                <div className="admin-inline-actions">
                  <button type="button" className="btn-edit" onClick={() => setActiveSection("orders")}>Ver pedidos</button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => openSuperAdminAction(superAdminDangerActions[0])}
                  >
                    Eliminar todos
                  </button>
                </div>
              </article>

              <article className="admin-panel-card admin-super-card">
                <span className="admin-kicker">Reservas</span>
                <strong>{superAdminOverview?.bookings.total ?? calendarBookings.length}</strong>
                <p>{superAdminOverview?.bookings.today ?? bookings.length} hoy | {superAdminOverview?.bookings.past ?? 0} pasadas</p>
                <div className="admin-inline-actions">
                  <button type="button" className="btn-edit" onClick={() => setActiveSection("reservations")}>Ver reservas</button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => openSuperAdminAction(superAdminDangerActions[2])}
                  >
                    Eliminar todas
                  </button>
                </div>
              </article>

              <article className="admin-panel-card admin-super-card">
                <span className="admin-kicker">QR de pago</span>
                <strong>{superAdminOverview?.paymentQrs.active ?? paymentQrs.filter((qr) => qr.isActive).length}</strong>
                <p>{superAdminOverview?.paymentQrs.history ?? paymentQrHistory.length} registros historicos</p>
                <div className="admin-inline-actions">
                  <button type="button" className="btn-edit" onClick={() => setActiveSection("paymentQr")}>Gestionar QR</button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => openSuperAdminAction(superAdminDangerActions[4])}
                  >
                    Reset QR
                  </button>
                </div>
              </article>

              <article className="admin-panel-card admin-super-card">
                <span className="admin-kicker">Catalogo</span>
                <strong>{superAdminOverview?.catalog.products ?? products.length}</strong>
                <p>{superAdminOverview?.catalog.categories ?? productCategories.length} categorias | {superAdminOverview?.catalog.activeProducts ?? products.filter((product) => product.isActive).length} activos</p>
                <div className="admin-inline-actions">
                  <button type="button" className="btn-edit" onClick={() => setActiveSection("products")}>Ver productos</button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => openSuperAdminAction(superAdminDangerActions[5])}
                  >
                    Eliminar catalogo
                  </button>
                </div>
              </article>

              <article className="admin-panel-card admin-super-card">
                <span className="admin-kicker">Mesas</span>
                <strong>{superAdminOverview?.tables.total ?? restaurantTables.length}</strong>
                <p>{superAdminOverview?.tables.active ?? restaurantTables.filter((table) => table.isActive).length} mesas activas</p>
                <div className="admin-inline-actions">
                  <button type="button" className="btn-edit" onClick={() => setActiveSection("tables")}>Ver mesas</button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => openSuperAdminAction(superAdminDangerActions[6])}
                  >
                    Eliminar mesas
                  </button>
                </div>
              </article>
            </div>

            <section className="admin-panel-card admin-danger-zone">
              <div className="admin-section-heading">
                <div>
                  <span className="admin-kicker">Zona peligrosa</span>
                  <h2>Acciones irreversibles</h2>
                  <p className="admin-template-help">Estas acciones se validan en Supabase con `is_super_admin()` y quedan registradas en auditoria.</p>
                </div>
              </div>

              <div className="admin-danger-grid">
                {superAdminDangerActions.map((action) => (
                  <article key={action.title} className="admin-danger-card">
                    <div>
                      <strong>{action.title}</strong>
                      <p>{action.description}</p>
                      {action.confirmation ? (
                        <small>Confirmacion: {action.confirmation}</small>
                      ) : (
                        <small>Solo requiere sesion Super Admin activa.</small>
                      )}
                    </div>
                    <button type="button" className="btn-danger" onClick={() => openSuperAdminAction(action)}>
                      Ejecutar
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section className="admin-panel-card">
              <div className="admin-section-heading">
                <div>
                  <span className="admin-kicker">Eliminacion individual</span>
                  <h2>Registros recientes</h2>
                  <p className="admin-template-help">Para limpieza puntual. Cada accion vuelve a validarse en Supabase.</p>
                </div>
              </div>

              <div className="admin-super-lists">
                <div>
                  <h3>Pedidos</h3>
                  {liveOrders.slice(0, 5).map((order) => (
                    <article key={order.id} className="admin-super-list-row">
                      <span>{order.orderCode} | Mesa {order.tableNumber || "-"}</span>
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => openSuperAdminAction({
                          kind: "entity",
                          entityType: "order",
                          entityId: order.id,
                          title: `Eliminar pedido ${order.orderCode}`,
                          description: "Borra el pedido completo con items, opciones y comprobantes.",
                        })}
                      >
                        Borrar
                      </button>
                    </article>
                  ))}
                </div>

                <div>
                  <h3>Reservas</h3>
                  {calendarBookings.slice(0, 5).map((booking) => (
                    <article key={booking.id} className="admin-super-list-row">
                      <span>{booking.reservationCode} | {booking.fullName}</span>
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => openSuperAdminAction({
                          kind: "entity",
                          entityType: "booking",
                          entityId: booking.id,
                          title: `Eliminar reserva ${booking.reservationCode}`,
                          description: "Borra la reserva y sus datos relacionados.",
                        })}
                      >
                        Borrar
                      </button>
                    </article>
                  ))}
                </div>

                <div>
                  <h3>QR de pago</h3>
                  {paymentQrs.slice(0, 5).map((qr) => (
                    <article key={qr.id} className="admin-super-list-row">
                      <span>{qr.label} | {qr.isActive ? "Activo" : "Inactivo"}</span>
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => openSuperAdminAction({
                          kind: "entity",
                          entityType: "payment_qr",
                          entityId: qr.id,
                          title: `Eliminar QR ${qr.label}`,
                          description: "Borra el registro del QR y su imagen asociada.",
                        })}
                      >
                        Borrar
                      </button>
                    </article>
                  ))}
                </div>

                <div>
                  <h3>Productos</h3>
                  {products.slice(0, 5).map((product) => (
                    <article key={product.id} className="admin-super-list-row">
                      <span>{product.name}</span>
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => openSuperAdminAction({
                          kind: "entity",
                          entityType: "product",
                          entityId: product.id,
                          title: `Eliminar producto ${product.name}`,
                          description: "Borra el producto con variantes, grupos de opciones e imagen.",
                        })}
                      >
                        Borrar
                      </button>
                    </article>
                  ))}
                </div>

                <div>
                  <h3>Mesas</h3>
                  {restaurantTables.slice(0, 5).map((table) => (
                    <article key={table.id} className="admin-super-list-row">
                      <span>{table.tableName || `Mesa ${table.tableNumber}`}</span>
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => openSuperAdminAction({
                          kind: "entity",
                          entityType: "restaurant_table",
                          entityId: table.id,
                          title: `Eliminar ${table.tableName || `Mesa ${table.tableNumber}`}`,
                          description: "Borra la mesa. Si tiene pedidos, tambien se eliminaran con confirmacion fuerte.",
                          confirmation: "ELIMINAR MESA",
                        })}
                      >
                        Borrar
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section className="admin-panel-card">
              <div className="admin-section-heading">
                <div>
                  <span className="admin-kicker">Auditoria</span>
                  <h2>Ultimas acciones</h2>
                </div>
              </div>

              <div className="admin-audit-list">
                {(superAdminOverview?.auditLogs.latest || []).length === 0 ? (
                  <p className="admin-template-help">Aun no hay acciones destructivas registradas.</p>
                ) : (
                  (superAdminOverview?.auditLogs.latest || []).map((log) => (
                    <article key={log.id} className="admin-audit-row">
                      <div>
                        <strong>{log.action}</strong>
                        <span>{log.entityType}{log.entityId ? ` | ${log.entityId}` : ""}</span>
                      </div>
                      <small>{log.actorEmail || "sin email"} | {new Date(log.createdAt).toLocaleString("es-BO")}</small>
                    </article>
                  ))
                )}
              </div>
            </section>
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

        {superAdminConfirmAction ? (
          <div className="admin-modal" role="dialog" aria-modal="true">
            <div className="admin-modal-card admin-danger-modal">
              <div className="admin-modal-head">
                <div>
                  <span className="admin-kicker">Confirmacion fuerte</span>
                  <h2>{superAdminConfirmAction.title}</h2>
                </div>
                <button
                  type="button"
                  className="admin-modal-close"
                  onClick={() => {
                    setSuperAdminConfirmAction(null)
                    setSuperAdminConfirmation("")
                  }}
                >
                  <FaTimes />
                </button>
              </div>

              <div className="admin-modal-form">
                <p className="admin-danger-warning">
                  {superAdminConfirmAction.description} Esta accion no se puede deshacer.
                </p>
                {superAdminConfirmAction.confirmation ? (
                  <label>
                    Escribe exactamente: <strong>{superAdminConfirmAction.confirmation}</strong>
                    <input
                      value={superAdminConfirmation}
                      onChange={(event) => setSuperAdminConfirmation(event.target.value)}
                      placeholder={superAdminConfirmAction.confirmation}
                    />
                  </label>
                ) : null}
                <div className="admin-inline-actions">
                  <button
                    type="button"
                    className="btn-reject"
                    onClick={() => {
                      setSuperAdminConfirmAction(null)
                      setSuperAdminConfirmation("")
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={executeSuperAdminAction}
                    disabled={superAdminWorking}
                  >
                    {superAdminWorking ? "Ejecutando..." : "Ejecutar accion"}
                  </button>
                </div>
              </div>
            </div>
          </div>
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
                    {editorModal.type === "paymentQr" ? "QR de pago" : null}
                    {editorModal.type === "productCategory" ? "Categoria" : null}
                    {editorModal.type === "product" ? "Producto" : null}
                    {editorModal.type === "table" ? "Mesa" : null}
                  </h2>
                </div>
                <button
                  type="button"
                  className="admin-modal-close"
                  onClick={() => {
                    if (editorModal.type === "productCategory" || editorModal.type === "product") {
                      closeCatalogModal()
                    } else {
                      setEditorModal(null)
                    }
                    setQrSecret("")
                  }}
                >
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
                  <label>Subir nuevo QR<input type="file" accept="image/*" onChange={(event) => handlePaymentQrUpload(editingPaymentQr, event.target.files?.[0])} />{pendingPaymentQrFiles[editingPaymentQr.id] ? <small>{pendingPaymentQrFiles[editingPaymentQr.id].name}</small> : null}</label>
                  <label>Instrucciones<textarea value={editingPaymentQr.instructions || ""} onChange={(event) => setPaymentQrs((current) => current.map((item) => item.id === editingPaymentQr.id ? { ...item, instructions: event.target.value } : item))} /></label>
                  <label>Fecha de vencimiento<input type="date" value={editingPaymentQr.expiresAt ? editingPaymentQr.expiresAt.slice(0, 10) : ""} onChange={(event) => setPaymentQrs((current) => current.map((item) => item.id === editingPaymentQr.id ? { ...item, expiresAt: event.target.value ? new Date(`${event.target.value}T23:59:59`).toISOString() : null } : item))} /></label>
                  <label className="admin-switch"><input type="checkbox" checked={editingPaymentQr.isActive} onChange={(event) => setPaymentQrs((current) => current.map((item) => item.id === editingPaymentQr.id ? { ...item, isActive: event.target.checked } : item))} />Activo</label>
                  <label>Clave para cambiar QR<input type="password" value={qrSecret} onChange={(event) => setQrSecret(event.target.value)} placeholder="Clave obligatoria" /></label>
                  <button type="button" className="btn-edit" onClick={() => handlePaymentQrSave(editingPaymentQr)}><FaSave />Guardar QR protegido</button>
                </div>
              ) : null}

              {editingProductCategory ? (
                <div className="admin-modal-form">
                  <div className="admin-preview-card">
                    <img src={resolveCatalogImage(editingProductCategory.imagePath)} alt={editingProductCategory.name || "Categoria"} />
                    <div><span>Categoria</span><strong>{editingProductCategory.name || "Nueva categoria"}</strong></div>
                  </div>
                  <label>Nombre<input value={editingProductCategory.name} onChange={(event) => patchProductCategoryDraft({ name: event.target.value })} /></label>
                  <label>Descripcion<textarea value={editingProductCategory.description || ""} onChange={(event) => patchProductCategoryDraft({ description: event.target.value })} /></label>
                  <label>Imagen<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => handleProductCategoryUpload(editingProductCategory, event.target.files?.[0])} /></label>
                  <div className="admin-mini-grid">
                    <label>Orden<input type="number" value={editingProductCategory.sortOrder} onChange={(event) => patchProductCategoryDraft({ sortOrder: Number(event.target.value) })} /></label>
                    <label className="admin-switch"><input type="checkbox" checked={editingProductCategory.isActive} onChange={(event) => patchProductCategoryDraft({ isActive: event.target.checked })} />Activa</label>
                  </div>
                  <div className="admin-modal-actions">
                    <button type="button" className="btn-reject" onClick={closeCatalogModal}><FaTimes />Cancelar</button>
                    <button type="button" className="btn-edit" onClick={() => handleProductCategorySave(editingProductCategory)}><FaSave />Aceptar</button>
                  </div>
                </div>
              ) : null}

              {editingProduct ? (
                <div className="admin-modal-form admin-product-editor">
                  <div className="admin-product-editor__top">
                    <div className="admin-preview-card">
                      <img src={resolveCatalogImage(editingProduct.imagePath)} alt={editingProduct.name || "Producto"} />
                      <div><span>{editingProduct.productType}</span><strong>{editingProduct.name || "Nuevo producto"}</strong></div>
                    </div>
                    <div className="admin-product-editor__fields">
                      <label>Nombre<input value={editingProduct.name} onChange={(event) => patchProductDraft({ name: event.target.value })} /></label>
                      <label>Categoria<select value={editingProduct.categoryId} onChange={(event) => patchProductDraft({ categoryId: event.target.value })}>{productCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                      <label>Descripcion<textarea value={editingProduct.description || ""} onChange={(event) => patchProductDraft({ description: event.target.value })} /></label>
                    </div>
                  </div>

                  <div className="admin-mini-grid">
                    <label>Precio base<input type="number" min="0" step="0.5" value={editingProduct.basePrice} onChange={(event) => patchProductDraft({ basePrice: Number(event.target.value) })} /></label>
                    <label>Tipo<select value={editingProduct.productType} onChange={(event) => patchProductDraft({ productType: event.target.value as AdminProduct["productType"] })}><option value="simple">Simple</option><option value="combo">Combo</option></select></label>
                    <label>Orden<input type="number" value={editingProduct.sortOrder} onChange={(event) => patchProductDraft({ sortOrder: Number(event.target.value) })} /></label>
                  </div>
                  <label>Imagen<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => handleProductUpload(editingProduct, event.target.files?.[0])} /></label>
                  <div className="admin-inline-actions">
                    <label className="admin-switch"><input type="checkbox" checked={editingProduct.isActive} onChange={(event) => patchProductDraft({ isActive: event.target.checked })} />Activo</label>
                    <label className="admin-switch"><input type="checkbox" checked={editingProduct.isFeatured} onChange={(event) => patchProductDraft({ isFeatured: event.target.checked })} />Destacado</label>
                  </div>
                  <div className="admin-modal-actions">
                    <button type="button" className="btn-reject" onClick={closeCatalogModal}><FaTimes />Cancelar</button>
                    <button type="button" className="btn-edit" onClick={() => handleProductSave(editingProduct)}><FaSave />Aceptar</button>
                  </div>

                  {!draftProduct ? (
                  <section className="admin-product-editor-section">
                    <div className="admin-card-toolbar">
                      <strong>Variantes</strong>
                      <button type="button" className="btn-approve" onClick={() => handleVariantCreate(editingProduct.id)}><FaPlus />Agregar variante</button>
                    </div>
                    {editingProduct.variants.length === 0 ? <p className="admin-template-help">Sin variantes. El producto usara su precio base.</p> : null}
                    {editingProduct.variants.map((variant) => (
                      <article key={variant.id} className="admin-nested-editor">
                        <div className="admin-mini-grid">
                          <label>Nombre<input value={variant.name} onChange={(event) => setProducts((current) => current.map((product) => product.id === editingProduct.id ? { ...product, variants: product.variants.map((item) => item.id === variant.id ? { ...item, name: event.target.value } : item) } : product))} /></label>
                          <label>Precio<input type="number" min="0" step="0.5" value={variant.price} onChange={(event) => setProducts((current) => current.map((product) => product.id === editingProduct.id ? { ...product, variants: product.variants.map((item) => item.id === variant.id ? { ...item, price: Number(event.target.value) } : item) } : product))} /></label>
                          <label>Orden<input type="number" value={variant.sortOrder} onChange={(event) => setProducts((current) => current.map((product) => product.id === editingProduct.id ? { ...product, variants: product.variants.map((item) => item.id === variant.id ? { ...item, sortOrder: Number(event.target.value) } : item) } : product))} /></label>
                        </div>
                        <label>Descripcion<input value={variant.description || ""} onChange={(event) => setProducts((current) => current.map((product) => product.id === editingProduct.id ? { ...product, variants: product.variants.map((item) => item.id === variant.id ? { ...item, description: event.target.value } : item) } : product))} /></label>
                        <div className="admin-inline-actions">
                          <label className="admin-switch"><input type="checkbox" checked={variant.isActive} onChange={(event) => setProducts((current) => current.map((product) => product.id === editingProduct.id ? { ...product, variants: product.variants.map((item) => item.id === variant.id ? { ...item, isActive: event.target.checked } : item) } : product))} />Activa</label>
                          <button type="button" className="btn-edit" onClick={() => handleVariantSave(variant)}><FaSave />Guardar</button>
                          {isSuperAdmin ? (
                            <button type="button" className="btn-reject" onClick={() => handleVariantDelete(variant.id)}><FaTrash />Eliminar</button>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </section>
                  ) : null}

                  {!draftProduct ? (
                  <section className="admin-product-editor-section">
                    <div className="admin-card-toolbar">
                      <strong>Opciones configurables</strong>
                      <button type="button" className="btn-approve" onClick={() => handleOptionGroupCreate(editingProduct.id)}><FaPlus />Agregar grupo</button>
                    </div>
                    {editingProduct.optionGroups.length === 0 ? <p className="admin-template-help">Sin grupos de opciones.</p> : null}
                    {editingProduct.optionGroups.map((group) => (
                      <article key={group.id} className="admin-nested-editor">
                        <div className="admin-mini-grid">
                          <label>Grupo<input value={group.name} onChange={(event) => setProducts((current) => current.map((product) => product.id === editingProduct.id ? { ...product, optionGroups: product.optionGroups.map((item) => item.id === group.id ? { ...item, name: event.target.value } : item) } : product))} /></label>
                          <label>Seleccion<select value={group.selectionType} onChange={(event) => setProducts((current) => current.map((product) => product.id === editingProduct.id ? { ...product, optionGroups: product.optionGroups.map((item) => item.id === group.id ? { ...item, selectionType: event.target.value as AdminProductOptionGroup["selectionType"] } : item) } : product))}><option value="single">Unica</option><option value="multiple">Multiple</option></select></label>
                          <label>Min<input type="number" min="0" value={group.minSelect} onChange={(event) => setProducts((current) => current.map((product) => product.id === editingProduct.id ? { ...product, optionGroups: product.optionGroups.map((item) => item.id === group.id ? { ...item, minSelect: Number(event.target.value) } : item) } : product))} /></label>
                          <label>Max<input type="number" min="0" value={group.maxSelect} onChange={(event) => setProducts((current) => current.map((product) => product.id === editingProduct.id ? { ...product, optionGroups: product.optionGroups.map((item) => item.id === group.id ? { ...item, maxSelect: Number(event.target.value) } : item) } : product))} /></label>
                        </div>
                        <div className="admin-inline-actions">
                          <label className="admin-switch"><input type="checkbox" checked={group.isRequired} onChange={(event) => setProducts((current) => current.map((product) => product.id === editingProduct.id ? { ...product, optionGroups: product.optionGroups.map((item) => item.id === group.id ? { ...item, isRequired: event.target.checked } : item) } : product))} />Obligatorio</label>
                          <label className="admin-switch"><input type="checkbox" checked={group.isActive} onChange={(event) => setProducts((current) => current.map((product) => product.id === editingProduct.id ? { ...product, optionGroups: product.optionGroups.map((item) => item.id === group.id ? { ...item, isActive: event.target.checked } : item) } : product))} />Activo</label>
                          <button type="button" className="btn-edit" onClick={() => handleOptionGroupSave(group)}><FaSave />Guardar grupo</button>
                          {isSuperAdmin ? (
                            <button type="button" className="btn-reject" onClick={() => handleOptionGroupDelete(group.id)}><FaTrash />Eliminar grupo</button>
                          ) : null}
                          <button type="button" className="btn-approve" onClick={() => handleOptionCreate(group.id)}><FaPlus />Agregar opcion</button>
                        </div>
                        {group.options.map((option) => (
                          <div key={option.id} className="admin-option-row">
                            <input value={option.name} onChange={(event) => setProducts((current) => current.map((product) => product.id === editingProduct.id ? { ...product, optionGroups: product.optionGroups.map((item) => item.id === group.id ? { ...item, options: item.options.map((nextOption) => nextOption.id === option.id ? { ...nextOption, name: event.target.value } : nextOption) } : item) } : product))} />
                            <input type="number" min="0" step="0.5" value={option.extraPrice} onChange={(event) => setProducts((current) => current.map((product) => product.id === editingProduct.id ? { ...product, optionGroups: product.optionGroups.map((item) => item.id === group.id ? { ...item, options: item.options.map((nextOption) => nextOption.id === option.id ? { ...nextOption, extraPrice: Number(event.target.value) } : nextOption) } : item) } : product))} />
                            <label className="admin-switch"><input type="checkbox" checked={option.isActive} onChange={(event) => setProducts((current) => current.map((product) => product.id === editingProduct.id ? { ...product, optionGroups: product.optionGroups.map((item) => item.id === group.id ? { ...item, options: item.options.map((nextOption) => nextOption.id === option.id ? { ...nextOption, isActive: event.target.checked } : nextOption) } : item) } : product))} />Activa</label>
                            <button type="button" className="btn-edit" onClick={() => handleOptionSave(option)}><FaSave /></button>
                            {isSuperAdmin ? (
                              <button type="button" className="btn-reject" onClick={() => handleOptionDelete(option.id)}><FaTrash /></button>
                            ) : null}
                          </div>
                        ))}
                      </article>
                    ))}
                  </section>
                  ) : null}
                </div>
              ) : null}

              {editingTable ? (
                <div className="admin-modal-form">
                  <div className="admin-table-modal-preview">
                    <img src={tableQrUrl(editingTable.tableCode)} alt={`QR ${editingTable.tableNumber}`} />
                    <div>
                      <span className="admin-kicker">URL publica</span>
                      <a href={publicTableUrl(editingTable.tableCode)} target="_blank" rel="noreferrer">
                        {publicTableUrl(editingTable.tableCode)}
                      </a>
                    </div>
                  </div>
                  <div className="admin-mini-grid">
                    <label>Numero<input type="number" min="1" value={editingTable.tableNumber} onChange={(event) => setRestaurantTables((current) => current.map((item) => item.id === editingTable.id ? { ...item, tableNumber: Number(event.target.value) } : item))} /></label>
                    <label>Nombre<input value={editingTable.tableName || ""} onChange={(event) => setRestaurantTables((current) => current.map((item) => item.id === editingTable.id ? { ...item, tableName: event.target.value } : item))} /></label>
                  </div>
                  <label>Codigo unico<input value={editingTable.tableCode} onChange={(event) => setRestaurantTables((current) => current.map((item) => item.id === editingTable.id ? { ...item, tableCode: event.target.value.trim() } : item))} /></label>
                  <label className="admin-switch"><input type="checkbox" checked={editingTable.isActive} onChange={(event) => setRestaurantTables((current) => current.map((item) => item.id === editingTable.id ? { ...item, isActive: event.target.checked } : item))} />Activa</label>
                  <button type="button" className="btn-edit" onClick={() => handleTableSave(editingTable)}><FaSave />Guardar mesa</button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  )
}
