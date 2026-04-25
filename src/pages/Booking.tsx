import { useEffect, useMemo, useState } from "react"
import type { FormEvent } from "react"
import {
  createBooking,
  fetchActivePaymentQrs,
  fetchBookingDurationPrices,
  validateDiscountCode,
  type BookingDurationPrice,
  type DiscountValidationResult,
  type PaymentQr,
} from "../lib/bookingService"
import "../styles/Booking.css"

const today = new Date().toISOString().slice(0, 10)
const storageKey = "eureka_booking_draft"
const fallbackDurations: BookingDurationPrice[] = [
  { id: "duration-60-1", label: "1 hora / 1 persona", durationMinutes: 60, personCount: 1, price: 30 },
  { id: "duration-60-2", label: "1 hora / 2 personas", durationMinutes: 60, personCount: 2, price: 50 },
  { id: "duration-180-1", label: "3 horas / 1 persona", durationMinutes: 180, personCount: 1, price: 40 },
  { id: "duration-180-2", label: "3 horas / 2 personas", durationMinutes: 180, personCount: 2, price: 70 },
]

type BookingDraft = {
  fullName: string
  phone: string
  nationalId: string
  date: string
  time: string
  pricingRuleId: string
  paymentReference: string
  discountCode: string
  appliedDiscount: DiscountValidationResult | null
}

const initialDraft: BookingDraft = {
  fullName: "",
  phone: "",
  nationalId: "",
  date: today,
  time: "17:00",
  pricingRuleId: "",
  paymentReference: "",
  discountCode: "",
  appliedDiscount: null,
}

const readDraft = () => {
  try {
    return { ...initialDraft, ...JSON.parse(localStorage.getItem(storageKey) || "{}") } as BookingDraft
  } catch {
    return initialDraft
  }
}

export default function Booking() {
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<BookingDraft>(readDraft)
  const [durationPrices, setDurationPrices] = useState(fallbackDurations)
  const [paymentQrs, setPaymentQrs] = useState<PaymentQr[]>([])
  const [selectedQrId, setSelectedQrId] = useState<string | null>(null)
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [discountLoading, setDiscountLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    let isMounted = true

    Promise.all([fetchActivePaymentQrs(), fetchBookingDurationPrices()]).then(([qrs, prices]) => {
      if (!isMounted) return

      setPaymentQrs(qrs)
      setSelectedQrId(qrs[0]?.id || null)
      if (prices.length > 0) {
        setDurationPrices(prices)
        setDraft((current) => ({
          ...current,
          pricingRuleId: current.pricingRuleId || prices[0].id,
        }))
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(draft))
  }, [draft])

  const selectedPackage = durationPrices.find((item) => item.id === draft.pricingRuleId) || durationPrices[0]
  const selectedQr = paymentQrs.find((qr) => qr.id === selectedQrId) || null
  const subtotal = selectedPackage?.price || 0
  const discountAmount = draft.appliedDiscount?.discountAmount || 0
  const total = draft.appliedDiscount?.total ?? subtotal

  const canContinueFromStepOne = draft.fullName.trim() && draft.phone.replace(/\D/g, "").length >= 7 && draft.nationalId.trim()
  const canContinueFromStepTwo = draft.date && draft.time && selectedPackage

  const summaryRows = useMemo(
    () => [
      ["Fecha", draft.date],
      ["Hora", draft.time],
      ["Paquete", selectedPackage?.label || "-"],
      ["Subtotal", `Bs ${subtotal.toFixed(2)}`],
      ["Descuento", `Bs ${discountAmount.toFixed(2)}`],
      ["Total a pagar", `Bs ${total.toFixed(2)}`],
    ],
    [discountAmount, draft.date, draft.time, selectedPackage?.label, subtotal, total],
  )

  const updateDraft = (patch: Partial<BookingDraft>) => {
    setDraft((current) => ({ ...current, ...patch }))
    setErrorMessage("")
  }

  const handleNext = () => {
    if (step === 1 && !canContinueFromStepOne) {
      setErrorMessage("Completa tus datos y usa un telefono WhatsApp valido.")
      return
    }

    if (step === 2 && !canContinueFromStepTwo) {
      setErrorMessage("Elige fecha, hora y paquete.")
      return
    }

    setStep((current) => Math.min(current + 1, 3))
  }

  const handleDiscountApply = async () => {
    if (!draft.discountCode.trim()) {
      setErrorMessage("Ingresa un codigo de descuento.")
      return
    }

    if (!selectedPackage) {
      setErrorMessage("Elige un paquete antes de aplicar descuento.")
      return
    }

    setDiscountLoading(true)
    setErrorMessage("")

    try {
      const result = await validateDiscountCode(draft.discountCode, selectedPackage.id)
      updateDraft({ discountCode: result.code, appliedDiscount: result })
    } catch (error) {
      updateDraft({ appliedDiscount: null })
      setErrorMessage(error instanceof Error ? error.message : "No se pudo aplicar el descuento.")
    } finally {
      setDiscountLoading(false)
    }
  }

  const handleProofChange = (file: File | undefined) => {
    if (!file) return

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrorMessage("Sube una imagen JPG, PNG o WEBP.")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("El comprobante debe pesar 5 MB o menos.")
      return
    }

    setPaymentProof(file)
    setErrorMessage("")
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedPackage || !paymentProof) {
      setErrorMessage("Sube el comprobante de pago para registrar la reserva.")
      return
    }

    setSubmitting(true)
    setErrorMessage("")
    setMessage("")

    try {
      const result = await createBooking({
        fullName: draft.fullName,
        phone: draft.phone,
        nationalId: draft.nationalId,
        date: draft.date,
        time: draft.time,
        durationMinutes: selectedPackage.durationMinutes,
        pricingRuleId: selectedPackage.id,
        paymentQrId: selectedQrId,
        partySize: selectedPackage.personCount,
        paymentReference: draft.paymentReference,
        discountCode: draft.appliedDiscount?.code || "",
        paymentProof,
      })

      localStorage.removeItem(storageKey)
      setDraft(initialDraft)
      setPaymentProof(null)
      setStep(1)
      setMessage(`${result.message} Codigo: ${result.reservationCode}`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo registrar la reserva.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="booking-page">
      <section className="booking-shell booking-shell--steps">
        <div className="booking-copy">
          <span className="booking-eyebrow">Reservas Eureka</span>
          <h1>Reserva tu partida en pocos pasos</h1>
          <p>
            Completa tus datos, elige el paquete, paga por QR y sube tu comprobante.
            Tu reserva quedara pendiente de verificacion.
          </p>
        </div>

        <form className="booking-form booking-form--wizard" onSubmit={handleSubmit}>
          <div className="booking-steps" aria-label="Pasos de reserva">
            {["Tus datos", "Horario", "Pago"].map((label, index) => (
              <button
                key={label}
                type="button"
                className={step === index + 1 ? "active" : ""}
                onClick={() => setStep(index + 1)}
              >
                <span>{index + 1}</span>
                {label}
              </button>
            ))}
          </div>

          {step === 1 ? (
            <section className="booking-step-panel">
              <label>
                Nombre completo
                <input value={draft.fullName} onChange={(event) => updateDraft({ fullName: event.target.value })} required />
              </label>
              <label>
                Telefono WhatsApp
                <input value={draft.phone} onChange={(event) => updateDraft({ phone: event.target.value })} inputMode="tel" required />
              </label>
              <label>
                Carnet
                <input value={draft.nationalId} onChange={(event) => updateDraft({ nationalId: event.target.value })} required />
              </label>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="booking-step-panel">
              <div className="booking-grid">
                <label>
                  Fecha
                  <input type="date" min={today} value={draft.date} onChange={(event) => updateDraft({ date: event.target.value })} required />
                </label>
                <label>
                  Hora
                  <input type="time" step="1800" value={draft.time} onChange={(event) => updateDraft({ time: event.target.value })} required />
                </label>
              </div>

              <div className="booking-segment booking-segment--auto">
                {durationPrices.map((duration) => (
                  <button
                    key={duration.id}
                    type="button"
                    className={draft.pricingRuleId === duration.id ? "active" : ""}
                    onClick={() =>
                      updateDraft({
                        pricingRuleId: duration.id,
                        appliedDiscount: null,
                        discountCode: "",
                      })
                    }
                  >
                    {duration.label}
                    <span>Bs {duration.price.toFixed(2)}</span>
                  </button>
                ))}
              </div>

              <div className="booking-summary">
                {summaryRows.slice(0, 4).map(([label, value]) => (
                  <p key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </p>
                ))}
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="booking-step-panel">
              <div className="booking-discount-box">
                <strong>¿Tienes un codigo de descuento?</strong>
                <div>
                  <input
                    value={draft.discountCode}
                    onChange={(event) => updateDraft({ discountCode: event.target.value.toUpperCase(), appliedDiscount: null })}
                    placeholder="EUREKA-123"
                  />
                  <button type="button" className="booking-secondary-button" onClick={handleDiscountApply} disabled={discountLoading}>
                    {discountLoading ? "Aplicando..." : "Aplicar"}
                  </button>
                </div>
              </div>

              <div className="booking-summary booking-summary--final">
                {summaryRows.map(([label, value]) => (
                  <p key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </p>
                ))}
              </div>

              {selectedQr ? (
                <div className="booking-qr">
                  <img src={selectedQr.imagePath} alt={selectedQr.label} />
                  <div>
                    <strong>{selectedQr.label}</strong>
                    <span>Total final a pagar: Bs {total.toFixed(2)}</span>
                    <p>
                      Escanea el QR y paga el monto exacto indicado. Luego sube tu comprobante
                      de pago o ingresa la referencia para que podamos verificar tu reserva.
                    </p>
                    {selectedQr.instructions ? <p>{selectedQr.instructions}</p> : null}
                  </div>
                </div>
              ) : (
                <p className="booking-warning">Aun no hay QR activo configurado.</p>
              )}

              <label>
                Referencia de pago
                <input
                  value={draft.paymentReference}
                  onChange={(event) => updateDraft({ paymentReference: event.target.value })}
                  placeholder="Numero de comprobante o nota"
                />
              </label>

              <label>
                Comprobante de pago
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleProofChange(event.target.files?.[0])} />
                {paymentProof ? <small>{paymentProof.name}</small> : null}
              </label>
            </section>
          ) : null}

          {errorMessage ? <div className="booking-result booking-result--error">{errorMessage}</div> : null}
          {message ? <div className="booking-result">{message}</div> : null}

          <div className="booking-actions">
            {step > 1 ? (
              <button type="button" className="booking-secondary-button" onClick={() => setStep((current) => current - 1)}>
                Atras
              </button>
            ) : null}
            {step < 3 ? (
              <button type="button" className="booking-submit" onClick={handleNext}>
                Siguiente
              </button>
            ) : (
              <button className="booking-submit" type="submit" disabled={submitting}>
                {submitting ? "Registrando..." : "Registrar reserva"}
              </button>
            )}
          </div>
        </form>
      </section>
    </main>
  )
}
