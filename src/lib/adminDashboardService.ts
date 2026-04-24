import { resolveMediaPath } from "./contentService"
import { supabase } from "./supabaseClient"

export type AdminBookingStatus =
  | "pending_payment"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "expired"

export interface AdminBooking {
  id: string
  reservationCode: string
  fullName: string
  phone: string
  nationalId: string
  durationMinutes: number
  partySize: number
  startsAt: string
  endsAt: string
  status: AdminBookingStatus
  paymentType: "deposit_50" | "total"
  totalAmount: number
  amountDue: number
  paymentReference: string | null
  adminNotes: string | null
  createdAt: string
}

export interface AdminNotification {
  id: string
  bookingId: string | null
  eventType: string
  recipient: string
  message: string
  status: string
  createdAt: string
}

export interface AdminHeroSlide {
  id: string
  title: string | null
  subtitle: string | null
  imagePath: string
  altText: string
  sortOrder: number
  isActive: boolean
}

export interface AdminNoveltyItem {
  id: string
  title: string
  description: string
  price: number | null
  imagePath: string
  badge: string
  sortOrder: number
  isActive: boolean
}

export interface AdminPedidosYaPromo {
  id: string
  title: string
  description: string
  imagePath: string
  ctaLabel: string
  ctaUrl: string
  points: string[]
  isActive: boolean
}

export interface AdminPricingRule {
  id: string
  label: string
  durationMinutes: number
  personCount: number
  price: number
  sortOrder: number
  isActive: boolean
}

type AdminBookingRow = {
  id: string
  reservation_code: string
  full_name: string
  phone: string
  national_id: string
  duration_minutes: number
  party_size: number
  starts_at: string
  ends_at: string
  status: AdminBookingStatus
  payment_type: "deposit_50" | "total"
  total_amount: number
  amount_due: number
  payment_reference: string | null
  admin_notes: string | null
  created_at: string
}

type AdminNotificationRow = {
  id: string
  booking_id: string | null
  event_type: string
  recipient: string
  message: string
  status: string
  created_at: string
}

type AdminHeroSlideRow = {
  id: string
  title: string | null
  subtitle: string | null
  image_path: string
  alt_text: string
  sort_order: number
  is_active: boolean
}

type AdminNoveltyItemRow = {
  id: string
  title: string
  description: string
  price: number | null
  image_path: string
  badge: string
  sort_order: number
  is_active: boolean
}

type AdminPedidosYaPromoRow = {
  id: string
  title: string
  description: string
  image_path: string
  cta_label: string
  cta_url: string
  points: string[] | null
  is_active: boolean
}

type AdminPricingRuleRow = {
  id: string
  label: string
  duration_minutes: number
  person_count: number
  price: number
  sort_order: number
  is_active: boolean
}

export async function fetchAdminBookings(date?: string) {
  let query = supabase
    .from("bookings")
    .select(
      "id, reservation_code, full_name, phone, national_id, duration_minutes, party_size, starts_at, ends_at, status, payment_type, total_amount, amount_due, payment_reference, admin_notes, created_at",
    )
    .order("starts_at", { ascending: true })

  if (date) {
    const start = `${date}T00:00:00.000Z`
    const end = `${date}T23:59:59.999Z`
    query = query.gte("starts_at", start).lte("starts_at", end)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return ((data || []) as AdminBookingRow[]).map((booking) => ({
    id: booking.id,
    reservationCode: booking.reservation_code,
    fullName: booking.full_name,
    phone: booking.phone,
    nationalId: booking.national_id,
    durationMinutes: booking.duration_minutes,
    partySize: booking.party_size,
    startsAt: booking.starts_at,
    endsAt: booking.ends_at,
    status: booking.status,
    paymentType: booking.payment_type,
    totalAmount: Number(booking.total_amount),
    amountDue: Number(booking.amount_due),
    paymentReference: booking.payment_reference,
    adminNotes: booking.admin_notes,
    createdAt: booking.created_at,
  }))
}

export async function updateBookingStatus(
  id: string,
  status: AdminBookingStatus,
  adminNotes?: string,
) {
  const patch: { status: AdminBookingStatus; admin_notes?: string; confirmed_at?: string | null; rejected_at?: string | null } = {
    status,
  }

  if (typeof adminNotes === "string") {
    patch.admin_notes = adminNotes
  }

  if (status === "confirmed") {
    patch.confirmed_at = new Date().toISOString()
    patch.rejected_at = null
  }

  if (status === "rejected") {
    patch.rejected_at = new Date().toISOString()
    patch.confirmed_at = null
  }

  const { error } = await supabase.from("bookings").update(patch).eq("id", id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function fetchAdminNotifications() {
  const { data, error } = await supabase
    .from("notification_events")
    .select("id, booking_id, event_type, recipient, message, status, created_at")
    .order("created_at", { ascending: false })
    .limit(25)

  if (error) {
    throw new Error(error.message)
  }

  return ((data || []) as AdminNotificationRow[]).map((notification) => ({
    id: notification.id,
    bookingId: notification.booking_id,
    eventType: notification.event_type,
    recipient: notification.recipient,
    message: notification.message,
    status: notification.status,
    createdAt: notification.created_at,
  }))
}

export async function markNotificationSeen(notificationId: string) {
  const { error } = await supabase.rpc("mark_notification_seen", {
    p_notification_id: notificationId,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function fetchAdminHeroSlides() {
  const { data, error } = await supabase
    .from("hero_slides")
    .select("id, title, subtitle, image_path, alt_text, sort_order, is_active")
    .order("sort_order", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return ((data || []) as AdminHeroSlideRow[]).map((slide) => ({
    id: slide.id,
    title: slide.title,
    subtitle: slide.subtitle,
    imagePath: resolveMediaPath(slide.image_path, "hero"),
    altText: slide.alt_text,
    sortOrder: slide.sort_order,
    isActive: slide.is_active,
  }))
}

export async function updateHeroSlide(
  id: string,
  patch: Partial<{
    title: string | null
    subtitle: string | null
    imagePath: string
    altText: string
    sortOrder: number
    isActive: boolean
  }>,
) {
  const payload: Record<string, string | number | boolean | null> = {}
  if ("title" in patch) payload.title = patch.title ?? null
  if ("subtitle" in patch) payload.subtitle = patch.subtitle ?? null
  if ("imagePath" in patch) payload.image_path = patch.imagePath ?? ""
  if ("altText" in patch) payload.alt_text = patch.altText ?? ""
  if ("sortOrder" in patch) payload.sort_order = patch.sortOrder ?? 0
  if ("isActive" in patch) payload.is_active = patch.isActive ?? true

  const { error } = await supabase.from("hero_slides").update(payload).eq("id", id)
  if (error) throw new Error(error.message)
}

export async function fetchAdminNoveltyItems() {
  const { data, error } = await supabase
    .from("novelty_items")
    .select("id, title, description, price, image_path, badge, sort_order, is_active")
    .order("sort_order", { ascending: true })

  if (error) throw new Error(error.message)

  return ((data || []) as AdminNoveltyItemRow[]).map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    price: item.price === null ? null : Number(item.price),
    imagePath: resolveMediaPath(item.image_path, "novedades"),
    badge: item.badge,
    sortOrder: item.sort_order,
    isActive: item.is_active,
  }))
}

export async function updateNoveltyItem(
  id: string,
  patch: Partial<{
    title: string
    description: string
    price: number | null
    imagePath: string
    badge: string
    sortOrder: number
    isActive: boolean
  }>,
) {
  const payload: Record<string, string | number | boolean | null> = {}
  if ("title" in patch) payload.title = patch.title ?? ""
  if ("description" in patch) payload.description = patch.description ?? ""
  if ("price" in patch) payload.price = patch.price ?? null
  if ("imagePath" in patch) payload.image_path = patch.imagePath ?? ""
  if ("badge" in patch) payload.badge = patch.badge ?? ""
  if ("sortOrder" in patch) payload.sort_order = patch.sortOrder ?? 0
  if ("isActive" in patch) payload.is_active = patch.isActive ?? true

  const { error } = await supabase.from("novelty_items").update(payload).eq("id", id)
  if (error) throw new Error(error.message)
}

export async function fetchAdminPedidosYaPromo() {
  const { data, error } = await supabase
    .from("pedidosya_promos")
    .select("id, title, description, image_path, cta_label, cta_url, points, is_active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const promo = data as AdminPedidosYaPromoRow
  return {
    id: promo.id,
    title: promo.title,
    description: promo.description,
    imagePath: resolveMediaPath(promo.image_path, "novedades"),
    ctaLabel: promo.cta_label,
    ctaUrl: promo.cta_url,
    points: promo.points || [],
    isActive: promo.is_active,
  }
}

export async function updatePedidosYaPromo(
  id: string,
  patch: Partial<{
    title: string
    description: string
    imagePath: string
    ctaLabel: string
    ctaUrl: string
    points: string[]
    isActive: boolean
  }>,
) {
  const payload: Record<string, string | string[] | boolean> = {}
  if ("title" in patch && patch.title !== undefined) payload.title = patch.title
  if ("description" in patch && patch.description !== undefined) payload.description = patch.description
  if ("imagePath" in patch && patch.imagePath !== undefined) payload.image_path = patch.imagePath
  if ("ctaLabel" in patch && patch.ctaLabel !== undefined) payload.cta_label = patch.ctaLabel
  if ("ctaUrl" in patch && patch.ctaUrl !== undefined) payload.cta_url = patch.ctaUrl
  if ("points" in patch && patch.points !== undefined) payload.points = patch.points
  if ("isActive" in patch && patch.isActive !== undefined) payload.is_active = patch.isActive

  const { error } = await supabase.from("pedidosya_promos").update(payload).eq("id", id)
  if (error) throw new Error(error.message)
}

export async function fetchAdminPricingRules() {
  const { data, error } = await supabase
    .from("booking_duration_prices")
    .select("id, label, duration_minutes, person_count, price, sort_order, is_active")
    .order("sort_order", { ascending: true })

  if (error) throw new Error(error.message)

  return ((data || []) as AdminPricingRuleRow[]).map((item) => ({
    id: item.id,
    label: item.label,
    durationMinutes: item.duration_minutes,
    personCount: item.person_count,
    price: Number(item.price),
    sortOrder: item.sort_order,
    isActive: item.is_active,
  }))
}

export async function updatePricingRule(
  id: string,
  patch: Partial<{
    label: string
    durationMinutes: number
    personCount: number
    price: number
    sortOrder: number
    isActive: boolean
  }>,
) {
  const payload: Record<string, string | number | boolean> = {}
  if ("label" in patch && patch.label !== undefined) payload.label = patch.label
  if ("durationMinutes" in patch && patch.durationMinutes !== undefined) {
    payload.duration_minutes = patch.durationMinutes
  }
  if ("personCount" in patch && patch.personCount !== undefined) {
    payload.person_count = patch.personCount
  }
  if ("price" in patch && patch.price !== undefined) payload.price = patch.price
  if ("sortOrder" in patch && patch.sortOrder !== undefined) payload.sort_order = patch.sortOrder
  if ("isActive" in patch && patch.isActive !== undefined) payload.is_active = patch.isActive

  const { error } = await supabase.from("booking_duration_prices").update(payload).eq("id", id)
  if (error) throw new Error(error.message)
}
