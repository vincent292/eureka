import { resolveMediaPath } from "./contentService"
import { supabase } from "./supabaseClient"

export type PaymentType = "deposit_50" | "total"

export interface PaymentQr {
  id: string
  label: string
  imagePath: string
  instructions: string | null
}

export interface BookingDurationPrice {
  id: string
  label: string
  durationMinutes: number
  personCount: number
  price: number
}

export interface CreateBookingInput {
  fullName: string
  phone: string
  nationalId: string
  date: string
  time: string
  durationMinutes: number
  pricingRuleId: string
  paymentQrId: string | null
  partySize: number
  paymentReference?: string
  discountCode?: string
  paymentProof: File
}

export interface CreateBookingResult {
  bookingId: string
  reservationCode: string
  totalAmount: number
  discountAmount: number
  amountDue: number
  expiresAt: string
  message: string
  paymentProofPath: string
}

export interface DiscountValidationResult {
  code: string
  subtotal: number
  discountAmount: number
  total: number
  message: string
}

type PaymentQrRow = {
  id: string
  label: string
  image_path: string
  instructions: string | null
}

type BookingDurationPriceRow = {
  id: string
  label: string
  duration_minutes: number
  person_count: number
  price: number
}

type BookingRpcRow = {
  booking_id: string
  reservation_code: string
  total_amount: number
  discount_amount: number
  amount_due: number
  expires_at: string
}

type DiscountRpcRow = {
  code: string
  subtotal: number
  discount_amount: number
  total: number
  message: string
}

const sanitizeFileName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]/g, "_")
    .replace(/_+/g, "_")

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

const uploadPaymentProof = async (file: File) => {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Solo se permiten comprobantes JPG, PNG o WEBP.")
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("El comprobante debe pesar 5 MB o menos.")
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const safeOriginalName = sanitizeFileName(file.name)
  const path = `payment-proofs/reservation-${newId()}-${Date.now()}.${extension}`
  const { error } = await supabase.storage.from("payments").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  })

  if (error) {
    throw new Error(error.message)
  }

  return { path, safeOriginalName }
}

export async function fetchBookingDurationPrices(): Promise<BookingDurationPrice[]> {
  const { data, error } = await supabase
    .from("booking_duration_prices")
    .select("id, label, duration_minutes, person_count, price")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("duration_minutes", { ascending: true })

  if (error) {
    console.warn("No se pudieron cargar los precios de reserva:", error.message)
    return []
  }

  return ((data || []) as BookingDurationPriceRow[]).map((item) => ({
    id: item.id,
    label: item.label,
    durationMinutes: item.duration_minutes,
    personCount: item.person_count,
    price: Number(item.price),
  }))
}

export async function fetchActivePaymentQrs(): Promise<PaymentQr[]> {
  const { data, error } = await supabase
    .from("payment_qrs")
    .select("id, label, image_path, instructions")
    .eq("is_active", true)
    .order("created_at", { ascending: true })

  if (error) {
    console.warn("No se pudieron cargar los QR de pago:", error.message)
    return []
  }

  return ((data || []) as PaymentQrRow[]).map((qr) => ({
    id: qr.id,
    label: qr.label,
    imagePath: resolveMediaPath(qr.image_path, "qr"),
    instructions: qr.instructions,
  }))
}

export async function createBooking(
  input: CreateBookingInput,
): Promise<CreateBookingResult> {
  const uploadedProof = await uploadPaymentProof(input.paymentProof)
  const startsAt = new Date(`${input.date}T${input.time}:00`).toISOString()

  const { data, error } = await supabase.rpc("create_public_booking", {
    p_full_name: input.fullName,
    p_phone: input.phone.replace(/[^\d]/g, ""),
    p_national_id: input.nationalId,
    p_starts_at: startsAt,
    p_duration_minutes: input.durationMinutes,
    p_pricing_rule_id: input.pricingRuleId,
    p_payment_type: "total",
    p_payment_qr_id: input.paymentQrId,
    p_party_size: input.partySize,
    p_payment_reference: input.paymentReference || null,
    p_payment_receipt_path: uploadedProof.path,
    p_discount_code: input.discountCode || null,
    p_payment_receipt_original_name: uploadedProof.safeOriginalName,
    p_payment_receipt_mime_type: input.paymentProof.type,
    p_payment_receipt_size: input.paymentProof.size,
  })

  if (error) {
    await supabase.storage.from("payments").remove([uploadedProof.path])
    throw new Error(error.message)
  }

  const row = (Array.isArray(data) ? data[0] : data) as BookingRpcRow | undefined

  if (!row) {
    await supabase.storage.from("payments").remove([uploadedProof.path])
    throw new Error("No se pudo crear la reserva.")
  }

  return {
    bookingId: row.booking_id,
    reservationCode: row.reservation_code,
    totalAmount: Number(row.total_amount),
    discountAmount: Number(row.discount_amount || 0),
    amountDue: Number(row.amount_due),
    expiresAt: row.expires_at,
    message:
      "Tu reserva fue registrada correctamente. Esta pendiente de verificacion del pago. Te enviaremos la confirmacion por WhatsApp.",
    paymentProofPath: uploadedProof.path,
  }
}

export async function validateDiscountCode(
  code: string,
  pricingRuleId: string,
): Promise<DiscountValidationResult> {
  const { data, error } = await supabase.rpc("validate_discount_code", {
    p_code: code,
    p_pricing_rule_id: pricingRuleId,
  })

  if (error) {
    throw new Error(error.message)
  }

  const row = (Array.isArray(data) ? data[0] : data) as DiscountRpcRow | undefined

  if (!row) {
    throw new Error("No se pudo validar el descuento.")
  }

  return {
    code: row.code,
    subtotal: Number(row.subtotal),
    discountAmount: Number(row.discount_amount),
    total: Number(row.total),
    message: row.message,
  }
}
