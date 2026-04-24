import { useEffect, useMemo, useState } from "react"
import type { FormEvent } from "react"
import {
  createBooking,
  fetchBookingDurationPrices,
  fetchActivePaymentQrs,
  type BookingDurationPrice,
  type PaymentQr,
  type PaymentType,
} from "../lib/bookingService"
import "../styles/Booking.css"

const today = new Date().toISOString().slice(0, 10)
const fallbackDurations: BookingDurationPrice[] = [
  {
    id: "duration-60-1",
    label: "1 hora / 1 persona",
    durationMinutes: 60,
    personCount: 1,
    price: 30,
  },
  {
    id: "duration-60-2",
    label: "1 hora / 2 personas",
    durationMinutes: 60,
    personCount: 2,
    price: 50,
  },
  {
    id: "duration-180-1",
    label: "3 horas / 1 persona",
    durationMinutes: 180,
    personCount: 1,
    price: 40,
  },
  {
    id: "duration-180-2",
    label: "3 horas / 2 personas",
    durationMinutes: 180,
    personCount: 2,
    price: 70,
  },
]

export default function Booking() {
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [nationalId, setNationalId] = useState("")
  const [date, setDate] = useState(today)
  const [time, setTime] = useState("17:00")
  const [durationPrices, setDurationPrices] = useState(fallbackDurations)
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [paymentType, setPaymentType] = useState<PaymentType>("deposit_50")
  const [partySize, setPartySize] = useState(1)
  const [paymentReference, setPaymentReference] = useState("")
  const [paymentQrs, setPaymentQrs] = useState<PaymentQr[]>([])
  const [selectedQrId, setSelectedQrId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [reservationCode, setReservationCode] = useState("")

  useEffect(() => {
    let isMounted = true

    Promise.all([fetchActivePaymentQrs(), fetchBookingDurationPrices()]).then(([qrs, prices]) => {
      if (!isMounted) {
        return
      }

      setPaymentQrs(qrs)
      setSelectedQrId(qrs[0]?.id || null)
      if (prices.length > 0) {
        setDurationPrices(prices)
        setDurationMinutes(prices[0].durationMinutes)
        setPartySize(prices[0].personCount)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  const selectedQr = paymentQrs.find((qr) => qr.id === selectedQrId) || null
  const selectedDuration = durationPrices.find(
    (item) => item.durationMinutes === durationMinutes && item.personCount === partySize,
  )
  const totalAmount = selectedDuration?.price || 0
  const amountDue = useMemo(
    () => (paymentType === "deposit_50" ? totalAmount * 0.5 : totalAmount),
    [paymentType, totalAmount],
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage("")
    setReservationCode("")

    try {
      const startsAt = new Date(`${date}T${time}:00`).toISOString()
      const result = await createBooking({
        fullName,
        phone,
        nationalId,
        startsAt,
        durationMinutes,
        paymentType,
        paymentQrId: selectedQrId,
        partySize,
        paymentReference,
      })

      setReservationCode(result.reservationCode)
      setMessage(
        `Reserva creada. Debes pagar Bs ${result.amountDue.toFixed(
          2,
        )} antes de ${new Date(result.expiresAt).toLocaleTimeString()}.`,
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear la reserva.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="booking-page">
      <section className="booking-shell">
        <div className="booking-copy">
          <span className="booking-eyebrow">Reservas Eureka</span>
          <h1>Elige tu horario y asegura tu partida</h1>
          <p>
            Las reservas usan las opciones configuradas por administracion. Cada horario
            permite hasta 3 reservas en paralelo y queda pendiente mientras se
            verifica el pago.
          </p>
        </div>

        <form className="booking-form" onSubmit={handleSubmit}>
          <div className="booking-grid">
            <label>
              Nombre completo
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </label>

            <label>
              Telefono WhatsApp
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="tel"
                required
              />
            </label>

            <label>
              Carnet
              <input
                value={nationalId}
                onChange={(event) => setNationalId(event.target.value)}
                required
              />
            </label>

            <label>
              Fecha
              <input
                type="date"
                min={today}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </label>

            <label>
              Hora
              <input
                type="time"
                step="1800"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                required
              />
            </label>
          </div>

          <div className="booking-segment booking-segment--auto">
            {durationPrices.map((duration) => (
              <button
                key={duration.id}
                type="button"
                className={
                  durationMinutes === duration.durationMinutes &&
                  partySize === duration.personCount
                    ? "active"
                    : ""
                }
                onClick={() => {
                  setDurationMinutes(duration.durationMinutes)
                  setPartySize(duration.personCount)
                }}
              >
                {duration.label}
                <span>Bs {duration.price.toFixed(2)}</span>
              </button>
            ))}
          </div>

          <div className="booking-payment">
            <div className="booking-total">
              <span>Total</span>
              <strong>Bs {totalAmount.toFixed(2)}</strong>
            </div>

            <div className="booking-segment">
              <button
                type="button"
                className={paymentType === "deposit_50" ? "active" : ""}
                onClick={() => setPaymentType("deposit_50")}
              >
                50%
              </button>
              <button
                type="button"
                className={paymentType === "total" ? "active" : ""}
                onClick={() => setPaymentType("total")}
              >
                Total
              </button>
            </div>
          </div>

          {selectedQr ? (
            <div className="booking-qr">
              <img src={selectedQr.imagePath} alt={selectedQr.label} />
              <div>
                <strong>{selectedQr.label}</strong>
                <span>Pago requerido: Bs {amountDue.toFixed(2)}</span>
                {selectedQr.instructions ? <p>{selectedQr.instructions}</p> : null}
              </div>
            </div>
          ) : (
            <p className="booking-warning">
              Aun no hay QR activo cargado en Supabase. La reserva se puede crear,
              pero falta configurar el QR de pago.
            </p>
          )}

          <label>
            Referencia de pago
            <input
              value={paymentReference}
              onChange={(event) => setPaymentReference(event.target.value)}
              placeholder="Numero de comprobante o nota"
            />
          </label>

          <button className="booking-submit" type="submit" disabled={submitting}>
            {submitting ? "Creando reserva..." : "Reservar horario"}
          </button>

          {message ? (
            <div className="booking-result">
              <p>{message}</p>
              {reservationCode ? <strong>Codigo: {reservationCode}</strong> : null}
            </div>
          ) : null}
        </form>
      </section>
    </main>
  )
}
