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
  expiresAt: string | null
  updatedAt: string
}

export type ProtectedPaymentQrInput = Omit<AdminPaymentQr, "id" | "updatedAt"> & {
  id: string | null
  updatedAt?: string
}

export interface AdminPaymentQrHistory {
  id: string
  label: string
  imagePath: string
  instructions: string | null
  expiresAt: string | null
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

export interface AdminProductCategory {
  id: string
  name: string
  slug: string
  description: string | null
  imagePath: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
}

export interface AdminProduct {
  id: string
  categoryId: string
  name: string
  slug: string
  description: string | null
  basePrice: number
  imagePath: string | null
  productType: "simple" | "combo"
  isActive: boolean
  isFeatured: boolean
  sortOrder: number
  createdAt: string
  variants: AdminProductVariant[]
  optionGroups: AdminProductOptionGroup[]
}

export interface AdminProductVariant {
  id: string
  productId: string
  name: string
  description: string | null
  price: number
  sortOrder: number
  isActive: boolean
}

export interface AdminProductOptionGroup {
  id: string
  productId: string
  name: string
  isRequired: boolean
  selectionType: "single" | "multiple"
  minSelect: number
  maxSelect: number
  sortOrder: number
  isActive: boolean
  options: AdminProductOption[]
}

export interface AdminProductOption {
  id: string
  optionGroupId: string
  name: string
  extraPrice: number
  sortOrder: number
  isActive: boolean
}

export interface AdminRestaurantTable {
  id: string
  tableNumber: number
  tableName: string | null
  tableCode: string
  qrUrl: string | null
  qrImagePath: string | null
  isActive: boolean
  createdAt: string
}

export type AdminOrderStatus =
  | "new"
  | "pending_review"
  | "accepted"
  | "preparing"
  | "ready"
  | "delivered"
  | "rejected"
  | "cancelled"

export type AdminPaymentStatus = "pending" | "paid" | "rejected" | "cash_pending"

export interface AdminLiveOrder {
  id: string
  orderCode: string
  tableId: string
  tableNumber: number | null
  tableName: string | null
  customerName: string
  customerPhone: string
  paymentMethod: "qr" | "cash"
  paymentStatus: AdminPaymentStatus
  orderStatus: AdminOrderStatus
  subtotal: number
  total: number
  rejectionReason: string | null
  acceptedAt: string | null
  rejectedAt: string | null
  preparedAt: string | null
  deliveredAt: string | null
  createdAt: string
  items: AdminLiveOrderItem[]
  receipts: AdminOrderReceipt[]
}

export interface AdminLiveOrderItem {
  id: string
  productName: string
  variantName: string | null
  quantity: number
  unitPrice: number
  notes: string | null
  totalPrice: number
  options: AdminLiveOrderItemOption[]
}

export interface AdminLiveOrderItemOption {
  id: string
  groupName: string
  optionName: string
  extraPrice: number
}

export interface AdminOrderReceipt {
  id: string
  imagePath: string
  createdAt: string
  expiresAt: string
  isDeleted: boolean
}

export interface AdminAuditLog {
  id: string
  actorEmail: string | null
  action: string
  entityType: string
  entityId: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface SuperAdminOverview {
  orders: {
    total: number
    pending: number
    accepted: number
    rejected: number
  }
  bookings: {
    total: number
    today: number
    past: number
    pending: number
  }
  paymentQrs: {
    total: number
    active: number
    history: number
  }
  catalog: {
    products: number
    activeProducts: number
    categories: number
  }
  tables: {
    total: number
    active: number
  }
  auditLogs: {
    total: number
    latest: AdminAuditLog[]
  }
}

export type SuperAdminBulkAction =
  | "delete_all_orders"
  | "delete_rejected_orders"
  | "delete_all_bookings"
  | "delete_past_bookings"
  | "reset_payment_qr"
  | "delete_catalog"
  | "delete_tables"
  | "cleanup_old_receipts"

export type SuperAdminEntityType =
  | "order"
  | "booking"
  | "payment_qr"
  | "product"
  | "product_category"
  | "restaurant_table"

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
  expires_at: string | null
  updated_at: string
}

type AdminPaymentQrHistoryRow = {
  id: string
  label: string
  image_path: string
  instructions: string | null
  expires_at: string | null
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

type AdminProductCategoryRow = {
  id: string
  name: string
  slug: string
  description: string | null
  image_path: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

type AdminProductRow = {
  id: string
  category_id: string
  name: string
  slug: string
  description: string | null
  base_price: number
  image_path: string | null
  product_type: "simple" | "combo"
  is_active: boolean
  is_featured: boolean
  sort_order: number
  created_at: string
}

type AdminProductVariantRow = {
  id: string
  product_id: string
  name: string
  description: string | null
  price: number
  sort_order: number
  is_active: boolean
}

type AdminProductOptionGroupRow = {
  id: string
  product_id: string
  name: string
  is_required: boolean
  selection_type: "single" | "multiple"
  min_select: number
  max_select: number
  sort_order: number
  is_active: boolean
}

type AdminProductOptionRow = {
  id: string
  option_group_id: string
  name: string
  extra_price: number
  sort_order: number
  is_active: boolean
}

type AdminRestaurantTableRow = {
  id: string
  table_number: number
  table_name: string | null
  table_code: string
  qr_url: string | null
  qr_image_path: string | null
  is_active: boolean
  created_at: string
}

type AdminOrderRow = {
  id: string
  order_code: string
  table_id: string
  customer_name: string
  customer_phone: string
  payment_method: "qr" | "cash"
  payment_status: AdminPaymentStatus
  order_status: AdminOrderStatus
  subtotal: number
  total: number
  rejection_reason: string | null
  accepted_at: string | null
  rejected_at: string | null
  prepared_at: string | null
  delivered_at: string | null
  created_at: string
  restaurant_tables?: { table_number: number; table_name: string | null } | { table_number: number; table_name: string | null }[] | null
}

type AdminOrderItemRow = {
  id: string
  order_id: string
  product_name_snapshot: string
  variant_name_snapshot: string | null
  quantity: number
  unit_price: number
  notes: string | null
  total_price: number
}

type AdminOrderItemOptionRow = {
  id: string
  order_item_id: string
  option_group_name_snapshot: string
  option_name_snapshot: string
  extra_price: number
}

type AdminOrderReceiptRow = {
  id: string
  order_id: string
  image_path: string
  created_at: string
  expires_at: string
  is_deleted: boolean
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

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || newId().slice(0, 8)

const laPazDateRangeToUtc = (date: string) => {
  const [year, month, day] = date.split("-").map(Number)
  const start = new Date(Date.UTC(year, month - 1, day, 4, 0, 0, 0))
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  end.setUTCMilliseconds(end.getUTCMilliseconds() - 1)

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

export async function fetchAdminBookings(date?: string) {
  let query = supabase
    .from("bookings")
    .select(
      "id, reservation_code, full_name, phone, national_id, duration_minutes, party_size, starts_at, ends_at, status, payment_type, total_amount, amount_due, discount_amount, payment_reference, payment_receipt_path, payment_receipt_original_name, payment_receipt_mime_type, payment_receipt_size, proof_deleted_at, admin_notes, rejection_reason, created_at, discount_tokens(code), booking_duration_prices(label)",
    )
    .order("starts_at", { ascending: true })

  if (date) {
    const { start, end } = laPazDateRangeToUtc(date)
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
    .select("id, label, image_path, instructions, is_active, expires_at, updated_at")
    .order("updated_at", { ascending: false })

  if (error) throw new Error(error.message)

  return ((data || []) as AdminPaymentQrRow[]).map((qr) => ({
    id: qr.id,
    label: qr.label,
    imagePath: resolveMediaPath(qr.image_path, "qr"),
    instructions: qr.instructions,
    isActive: qr.is_active,
    expiresAt: qr.expires_at,
    updatedAt: qr.updated_at,
  }))
}

export async function fetchAdminPaymentQrHistory() {
  const { data, error } = await supabase
    .from("payment_qr_history")
    .select("id, label, image_path, instructions, expires_at, changed_at")
    .order("changed_at", { ascending: false })
    .limit(12)

  if (error) return []

  return ((data || []) as AdminPaymentQrHistoryRow[]).map((qr) => ({
    id: qr.id,
    label: qr.label,
    imagePath: resolveMediaPath(qr.image_path, "qr"),
    instructions: qr.instructions,
    expiresAt: qr.expires_at,
    changedAt: qr.changed_at,
  }))
}

export async function updatePaymentQrProtected(
  qr: ProtectedPaymentQrInput,
  secret: string,
) {
  const { error } = await supabase.rpc("update_payment_qr_protected", {
    p_payment_qr_id: qr.id,
    p_label: qr.label,
    p_image_path: toStoragePath(qr.imagePath, "qr"),
    p_instructions: qr.instructions || "",
    p_is_active: qr.isActive,
    p_expires_at: qr.expiresAt || null,
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

export async function fetchAdminProductCategories() {
  const { data, error } = await supabase
    .from("product_categories")
    .select("id, name, slug, description, image_path, sort_order, is_active, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) throw new Error(error.message)

  return ((data || []) as AdminProductCategoryRow[]).map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    imagePath: category.image_path ? resolveMediaPath(category.image_path, "products") : null,
    sortOrder: category.sort_order,
    isActive: category.is_active,
    createdAt: category.created_at,
  }))
}

export async function fetchAdminProducts() {
  const [productsResult, variantsResult, groupsResult, optionsResult] = await Promise.all([
    supabase
      .from("products")
      .select("id, category_id, name, slug, description, base_price, image_path, product_type, is_active, is_featured, sort_order, created_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("product_variants")
      .select("id, product_id, name, description, price, sort_order, is_active")
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_option_groups")
      .select("id, product_id, name, is_required, selection_type, min_select, max_select, sort_order, is_active")
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_options")
      .select("id, option_group_id, name, extra_price, sort_order, is_active")
      .order("sort_order", { ascending: true }),
  ])

  if (productsResult.error) throw new Error(productsResult.error.message)
  if (variantsResult.error) throw new Error(variantsResult.error.message)
  if (groupsResult.error) throw new Error(groupsResult.error.message)
  if (optionsResult.error) throw new Error(optionsResult.error.message)

  const optionsByGroup = new Map<string, AdminProductOption[]>()
  ;((optionsResult.data || []) as AdminProductOptionRow[]).forEach((option) => {
    const nextOption = {
      id: option.id,
      optionGroupId: option.option_group_id,
      name: option.name,
      extraPrice: Number(option.extra_price),
      sortOrder: option.sort_order,
      isActive: option.is_active,
    }
    optionsByGroup.set(option.option_group_id, [
      ...(optionsByGroup.get(option.option_group_id) || []),
      nextOption,
    ])
  })

  const groupsByProduct = new Map<string, AdminProductOptionGroup[]>()
  ;((groupsResult.data || []) as AdminProductOptionGroupRow[]).forEach((group) => {
    const nextGroup = {
      id: group.id,
      productId: group.product_id,
      name: group.name,
      isRequired: group.is_required,
      selectionType: group.selection_type,
      minSelect: group.min_select,
      maxSelect: group.max_select,
      sortOrder: group.sort_order,
      isActive: group.is_active,
      options: optionsByGroup.get(group.id) || [],
    }
    groupsByProduct.set(group.product_id, [
      ...(groupsByProduct.get(group.product_id) || []),
      nextGroup,
    ])
  })

  const variantsByProduct = new Map<string, AdminProductVariant[]>()
  ;((variantsResult.data || []) as AdminProductVariantRow[]).forEach((variant) => {
    const nextVariant = {
      id: variant.id,
      productId: variant.product_id,
      name: variant.name,
      description: variant.description,
      price: Number(variant.price),
      sortOrder: variant.sort_order,
      isActive: variant.is_active,
    }
    variantsByProduct.set(variant.product_id, [
      ...(variantsByProduct.get(variant.product_id) || []),
      nextVariant,
    ])
  })

  return ((productsResult.data || []) as AdminProductRow[]).map((product) => ({
    id: product.id,
    categoryId: product.category_id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    basePrice: Number(product.base_price),
    imagePath: product.image_path ? resolveMediaPath(product.image_path, "products") : null,
    productType: product.product_type,
    isActive: product.is_active,
    isFeatured: product.is_featured,
    sortOrder: product.sort_order,
    createdAt: product.created_at,
    variants: variantsByProduct.get(product.id) || [],
    optionGroups: groupsByProduct.get(product.id) || [],
  }))
}

export async function createProductCategory(input?: Partial<AdminProductCategory>) {
  const name = input?.name?.trim() || "Nueva categoria"
  const { error } = await supabase.from("product_categories").insert({
    name,
    slug: slugify(input?.slug || name),
    description: input?.description || null,
    image_path: input?.imagePath ? toStoragePath(input.imagePath, "products") : null,
    sort_order: input?.sortOrder ?? 0,
    is_active: input?.isActive ?? true,
  })

  if (error) throw new Error(error.message)
}

export async function updateProductCategory(
  id: string,
  patch: Partial<AdminProductCategory>,
) {
  const payload: Record<string, string | number | boolean | null> = {}
  if ("name" in patch && patch.name !== undefined) {
    payload.name = patch.name
    payload.slug = slugify(patch.slug || patch.name)
  }
  if ("slug" in patch && patch.slug !== undefined) payload.slug = slugify(patch.slug)
  if ("description" in patch) payload.description = patch.description || null
  if ("imagePath" in patch) {
    payload.image_path = patch.imagePath ? toStoragePath(patch.imagePath, "products") : null
  }
  if ("sortOrder" in patch && patch.sortOrder !== undefined) payload.sort_order = patch.sortOrder
  if ("isActive" in patch && patch.isActive !== undefined) payload.is_active = patch.isActive

  const { error } = await supabase.from("product_categories").update(payload).eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deleteProductCategory(id: string) {
  const { count, error: countError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id)

  if (countError) throw new Error(countError.message)
  if ((count || 0) > 0) {
    throw new Error("No se puede eliminar una categoria con productos. Desactivala o mueve sus productos primero.")
  }

  const { error } = await supabase.from("product_categories").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

export async function createProduct(categoryId: string, input?: Partial<AdminProduct>) {
  const name = input?.name?.trim() || "Nuevo producto"
  const { error } = await supabase.from("products").insert({
    category_id: categoryId,
    name,
    slug: slugify(input?.slug || name),
    description: input?.description || null,
    base_price: input?.basePrice ?? 0,
    image_path: input?.imagePath ? toStoragePath(input.imagePath, "products") : null,
    product_type: input?.productType || "simple",
    is_active: input?.isActive ?? true,
    is_featured: input?.isFeatured ?? false,
    sort_order: input?.sortOrder ?? 0,
  })

  if (error) throw new Error(error.message)
}

export async function updateProduct(id: string, patch: Partial<AdminProduct>) {
  const payload: Record<string, string | number | boolean | null> = {}
  if ("categoryId" in patch && patch.categoryId !== undefined) payload.category_id = patch.categoryId
  if ("name" in patch && patch.name !== undefined) {
    payload.name = patch.name
    payload.slug = slugify(patch.slug || patch.name)
  }
  if ("slug" in patch && patch.slug !== undefined) payload.slug = slugify(patch.slug)
  if ("description" in patch) payload.description = patch.description || null
  if ("basePrice" in patch && patch.basePrice !== undefined) payload.base_price = patch.basePrice
  if ("imagePath" in patch) {
    payload.image_path = patch.imagePath ? toStoragePath(patch.imagePath, "products") : null
  }
  if ("productType" in patch && patch.productType !== undefined) payload.product_type = patch.productType
  if ("isActive" in patch && patch.isActive !== undefined) payload.is_active = patch.isActive
  if ("isFeatured" in patch && patch.isFeatured !== undefined) payload.is_featured = patch.isFeatured
  if ("sortOrder" in patch && patch.sortOrder !== undefined) payload.sort_order = patch.sortOrder

  const { error } = await supabase.from("products").update(payload).eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

export async function createProductVariant(productId: string) {
  const { error } = await supabase.from("product_variants").insert({
    product_id: productId,
    name: "Nueva variante",
    price: 0,
    sort_order: 0,
    is_active: true,
  })
  if (error) throw new Error(error.message)
}

export async function updateProductVariant(id: string, patch: Partial<AdminProductVariant>) {
  const payload: Record<string, string | number | boolean | null> = {}
  if ("name" in patch && patch.name !== undefined) payload.name = patch.name
  if ("description" in patch) payload.description = patch.description || null
  if ("price" in patch && patch.price !== undefined) payload.price = patch.price
  if ("sortOrder" in patch && patch.sortOrder !== undefined) payload.sort_order = patch.sortOrder
  if ("isActive" in patch && patch.isActive !== undefined) payload.is_active = patch.isActive

  const { error } = await supabase.from("product_variants").update(payload).eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deleteProductVariant(id: string) {
  const { error } = await supabase.from("product_variants").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

export async function createProductOptionGroup(productId: string) {
  const { error } = await supabase.from("product_option_groups").insert({
    product_id: productId,
    name: "Nuevo grupo",
    selection_type: "single",
    min_select: 0,
    max_select: 1,
    sort_order: 0,
    is_active: true,
  })
  if (error) throw new Error(error.message)
}

export async function updateProductOptionGroup(
  id: string,
  patch: Partial<AdminProductOptionGroup>,
) {
  const payload: Record<string, string | number | boolean> = {}
  if ("name" in patch && patch.name !== undefined) payload.name = patch.name
  if ("isRequired" in patch && patch.isRequired !== undefined) payload.is_required = patch.isRequired
  if ("selectionType" in patch && patch.selectionType !== undefined) payload.selection_type = patch.selectionType
  if ("minSelect" in patch && patch.minSelect !== undefined) payload.min_select = patch.minSelect
  if ("maxSelect" in patch && patch.maxSelect !== undefined) payload.max_select = patch.maxSelect
  if ("sortOrder" in patch && patch.sortOrder !== undefined) payload.sort_order = patch.sortOrder
  if ("isActive" in patch && patch.isActive !== undefined) payload.is_active = patch.isActive

  const { error } = await supabase.from("product_option_groups").update(payload).eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deleteProductOptionGroup(id: string) {
  const { error } = await supabase.from("product_option_groups").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

export async function createProductOption(optionGroupId: string) {
  const { error } = await supabase.from("product_options").insert({
    option_group_id: optionGroupId,
    name: "Nueva opcion",
    extra_price: 0,
    sort_order: 0,
    is_active: true,
  })
  if (error) throw new Error(error.message)
}

export async function updateProductOption(id: string, patch: Partial<AdminProductOption>) {
  const payload: Record<string, string | number | boolean> = {}
  if ("name" in patch && patch.name !== undefined) payload.name = patch.name
  if ("extraPrice" in patch && patch.extraPrice !== undefined) payload.extra_price = patch.extraPrice
  if ("sortOrder" in patch && patch.sortOrder !== undefined) payload.sort_order = patch.sortOrder
  if ("isActive" in patch && patch.isActive !== undefined) payload.is_active = patch.isActive

  const { error } = await supabase.from("product_options").update(payload).eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deleteProductOption(id: string) {
  const { error } = await supabase.from("product_options").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

export async function fetchAdminRestaurantTables() {
  const { data, error } = await supabase
    .from("restaurant_tables")
    .select("id, table_number, table_name, table_code, qr_url, qr_image_path, is_active, created_at")
    .order("table_number", { ascending: true })

  if (error) throw new Error(error.message)

  return ((data || []) as AdminRestaurantTableRow[]).map((table) => ({
    id: table.id,
    tableNumber: table.table_number,
    tableName: table.table_name,
    tableCode: table.table_code,
    qrUrl: table.qr_url,
    qrImagePath: table.qr_image_path,
    isActive: table.is_active,
    createdAt: table.created_at,
  }))
}

const makeTableCode = (tableNumber: number) =>
  `mesa-${tableNumber}-${newId().slice(0, 6).toLowerCase()}`

export async function createRestaurantTable(nextNumber?: number) {
  const tableNumber = nextNumber || 1
  const tableCode = makeTableCode(tableNumber)
  const { error } = await supabase.from("restaurant_tables").insert({
    table_number: tableNumber,
    table_name: `Mesa ${tableNumber}`,
    table_code: tableCode,
    qr_url: `/menu/mesa/${tableCode}`,
    is_active: true,
  })

  if (error) throw new Error(error.message)
}

export async function updateRestaurantTable(id: string, patch: Partial<AdminRestaurantTable>) {
  const payload: Record<string, string | number | boolean | null> = {}
  if ("tableNumber" in patch && patch.tableNumber !== undefined) payload.table_number = patch.tableNumber
  if ("tableName" in patch) payload.table_name = patch.tableName || null
  if ("tableCode" in patch && patch.tableCode !== undefined) {
    payload.table_code = patch.tableCode
    payload.qr_url = `/menu/mesa/${patch.tableCode}`
  }
  if ("qrUrl" in patch) payload.qr_url = patch.qrUrl || null
  if ("qrImagePath" in patch) payload.qr_image_path = patch.qrImagePath || null
  if ("isActive" in patch && patch.isActive !== undefined) payload.is_active = patch.isActive

  const { error } = await supabase.from("restaurant_tables").update(payload).eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deleteRestaurantTable(id: string) {
  const { count, error: countError } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("table_id", id)

  if (countError) throw new Error(countError.message)
  if ((count || 0) > 0) {
    const { error } = await supabase.from("restaurant_tables").update({ is_active: false }).eq("id", id)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await supabase.from("restaurant_tables").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

export async function fetchAdminLiveOrders() {
  const ordersResult = await supabase
    .from("orders")
    .select("id, order_code, table_id, customer_name, customer_phone, payment_method, payment_status, order_status, subtotal, total, rejection_reason, accepted_at, rejected_at, prepared_at, delivered_at, created_at, restaurant_tables(table_number, table_name)")
    .order("created_at", { ascending: false })
    .limit(80)

  if (ordersResult.error) throw new Error(ordersResult.error.message)

  const orders = (ordersResult.data || []) as unknown as AdminOrderRow[]
  const orderIds = orders.map((order) => order.id)
  if (orderIds.length === 0) return []

  const [itemsResult, receiptsResult] = await Promise.all([
    supabase
      .from("order_items")
      .select("id, order_id, product_name_snapshot, variant_name_snapshot, quantity, unit_price, notes, total_price")
      .in("order_id", orderIds),
    supabase
      .from("payment_receipts")
      .select("id, order_id, image_path, created_at, expires_at, is_deleted")
      .in("order_id", orderIds)
      .order("created_at", { ascending: false }),
  ])

  if (itemsResult.error) throw new Error(itemsResult.error.message)
  if (receiptsResult.error) throw new Error(receiptsResult.error.message)

  const items = (itemsResult.data || []) as AdminOrderItemRow[]
  const itemIds = items.map((item) => item.id)
  const optionsResult = itemIds.length > 0
    ? await supabase
        .from("order_item_options")
        .select("id, order_item_id, option_group_name_snapshot, option_name_snapshot, extra_price")
        .in("order_item_id", itemIds)
    : { data: [], error: null }

  if (optionsResult.error) throw new Error(optionsResult.error.message)

  const optionsByItem = new Map<string, AdminLiveOrderItemOption[]>()
  ;((optionsResult.data || []) as AdminOrderItemOptionRow[]).forEach((option) => {
    optionsByItem.set(option.order_item_id, [
      ...(optionsByItem.get(option.order_item_id) || []),
      {
        id: option.id,
        groupName: option.option_group_name_snapshot,
        optionName: option.option_name_snapshot,
        extraPrice: Number(option.extra_price),
      },
    ])
  })

  const itemsByOrder = new Map<string, AdminLiveOrderItem[]>()
  items.forEach((item) => {
    itemsByOrder.set(item.order_id, [
      ...(itemsByOrder.get(item.order_id) || []),
      {
        id: item.id,
        productName: item.product_name_snapshot,
        variantName: item.variant_name_snapshot,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        notes: item.notes,
        totalPrice: Number(item.total_price),
        options: optionsByItem.get(item.id) || [],
      },
    ])
  })

  const receiptsByOrder = new Map<string, AdminOrderReceipt[]>()
  ;((receiptsResult.data || []) as AdminOrderReceiptRow[]).forEach((receipt) => {
    receiptsByOrder.set(receipt.order_id, [
      ...(receiptsByOrder.get(receipt.order_id) || []),
      {
        id: receipt.id,
        imagePath: resolveMediaPath(receipt.image_path, "receipts"),
        createdAt: receipt.created_at,
        expiresAt: receipt.expires_at,
        isDeleted: receipt.is_deleted,
      },
    ])
  })

  return orders.map((order) => {
    const table = firstRelation(order.restaurant_tables)
    return {
      id: order.id,
      orderCode: order.order_code,
      tableId: order.table_id,
      tableNumber: table?.table_number || null,
      tableName: table?.table_name || null,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      orderStatus: order.order_status,
      subtotal: Number(order.subtotal),
      total: Number(order.total),
      rejectionReason: order.rejection_reason,
      acceptedAt: order.accepted_at,
      rejectedAt: order.rejected_at,
      preparedAt: order.prepared_at,
      deliveredAt: order.delivered_at,
      createdAt: order.created_at,
      items: itemsByOrder.get(order.id) || [],
      receipts: receiptsByOrder.get(order.id) || [],
    } satisfies AdminLiveOrder
  })
}

export async function updateLiveOrderStatus(
  orderId: string,
  orderStatus: AdminOrderStatus,
  paymentStatus?: AdminPaymentStatus | null,
  rejectionReason?: string,
) {
  const { error } = await supabase.rpc("update_order_status", {
    p_order_id: orderId,
    p_order_status: orderStatus,
    p_payment_status: paymentStatus || null,
    p_rejection_reason: rejectionReason || null,
  })

  if (error) throw new Error(error.message)
}

export async function cleanupOldOrderReceipts() {
  const { error } = await supabase.rpc("cleanup_old_order_receipts")
  if (error) throw new Error(error.message)
}

export async function fetchSuperAdminOverview(): Promise<SuperAdminOverview> {
  const { data, error } = await supabase.rpc("get_super_admin_overview")
  if (error) throw new Error(error.message)

  const overview = data as SuperAdminOverview | null
  if (!overview) {
    throw new Error("No se pudo cargar el panel Super Admin.")
  }

  return overview
}

const removeStorageObjects = async (bucket: string, paths: Array<string | null>) => {
  const uniquePaths = [...new Set(paths.filter(Boolean).map((path) => toStoragePath(path as string, bucket)))]

  for (let index = 0; index < uniquePaths.length; index += 100) {
    const { error } = await supabase.storage.from(bucket).remove(uniquePaths.slice(index, index + 100))
    if (error) throw new Error(error.message)
  }
}

const deleteOrdersWithStorageApi = async (
  filter: "all" | "rejected" | "single",
  orderId?: string,
) => {
  let orderQuery = supabase
    .from("orders")
    .select("id")

  if (filter === "rejected") {
    orderQuery = orderQuery.eq("order_status", "rejected")
  }

  if (filter === "single" && orderId) {
    orderQuery = orderQuery.eq("id", orderId)
  }

  const { data: orders, error: ordersError } = await orderQuery
  if (ordersError) throw new Error(ordersError.message)

  const orderIds = ((orders || []) as Array<{ id: string }>).map((order) => order.id)
  if (orderIds.length === 0) {
    return { ok: true, affected: 0, deleted: 0, secondary: 0 }
  }

  const receiptPaths: string[] = []
  for (let index = 0; index < orderIds.length; index += 100) {
    const { data: receipts, error: receiptsError } = await supabase
      .from("payment_receipts")
      .select("image_path")
      .in("order_id", orderIds.slice(index, index + 100))

    if (receiptsError) throw new Error(receiptsError.message)
    receiptPaths.push(...((receipts || []) as Array<{ image_path: string }>).map((receipt) => receipt.image_path))
  }

  for (let index = 0; index < orderIds.length; index += 100) {
    const { error: deleteError } = await supabase
      .from("orders")
      .delete()
      .in("id", orderIds.slice(index, index + 100))

    if (deleteError) throw new Error(deleteError.message)
  }

  await removeStorageObjects("receipts", receiptPaths)

  return { ok: true, affected: orderIds.length, deleted: orderIds.length, secondary: receiptPaths.length }
}

const deleteBookingsWithStorageApi = async (
  filter: "all" | "past" | "single",
  bookingId?: string,
) => {
  let query = supabase
    .from("bookings")
    .select("id, payment_receipt_path")

  if (filter === "past") {
    query = query.lt("starts_at", new Date().toISOString())
  }

  if (filter === "single" && bookingId) {
    query = query.eq("id", bookingId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const bookingsToDelete = (data || []) as Array<{ id: string; payment_receipt_path: string | null }>
  await removeStorageObjects("payments", bookingsToDelete.map((booking) => booking.payment_receipt_path))

  const bookingIds = bookingsToDelete.map((booking) => booking.id)
  for (let index = 0; index < bookingIds.length; index += 100) {
    const { error: deleteError } = await supabase
      .from("bookings")
      .delete()
      .in("id", bookingIds.slice(index, index + 100))

    if (deleteError) throw new Error(deleteError.message)
  }

  return { ok: true, affected: bookingIds.length, deleted: bookingIds.length, secondary: 0 }
}

const deletePaymentQrsWithStorageApi = async (paymentQrId?: string) => {
  let qrQuery = supabase
    .from("payment_qrs")
    .select("id, image_path")

  let historyQuery = supabase
    .from("payment_qr_history")
    .select("id, payment_qr_id, image_path")

  if (paymentQrId) {
    qrQuery = qrQuery.eq("id", paymentQrId)
    historyQuery = historyQuery.eq("payment_qr_id", paymentQrId)
  }

  const [qrResult, historyResult] = await Promise.all([qrQuery, historyQuery])

  if (qrResult.error) throw new Error(qrResult.error.message)
  if (historyResult.error) throw new Error(historyResult.error.message)

  const qrsToDelete = (qrResult.data || []) as Array<{ id: string; image_path: string | null }>
  const historyToDelete = (historyResult.data || []) as Array<{ id: string; image_path: string | null }>
  const imagePaths = [
    ...qrsToDelete.map((qr) => qr.image_path),
    ...historyToDelete.map((history) => history.image_path),
  ]

  const historyIds = historyToDelete.map((history) => history.id)
  for (let index = 0; index < historyIds.length; index += 100) {
    const { error } = await supabase
      .from("payment_qr_history")
      .delete()
      .in("id", historyIds.slice(index, index + 100))

    if (error) throw new Error(error.message)
  }

  const qrIds = qrsToDelete.map((qr) => qr.id)
  for (let index = 0; index < qrIds.length; index += 100) {
    const { error } = await supabase
      .from("payment_qrs")
      .delete()
      .in("id", qrIds.slice(index, index + 100))

    if (error) throw new Error(error.message)
  }

  await removeStorageObjects("qr", imagePaths)

  return {
    ok: true,
    affected: qrIds.length,
    deleted: qrIds.length,
    secondary: historyIds.length,
  }
}

export async function runSuperAdminBulkAction(
  action: SuperAdminBulkAction,
  confirmation: string,
) {
  if (action === "delete_all_orders") {
    if (confirmation !== "ELIMINAR PEDIDOS") {
      throw new Error("Debes escribir exactamente: ELIMINAR PEDIDOS")
    }
    return deleteOrdersWithStorageApi("all")
  }

  if (action === "delete_rejected_orders") {
    if (confirmation !== "ELIMINAR RECHAZADOS") {
      throw new Error("Debes escribir exactamente: ELIMINAR RECHAZADOS")
    }
    return deleteOrdersWithStorageApi("rejected")
  }

  if (action === "delete_all_bookings") {
    if (confirmation !== "ELIMINAR RESERVAS") {
      throw new Error("Debes escribir exactamente: ELIMINAR RESERVAS")
    }
    return deleteBookingsWithStorageApi("all")
  }

  if (action === "delete_past_bookings") {
    if (confirmation !== "ELIMINAR RESERVAS PASADAS") {
      throw new Error("Debes escribir exactamente: ELIMINAR RESERVAS PASADAS")
    }
    return deleteBookingsWithStorageApi("past")
  }

  if (action === "reset_payment_qr") {
    return deletePaymentQrsWithStorageApi()
  }

  const { data, error } = await supabase.rpc("super_admin_bulk_action", {
    p_action: action,
    p_confirmation: confirmation,
  })

  if (error) throw new Error(error.message)
  return data as { ok: boolean; affected: number; secondary: number }
}

export async function deleteSuperAdminEntity(
  entityType: SuperAdminEntityType,
  entityId: string,
  confirmation = "",
) {
  if (entityType === "order") {
    return deleteOrdersWithStorageApi("single", entityId)
  }

  if (entityType === "booking") {
    return deleteBookingsWithStorageApi("single", entityId)
  }

  if (entityType === "payment_qr") {
    return deletePaymentQrsWithStorageApi(entityId)
  }

  const { data, error } = await supabase.rpc("super_admin_delete_entity", {
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_confirmation: confirmation || null,
  })

  if (error) throw new Error(error.message)
  return data as { ok: boolean; deleted: number }
}

export async function uploadAdminImage(bucket: "hero" | "novedades" | "qr" | "products", file: File) {
  const allowedImageTypes = ["image/png", "image/jpeg", "image/webp"]

  if (!allowedImageTypes.includes(file.type)) {
    throw new Error("Solo se admiten imagenes PNG, JPG, JPEG o WEBP.")
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("La imagen debe pesar 5 MB o menos.")
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "webp"
  const pathPrefix =
    bucket === "qr" ? "upload/QR" : bucket === "products" ? "uploads/products" : "admin"
  const path = `${pathPrefix}/${Date.now()}-${newId()}.${extension}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  })

  if (error) throw new Error(error.message)

  return toStoragePath(path, bucket)
}
