import { useEffect, useMemo, useState } from "react"
import type { FormEvent } from "react"
import {
  createBooking,
  fetchActivePaymentQrs,
  fetchBookingDurationPrices,
  findReservationForChange,
  rescheduleReservationTime,
  validateDiscountCode,
  type BookingDurationPrice,
  type DiscountValidationResult,
  type PaymentType,
  type PaymentQr,
  type ReservationChangeLookup,
} from "../lib/bookingService"
import "../styles/Booking.css"

const formatDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

const today = formatDateKey(new Date())
const storageKey = "eureka_booking_draft"
const paymentQrCacheKey = "eureka_active_payment_qrs"
const fallbackDurations: BookingDurationPrice[] = [
  { id: "duration-60-1", label: "1 hora / 1 persona", durationMinutes: 60, personCount: 1, price: 30 },
  { id: "duration-60-2", label: "1 hora / desde 2 personas", durationMinutes: 60, personCount: 2, price: 25 },
  { id: "duration-180-1", label: "3 horas / 1 persona", durationMinutes: 180, personCount: 1, price: 40 },
  { id: "duration-180-2", label: "3 horas / desde 2 personas", durationMinutes: 180, personCount: 2, price: 35 },
]

type BookingDraft = {
  fullName: string
  phone: string
  nationalId: string
  date: string
  time: string
  pricingRuleId: string
  partySize: number
  paymentReference: string
  paymentType: PaymentType
  discountCode: string
  appliedDiscount: DiscountValidationResult | null
}

type SuccessReservation = {
  message: string
  code: string
}

const initialDraft: BookingDraft = {
  fullName: "",
  phone: "",
  nationalId: "",
  date: today,
  time: "17:00",
  pricingRuleId: "",
  partySize: 1,
  paymentReference: "",
  paymentType: "total",
  discountCode: "",
  appliedDiscount: null,
}

const readDraft = () => {
  try {
    const draft = { ...initialDraft, ...JSON.parse(localStorage.getItem(storageKey) || "{}") } as BookingDraft
    return {
      ...draft,
      date: draft.date && draft.date >= today ? draft.date : today,
      partySize: Math.max(1, Number(draft.partySize) || 1),
      paymentType: (draft.paymentType === "deposit_50" ? "deposit_50" : "total") as PaymentType,
    }
  } catch {
    return initialDraft
  }
}

const readCachedPaymentQrs = () => {
  try {
    const cached = JSON.parse(localStorage.getItem(paymentQrCacheKey) || "[]") as PaymentQr[]
    return Array.isArray(cached) ? cached : []
  } catch {
    return []
  }
}

const formatQrExpiryDate = (value: string) =>
  new Date(value).toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

export default function Booking() {
  const cachedPaymentQrs = readCachedPaymentQrs()
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<BookingDraft>(readDraft)
  const [durationPrices, setDurationPrices] = useState(fallbackDurations)
  const [paymentQrs, setPaymentQrs] = useState<PaymentQr[]>(cachedPaymentQrs)
  const [selectedQrId, setSelectedQrId] = useState<string | null>(cachedPaymentQrs[0]?.id || null)
  const [qrLoading, setQrLoading] = useState(cachedPaymentQrs.length === 0)
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [discountLoading, setDiscountLoading] = useState(false)
  const [successReservation, setSuccessReservation] = useState<SuccessReservation | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [discountMessage, setDiscountMessage] = useState("")
  const [changeCode, setChangeCode] = useState("")
  const [changeTime, setChangeTime] = useState("")
  const [changeLookup, setChangeLookup] = useState<ReservationChangeLookup | null>(null)
  const [changeLoading, setChangeLoading] = useState(false)
  const [changeMessage, setChangeMessage] = useState("")

  useEffect(() => {
    let isMounted = true

    fetchActivePaymentQrs().then((qrs) => {
      if (!isMounted) return

      setPaymentQrs(qrs)
      setSelectedQrId((current) => (qrs.some((qr) => qr.id === current) ? current : qrs[0]?.id || null))
      localStorage.setItem(paymentQrCacheKey, JSON.stringify(qrs))
    }).catch((error) => {
      console.warn("No se pudieron cargar los QR de pago:", error)
    }).finally(() => {
      if (isMounted) setQrLoading(false)
    })

    fetchBookingDurationPrices().then((prices) => {
      if (!isMounted) return

      if (prices.length > 0) {
        setDurationPrices(prices)
        setDraft((current) => ({
          ...current,
          pricingRuleId: current.pricingRuleId || prices[0].id,
        }))
      }
    }).catch((error) => console.warn("No se pudieron cargar los precios:", error))

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(draft))
  }, [draft])

  const selectedDuration = durationPrices.find((item) => item.id === draft.pricingRuleId) || durationPrices[0]
  const selectedPackage =
    durationPrices.find((item) =>
      item.durationMinutes === selectedDuration?.durationMinutes &&
      item.personCount === (draft.partySize === 1 ? 1 : 2)
    ) || selectedDuration
  const selectedQr = paymentQrs.find((qr) => qr.id === selectedQrId) || null
  const selectedQrExpired = Boolean(
    selectedQr?.expiresAt && new Date(selectedQr.expiresAt).getTime() <= Date.now(),
  )
  const subtotal = selectedPackage ? selectedPackage.price * draft.partySize : 0
  const discountAmount = draft.appliedDiscount?.discountAmount || 0
  const total = draft.appliedDiscount?.total ?? subtotal
  const amountToPay = draft.paymentType === "deposit_50" ? total / 2 : total
  const balanceDue = Math.max(total - amountToPay, 0)

  const canContinueFromStepOne = draft.fullName.trim() && draft.phone.replace(/\D/g, "").length >= 7 && draft.nationalId.trim()
  const canContinueFromStepTwo = draft.date && draft.time && selectedPackage && draft.partySize > 0

  useEffect(() => {
    if (!selectedQr?.imagePath) return

    const image = new Image()
    image.src = selectedQr.imagePath
  }, [selectedQr?.imagePath])

  const summaryRows = useMemo(
    () => [
      ["Fecha", draft.date],
      ["Hora", draft.time],
      ["Duracion", selectedPackage ? `${selectedPackage.durationMinutes / 60} hora${selectedPackage.durationMinutes === 60 ? "" : "s"}` : "-"],
      ["Personas", String(draft.partySize)],
      ["Precio por persona", selectedPackage ? `Bs ${selectedPackage.price.toFixed(2)}` : "-"],
      ["Subtotal", `Bs ${subtotal.toFixed(2)}`],
      ["Descuento", discountAmount > 0 ? `- Bs ${discountAmount.toFixed(2)}` : "Bs 0.00"],
      ["Total reserva", `Bs ${total.toFixed(2)}`],
      ["Pago elegido", draft.paymentType === "deposit_50" ? "50% ahora" : "100% ahora"],
      ["Saldo", `Bs ${balanceDue.toFixed(2)}`],
      ["Total a pagar", `Bs ${amountToPay.toFixed(2)}`],
    ],
    [amountToPay, balanceDue, discountAmount, draft.date, draft.partySize, draft.paymentType, draft.time, selectedPackage, subtotal, total],
  )

  const updateDraft = (patch: Partial<BookingDraft>) => {
    setDraft((current) => ({ ...current, ...patch }))
    setErrorMessage("")
    if (!("appliedDiscount" in patch) || patch.appliedDiscount === null) setDiscountMessage("")
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
      const result = await validateDiscountCode(draft.discountCode, selectedPackage.id, draft.partySize)
      updateDraft({ discountCode: result.code, appliedDiscount: result })
      setDiscountMessage(`${result.message}: - Bs ${result.discountAmount.toFixed(2)}`)
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

  const handleQrDownload = async () => {
    if (!selectedQr || selectedQrExpired) return

    try {
      const response = await fetch(selectedQr.imagePath)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${selectedQr.label || "qr-eureka"}.png`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      setErrorMessage("No se pudo descargar el QR.")
    }
  }

  const handleReservationLookup = async () => {
    if (!changeCode.trim()) {
      setChangeMessage("")
      setErrorMessage("Ingresa tu codigo de reserva para buscarla.")
      return
    }

    setChangeLoading(true)
    setErrorMessage("")
    setChangeMessage("")

    try {
      const result = await findReservationForChange(changeCode)
      setChangeLookup(result)
      setChangeTime(new Date(result.startsAt).toTimeString().slice(0, 5))
      setChangeMessage(
        result.changeUsed
          ? "Esta reserva ya uso su cambio de horario."
          : "Reserva encontrada. Puedes cambiar la hora una sola vez.",
      )
    } catch (error) {
      setChangeLookup(null)
      setErrorMessage(error instanceof Error ? error.message : "No encontramos esa reserva.")
    } finally {
      setChangeLoading(false)
    }
  }

  const handleReservationTimeChange = async () => {
    if (!changeLookup || !changeTime) {
      setErrorMessage("Busca tu reserva y elige una nueva hora.")
      return
    }

    setChangeLoading(true)
    setErrorMessage("")
    setChangeMessage("")

    try {
      const result = await rescheduleReservationTime(changeLookup.reservationCode, changeTime)
      setChangeLookup({
        ...changeLookup,
        startsAt: result.startsAt,
        endsAt: result.endsAt,
        status: result.status,
        changeUsed: true,
      })
      setChangeMessage("Listo. Cambiamos la hora de tu reserva y avisamos al panel de administracion.")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cambiar la hora.")
    } finally {
      setChangeLoading(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedQr) {
      setErrorMessage("Aun no hay QR activo configurado.")
      return
    }

    if (selectedQrExpired) {
      setErrorMessage("El QR de pago ha expirado. Por favor comunicate con administracion.")
      return
    }

    if (!selectedPackage || !paymentProof) {
      setErrorMessage("Sube el comprobante de pago para registrar la reserva.")
      return
    }

    if (draft.date < today) {
      setErrorMessage("La fecha de reserva no puede ser anterior a hoy. Vuelve a elegir la fecha.")
      updateDraft({ date: today })
      setStep(2)
      return
    }

    setSubmitting(true)
    setErrorMessage("")
    setSuccessReservation(null)

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
        paymentType: draft.paymentType,
        partySize: draft.partySize,
        paymentReference: draft.paymentReference,
        discountCode: draft.appliedDiscount?.code || "",
        paymentProof,
      })

      localStorage.removeItem(storageKey)
      setDraft(initialDraft)
      setPaymentProof(null)
      setStep(1)
      setSuccessReservation({
        message: result.message,
        code: result.reservationCode,
      })
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
          <div className="booking-change-card">
            <strong>Ya tienes una reserva?</strong>
            <p>Ingresa tu codigo para cambiar la hora una sola vez, manteniendo la misma fecha.</p>
            <div>
              <input
                value={changeCode}
                onChange={(event) => setChangeCode(event.target.value.toUpperCase())}
                placeholder="AF02882069"
              />
              <button type="button" onClick={handleReservationLookup} disabled={changeLoading}>
                {changeLoading ? "Buscando..." : "Buscar"}
              </button>
            </div>
            {changeLookup ? (
              <div className="booking-change-result">
                <span>{changeLookup.fullName}</span>
                <strong>
                  {new Date(changeLookup.startsAt).toLocaleDateString("es-BO")} -{" "}
                  {new Date(changeLookup.startsAt).toLocaleTimeString("es-BO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>
                <label>
                  Nueva hora
                  <input
                    type="time"
                    step="1800"
                    value={changeTime}
                    disabled={changeLookup.changeUsed}
                    onChange={(event) => setChangeTime(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleReservationTimeChange}
                  disabled={changeLoading || changeLookup.changeUsed}
                >
                  Cambiar hora
                </button>
              </div>
            ) : null}
            {changeMessage ? <p className="booking-change-message">{changeMessage}</p> : null}
          </div>
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
                {durationPrices
                  .filter((duration, index, allDurations) =>
                    allDurations.findIndex((item) => item.durationMinutes === duration.durationMinutes) === index
                  )
                  .map((duration) => (
                  <button
                    key={duration.id}
                    type="button"
                    className={selectedPackage?.durationMinutes === duration.durationMinutes ? "active" : ""}
                    onClick={() =>
                      updateDraft({
                        pricingRuleId: duration.id,
                        appliedDiscount: null,
                        discountCode: "",
                      })
                    }
                  >
                    {duration.durationMinutes / 60} hora{duration.durationMinutes === 60 ? "" : "s"}
                    <span>{duration.durationMinutes === 60 ? "60 min" : "180 min"}</span>
                  </button>
                ))}
              </div>

              <label className="booking-party-size">
                Personas
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={draft.partySize}
                  onChange={(event) =>
                    updateDraft({
                      partySize: Math.max(1, Number(event.target.value) || 1),
                      appliedDiscount: null,
                      discountCode: "",
                    })
                  }
                />
                <small>
                  {draft.partySize === 1
                    ? `1 persona: Bs ${(selectedPackage?.price || 0).toFixed(2)}`
                    : `Desde 2 personas: Bs ${(selectedPackage?.price || 0).toFixed(2)} por persona`}
                </small>
              </label>

              <div className="booking-summary">
                {summaryRows.slice(0, 6).map(([label, value]) => (
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
                {discountMessage ? <p className="booking-discount-success">{discountMessage}</p> : null}
              </div>

              <div className="booking-summary booking-summary--final">
                {summaryRows.map(([label, value]) => (
                  <p key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </p>
                ))}
              </div>

              <div className="booking-payment-choice">
                <strong>Cuanto quieres pagar ahora?</strong>
                <div className="booking-segment">
                  <button
                    type="button"
                    className={draft.paymentType === "total" ? "active" : ""}
                    onClick={() => updateDraft({ paymentType: "total" })}
                  >
                    100%
                    <span>Bs {total.toFixed(2)}</span>
                  </button>
                  <button
                    type="button"
                    className={draft.paymentType === "deposit_50" ? "active" : ""}
                    onClick={() => updateDraft({ paymentType: "deposit_50" })}
                  >
                    50%
                    <span>Bs {amountToPay.toFixed(2)}</span>
                  </button>
                </div>
                <p>
                  Total a pagar: <strong>Bs {amountToPay.toFixed(2)}</strong>
                  {balanceDue > 0 ? <span> Saldo: Bs {balanceDue.toFixed(2)}</span> : null}
                </p>
              </div>

              {selectedQr && !selectedQrExpired ? (
                <div className="booking-qr">
                  <img
                    src={selectedQr.imagePath}
                    alt={selectedQr.label}
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                  />
                  <div>
                    <strong>{selectedQr.label}</strong>
                    <span>Total a pagar ahora: Bs {amountToPay.toFixed(2)}</span>
                    <p>
                      Escanea el QR y paga el monto exacto indicado. Luego sube tu comprobante
                      de pago o ingresa la referencia para que podamos verificar tu reserva.
                    </p>
                    {selectedQr.expiresAt ? (
                      <p className="booking-qr-expiry">
                        QR valido hasta: {formatQrExpiryDate(selectedQr.expiresAt)}
                      </p>
                    ) : null}
                    {selectedQr.instructions ? <p>{selectedQr.instructions}</p> : null}
                    <button type="button" className="booking-secondary-button booking-secondary-button--soft" onClick={handleQrDownload}>
                      Descargar QR
                    </button>
                  </div>
                </div>
              ) : selectedQrExpired ? (
                <p className="booking-warning booking-warning--danger">
                  El QR de pago ha expirado. Por favor comunicate con administracion.
                </p>
              ) : qrLoading ? (
                <p className="booking-warning booking-warning--loading">Cargando QR de pago...</p>
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
                {submitting ? (
                  <span className="booking-golf-loader">
                    <span aria-hidden="true" />
                    Registrando reserva...
                  </span>
                ) : (
                  "Registrar reserva"
                )}
              </button>
            )}
          </div>
        </form>
      </section>

      {successReservation ? (
        <div className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-success-title">
          <div className="booking-modal-card">
            <div className="booking-modal-icon" aria-hidden="true">
              <span />
            </div>
            <span className="booking-eyebrow booking-eyebrow--modal">Reserva recibida</span>
            <h2 id="booking-success-title">Gracias por agendar tu reserva</h2>
            <p>
              {successReservation.message} Te enviaremos la confirmacion por WhatsApp cuando
              revisemos el pago.
            </p>
            <div className="booking-code-card">
              <span>Codigo de reserva</span>
              <strong>{successReservation.code}</strong>
            </div>
            <button type="button" className="booking-submit" onClick={() => setSuccessReservation(null)}>
              Perfecto, entendido
            </button>
          </div>
        </div>
      ) : null}
    </main>
  )
}
