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
  startsAt: string
  durationMinutes: number
  paymentType: PaymentType
  paymentQrId: string | null
  partySize: number
  paymentReference?: string
}

export interface CreateBookingResult {
  bookingId: string
  reservationCode: string
  amountDue: number
  expiresAt: string
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
  amount_due: number
  expires_at: string
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
  const { data, error } = await supabase.rpc("create_public_booking", {
    p_full_name: input.fullName,
    p_phone: input.phone,
    p_national_id: input.nationalId,
    p_starts_at: input.startsAt,
    p_duration_minutes: input.durationMinutes,
    p_payment_type: input.paymentType,
    p_payment_qr_id: input.paymentQrId,
    p_party_size: input.partySize,
    p_payment_reference: input.paymentReference || null,
    p_payment_receipt_path: null,
  })

  if (error) {
    throw new Error(error.message)
  }

  const row = (Array.isArray(data) ? data[0] : data) as BookingRpcRow | undefined

  if (!row) {
    throw new Error("No se pudo crear la reserva.")
  }

  return {
    bookingId: row.booking_id,
    reservationCode: row.reservation_code,
    amountDue: Number(row.amount_due),
    expiresAt: row.expires_at,
  }
}
