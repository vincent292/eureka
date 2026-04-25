import { resolveMediaPath } from "./contentService"
import { supabase } from "./supabaseClient"

export type AdminBookingStatus =
  | "pending_payment"
  | "pendiente_verificacion"
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
  discountAmount: number
  discountCode: string | null
  packageLabel: string | null
  paymentReference: string | null
  paymentReceiptPath: string | null
  paymentReceiptOriginalName: string | null
  paymentReceiptMimeType: string | null
  paymentReceiptSize: number | null
  proofDeletedAt: string | null
  adminNotes: string | null
  rejectionReason: string | null
  createdAt: string
}

export interface AdminMessageTemplate {
  id: string
  type: "accepted" | "rejected"
  content: string
  active: boolean
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

export interface AdminPaymentQr {
  id: string
  label: string
  imagePath: string
  instructions: string | null
  isActive: boolean
  updatedAt: string
}

export interface AdminPaymentQrHistory {
  id: string
  label: string
  imagePath: string
  instructions: string | null
  changedAt: string
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

export interface AdminDiscountToken {
  id: string
  code: string
  label: string
  discountType: "percent" | "fixed"
  discountValue: number
  maxUses: number
  usedCount: number
  expiresAt: string | null
  isActive: boolean
  createdAt: string
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
  discount_amount: number
  discount_tokens: { code: string } | { code: string }[] | null
  booking_duration_prices: { label: string } | { label: string }[] | null
  payment_reference: string | null
  payment_receipt_path: string | null
  payment_receipt_original_name: string | null
  payment_receipt_mime_type: string | null
  payment_receipt_size: number | null
  proof_deleted_at: string | null
  admin_notes: string | null
  rejection_reason: string | null
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

type AdminPaymentQrRow = {
  id: string
  label: string
  image_path: string
  instructions: string | null
  is_active: boolean
  updated_at: string
}

type AdminPaymentQrHistoryRow = {
  id: string
  label: string
  image_path: string
  instructions: string | null
  changed_at: string
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

type AdminDiscountTokenRow = {
  id: string
  code: string
  label: string
  discount_type: "percent" | "fixed"
  discount_value: number
  max_uses: number
  used_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

const toStoragePath = (path: string, bucket: string) => {
  const marker = `/storage/v1/object/public/${bucket}/`
  const markerIndex = path.indexOf(marker)

  if (markerIndex >= 0) {
    return decodeURIComponent(path.slice(markerIndex + marker.length))
  }

  const localPrefix = `/image/${bucket}/`
  if (path.startsWith(localPrefix)) {
    return path.slice(localPrefix.length)
  }

  return path.replace(/^\/+/, "")
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

const firstRelation = <T>(value: T | T[] | null | undefined) =>
  Array.isArray(value) ? value[0] : value

export async function fetchAdminBookings(date?: string) {
  let query = supabase
    .from("bookings")
    .select(
      "id, reservation_code, full_name, phone, national_id, duration_minutes, party_size, starts_at, ends_at, status, payment_type, total_amount, amount_due, discount_amount, payment_reference, payment_receipt_path, payment_receipt_original_name, payment_receipt_mime_type, payment_receipt_size, proof_deleted_at, admin_notes, rejection_reason, created_at, discount_tokens(code), booking_duration_prices(label)",
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

  return ((data || []) as unknown as AdminBookingRow[]).map((booking) => ({
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
    discountAmount: Number(booking.discount_amount || 0),
    discountCode: firstRelation(booking.discount_tokens)?.code || null,
    packageLabel: firstRelation(booking.booking_duration_prices)?.label || null,
    paymentReference: booking.payment_reference,
    paymentReceiptPath: booking.payment_receipt_path
      ? resolveMediaPath(booking.payment_receipt_path, "payments")
      : null,
    paymentReceiptOriginalName: booking.payment_receipt_original_name,
    paymentReceiptMimeType: booking.payment_receipt_mime_type,
    paymentReceiptSize: booking.payment_receipt_size,
    proofDeletedAt: booking.proof_deleted_at,
    adminNotes: booking.admin_notes,
    rejectionReason: booking.rejection_reason,
    createdAt: booking.created_at,
  }))
}

export async function updateBookingStatus(
  id: string,
  status: AdminBookingStatus,
  adminNotes?: string,
  rejectionReason?: string,
) {
  const patch: { status: AdminBookingStatus; admin_notes?: string; rejection_reason?: string; confirmed_at?: string | null; rejected_at?: string | null } = {
    status,
  }

  if (typeof adminNotes === "string") {
    patch.admin_notes = adminNotes
  }

  if (typeof rejectionReason === "string") {
    patch.rejection_reason = rejectionReason
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

export async function updateBookingSchedule(
  id: string,
  startsAt: string,
  adminNotes = "Reserva reagendada desde el calendario admin.",
) {
  const { error } = await supabase
    .from("bookings")
    .update({
      starts_at: startsAt,
      admin_notes: adminNotes,
    })
    .eq("id", id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function fetchMessageTemplates() {
  const { data, error } = await supabase
    .from("message_templates")
    .select("id, type, content, active")
    .order("type", { ascending: true })

  if (error) throw new Error(error.message)
  return (data || []) as AdminMessageTemplate[]
}

export async function updateMessageTemplate(
  id: string,
  patch: Partial<AdminMessageTemplate>,
) {
  const { error } = await supabase
    .from("message_templates")
    .update({
      content: patch.content,
      active: patch.active,
    })
    .eq("id", id)

  if (error) throw new Error(error.message)
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
  if ("imagePath" in patch) payload.image_path = toStoragePath(patch.imagePath ?? "", "hero")
  if ("altText" in patch) payload.alt_text = patch.altText ?? ""
  if ("sortOrder" in patch) payload.sort_order = patch.sortOrder ?? 0
  if ("isActive" in patch) payload.is_active = patch.isActive ?? true

  const { error } = await supabase.from("hero_slides").update(payload).eq("id", id)
  if (error) throw new Error(error.message)
}

export async function createHeroSlide() {
  const { data: maxRows, error: maxError } = await supabase
    .from("hero_slides")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)

  if (maxError) throw new Error(maxError.message)

  const nextOrder = Number(maxRows?.[0]?.sort_order || 0) + 1
  const { error } = await supabase.from("hero_slides").insert({
    image_path: "hero1.webp",
    alt_text: "Nuevo slide Eureka",
    sort_order: nextOrder,
    is_active: true,
  })

  if (error) throw new Error(error.message)
}

export async function deleteHeroSlide(id: string) {
  const { error } = await supabase.from("hero_slides").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

export async function reorderHeroSlides(slides: AdminHeroSlide[]) {
  await Promise.all(
    slides.map((slide, index) =>
      updateHeroSlide(slide.id, { sortOrder: index + 1 }),
    ),
  )
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
  if ("imagePath" in patch) payload.image_path = toStoragePath(patch.imagePath ?? "", "novedades")
  if ("badge" in patch) payload.badge = patch.badge ?? ""
  if ("sortOrder" in patch) payload.sort_order = patch.sortOrder ?? 0
  if ("isActive" in patch) payload.is_active = patch.isActive ?? true

  const { error } = await supabase.from("novelty_items").update(payload).eq("id", id)
  if (error) throw new Error(error.message)
}

export async function createNoveltyItem() {
  const { data: maxRows, error: maxError } = await supabase
    .from("novelty_items")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)

  if (maxError) throw new Error(maxError.message)

  const nextOrder = Number(maxRows?.[0]?.sort_order || 0) + 1
  const { error } = await supabase.from("novelty_items").insert({
    title: "Nueva novedad",
    description: "Describe la promo o producto.",
    price: null,
    image_path: "novedad1.png",
    badge: "Nuevo",
    sort_order: nextOrder,
    is_active: true,
  })

  if (error) throw new Error(error.message)
}

export async function deleteNoveltyItem(id: string) {
  const { error } = await supabase.from("novelty_items").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

export async function reorderNoveltyItems(items: AdminNoveltyItem[]) {
  await Promise.all(
    items.map((item, index) =>
      updateNoveltyItem(item.id, { sortOrder: index + 1 }),
    ),
  )
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
  if ("imagePath" in patch && patch.imagePath !== undefined) {
    payload.image_path = toStoragePath(patch.imagePath, "novedades")
  }
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

export async function fetchAdminPaymentQrs() {
  const { data, error } = await supabase
    .from("payment_qrs")
    .select("id, label, image_path, instructions, is_active, updated_at")
    .order("updated_at", { ascending: false })

  if (error) throw new Error(error.message)

  return ((data || []) as AdminPaymentQrRow[]).map((qr) => ({
    id: qr.id,
    label: qr.label,
    imagePath: resolveMediaPath(qr.image_path, "qr"),
    instructions: qr.instructions,
    isActive: qr.is_active,
    updatedAt: qr.updated_at,
  }))
}

export async function fetchAdminPaymentQrHistory() {
  const { data, error } = await supabase
    .from("payment_qr_history")
    .select("id, label, image_path, instructions, changed_at")
    .order("changed_at", { ascending: false })
    .limit(12)

  if (error) return []

  return ((data || []) as AdminPaymentQrHistoryRow[]).map((qr) => ({
    id: qr.id,
    label: qr.label,
    imagePath: resolveMediaPath(qr.image_path, "qr"),
    instructions: qr.instructions,
    changedAt: qr.changed_at,
  }))
}

export async function updatePaymentQrProtected(
  qr: AdminPaymentQr,
  secret: string,
) {
  const { error } = await supabase.rpc("update_payment_qr_protected", {
    p_payment_qr_id: qr.id,
    p_label: qr.label,
    p_image_path: toStoragePath(qr.imagePath, "qr"),
    p_instructions: qr.instructions || "",
    p_is_active: qr.isActive,
    p_secret: secret,
  })

  if (error) throw new Error(error.message)
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

export async function createPricingRule() {
  const { data: maxRows, error: maxError } = await supabase
    .from("booking_duration_prices")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)

  if (maxError) throw new Error(maxError.message)

  const nextOrder = Number(maxRows?.[0]?.sort_order || 0) + 1
  const { error } = await supabase.from("booking_duration_prices").insert({
    label: "Promo nueva",
    duration_minutes: 60,
    person_count: 1,
    price: 30,
    sort_order: nextOrder,
    is_active: true,
  })

  if (error) throw new Error(error.message)
}

export async function deletePricingRule(id: string) {
  const { error } = await supabase.from("booking_duration_prices").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

export async function fetchAdminDiscountTokens() {
  const { data, error } = await supabase
    .from("discount_tokens")
    .select("id, code, label, discount_type, discount_value, max_uses, used_count, expires_at, is_active, created_at")
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)

  return ((data || []) as AdminDiscountTokenRow[]).map((token) => ({
    id: token.id,
    code: token.code,
    label: token.label,
    discountType: token.discount_type,
    discountValue: Number(token.discount_value),
    maxUses: token.max_uses,
    usedCount: token.used_count,
    expiresAt: token.expires_at,
    isActive: token.is_active,
    createdAt: token.created_at,
  }))
}

export async function createDiscountToken(input?: Partial<AdminDiscountToken>) {
  const code = (input?.code || `EUREKA-${newId().slice(0, 8)}`).toUpperCase()
  const { data, error } = await supabase
    .from("discount_tokens")
    .insert({
      code,
      label: input?.label || "Descuento unico",
      discount_type: input?.discountType || "percent",
      discount_value: input?.discountValue ?? 10,
      max_uses: input?.maxUses ?? 1,
      expires_at: input?.expiresAt || null,
      is_active: input?.isActive ?? true,
    })
    .select("id, code, label, discount_type, discount_value, max_uses, used_count, expires_at, is_active, created_at")
    .single()

  if (error) throw new Error(error.message)

  return {
    id: data.id,
    code: data.code,
    label: data.label,
    discountType: data.discount_type,
    discountValue: Number(data.discount_value),
    maxUses: data.max_uses,
    usedCount: data.used_count,
    expiresAt: data.expires_at,
    isActive: data.is_active,
    createdAt: data.created_at,
  } satisfies AdminDiscountToken
}

export async function updateDiscountToken(
  id: string,
  patch: Partial<AdminDiscountToken>,
) {
  const payload: Record<string, string | number | boolean | null> = {}
  if ("code" in patch && patch.code !== undefined) payload.code = patch.code.toUpperCase()
  if ("label" in patch && patch.label !== undefined) payload.label = patch.label
  if ("discountType" in patch && patch.discountType !== undefined) {
    payload.discount_type = patch.discountType
  }
  if ("discountValue" in patch && patch.discountValue !== undefined) {
    payload.discount_value = patch.discountValue
  }
  if ("maxUses" in patch && patch.maxUses !== undefined) payload.max_uses = patch.maxUses
  if ("expiresAt" in patch) payload.expires_at = patch.expiresAt || null
  if ("isActive" in patch && patch.isActive !== undefined) payload.is_active = patch.isActive

  const { error } = await supabase.from("discount_tokens").update(payload).eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deleteDiscountToken(id: string) {
  const { error } = await supabase.from("discount_tokens").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

export async function uploadAdminImage(bucket: "hero" | "novedades" | "qr", file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Solo se admiten imagenes.")
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("La imagen debe pesar 5 MB o menos.")
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "webp"
  const path = `admin/${Date.now()}-${newId()}.${extension}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  })

  if (error) throw new Error(error.message)

  return toStoragePath(path, bucket)
}
