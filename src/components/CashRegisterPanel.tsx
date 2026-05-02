import { useCallback, useEffect, useMemo, useState } from "react"
import { FaCashRegister, FaDownload, FaPlay, FaPrint, FaQrcode, FaSearch, FaStop, FaTimes } from "react-icons/fa"
import jsPDF from "jspdf"
import {
  cancelCashMovement,
  cleanupOldCashReceipts,
  closeCashSession,
  createCashExpense,
  createManualIncome,
  createPosSale,
  fetchCashExpenses,
  fetchCashMovements,
  fetchCashSessions,
  fetchCashSummary,
  fetchClosureReports,
  fetchExpenseCategories,
  fetchOpenCashSession,
  finishBookingGame,
  markBookingNoShow,
  openCashSession,
  registerReservationPayment,
  registerTableOrderPayment,
  startBookingGame,
  uploadCashReceipt,
  type CashExpense,
  type CashMovement,
  type CashPaymentMethod,
  type CashSession,
  type CashSummary,
  type ClosureReport,
  type ExpenseCategory,
} from "../lib/cashRegisterService"
import type {
  AdminBooking,
  AdminLiveOrder,
  AdminPaymentQr,
  AdminProduct,
  AdminProductCategory,
} from "../lib/adminDashboardService"
import "../styles/CashRegisterPanel.css"

type CashTab =
  | "summary"
  | "pos"
  | "reservations"
  | "orders"
  | "expenses"
  | "movements"
  | "closure"
  | "reports"
  | "games"

type CartItem = {
  key: string
  productId: string
  variantId: string | null
  optionIds: string[]
  quantity: number
  notes: string
}

type Props = {
  products: AdminProduct[]
  productCategories: AdminProductCategory[]
  bookings: AdminBooking[]
  liveOrders: AdminLiveOrder[]
  paymentQrs: AdminPaymentQr[]
  isSuperAdmin: boolean
  onRefresh: () => Promise<void>
  setSaveMessage: (message: string) => void
}

const tabs: Array<{ id: CashTab; label: string }> = [
  { id: "summary", label: "Resumen" },
  { id: "pos", label: "Venta rapida" },
  { id: "reservations", label: "Cobrar reserva" },
  { id: "orders", label: "Pedidos pendientes" },
  { id: "expenses", label: "Egresos" },
  { id: "movements", label: "Movimientos" },
  { id: "closure", label: "Cierre" },
  { id: "reports", label: "Reportes" },
  { id: "games", label: "En juego" },
]

const money = (value: number | null | undefined) =>
  `${Number(value || 0).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.`

const dateTime = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString("es-BO", { dateStyle: "short", timeStyle: "short" }) : "-"

const minutesLabel = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}

const paymentLabels: Record<CashPaymentMethod, string> = {
  cash: "Efectivo",
  qr: "QR",
  card: "Tarjeta",
  transfer: "Transferencia",
  other: "Otro",
}

const movementLabels: Record<string, string> = {
  manual_income: "Ingreso manual",
  expense: "Egreso",
  reservation_payment: "Reserva",
  table_order_payment: "Pedido mesa",
  pos_sale: "Venta directa",
}

export default function CashRegisterPanel({
  products,
  productCategories,
  bookings,
  liveOrders,
  paymentQrs,
  isSuperAdmin,
  onRefresh,
  setSaveMessage,
}: Props) {
  const [activeTab, setActiveTab] = useState<CashTab>("summary")
  const [cashSession, setCashSession] = useState<CashSession | null>(null)
  const [summary, setSummary] = useState<CashSummary | null>(null)
  const [movements, setMovements] = useState<CashMovement[]>([])
  const [expenses, setExpenses] = useState<CashExpense[]>([])
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [sessions, setSessions] = useState<CashSession[]>([])
  const [closureReports, setClosureReports] = useState<ClosureReport[]>([])
  const [working, setWorking] = useState(false)
  const [includeCancelled, setIncludeCancelled] = useState(false)
  const [openingAmount, setOpeningAmount] = useState("0")
  const [openingNotes, setOpeningNotes] = useState("")
  const [manualIncome, setManualIncome] = useState({ amount: "", method: "cash" as CashPaymentMethod, description: "", customerName: "", customerPhone: "" })
  const [expenseForm, setExpenseForm] = useState({ amount: "", method: "cash" as CashPaymentMethod, reason: "", categoryId: "", description: "" })
  const [expenseReceipt, setExpenseReceipt] = useState<File | null>(null)
  const [posSearch, setPosSearch] = useState("")
  const [posCategory, setPosCategory] = useState("all")
  const [cart, setCart] = useState<CartItem[]>([])
  const [posForm, setPosForm] = useState({ customerName: "", customerPhone: "", discount: "0", method: "cash" as CashPaymentMethod, notes: "" })
  const [posReceipt, setPosReceipt] = useState<File | null>(null)
  const [reservationSearch, setReservationSearch] = useState("")
  const [selectedReservationId, setSelectedReservationId] = useState("")
  const [reservationPaymentMethod, setReservationPaymentMethod] = useState<CashPaymentMethod>("cash")
  const [reservationReceipt, setReservationReceipt] = useState<File | null>(null)
  const [closingCash, setClosingCash] = useState("")
  const [closingNotes, setClosingNotes] = useState("")
  const [cancelModal, setCancelModal] = useState<{ movement: CashMovement; reason: string; key: string } | null>(null)
  const [gameTick, setGameTick] = useState(0)

  const activePaymentQr = paymentQrs.find((qr) => qr.isActive) || null
  const isCashOpen = cashSession?.status === "open"

  const loadCash = useCallback(async () => {
    await cleanupOldCashReceipts()
    const [nextSession, nextCategories, nextSessions, nextReports] = await Promise.all([
      fetchOpenCashSession(),
      fetchExpenseCategories(),
      fetchCashSessions(),
      fetchClosureReports(),
    ])
    setCashSession(nextSession)
    setExpenseCategories(nextCategories)
    setSessions(nextSessions)
    setClosureReports(nextReports)

    if (nextSession) {
      const [nextSummary, nextMovements, nextExpenses] = await Promise.all([
        fetchCashSummary(nextSession.id),
        fetchCashMovements(nextSession.id, includeCancelled && isSuperAdmin),
        fetchCashExpenses(nextSession.id),
      ])
      setSummary(nextSummary)
      setMovements(nextMovements)
      setExpenses(nextExpenses)
    } else {
      setSummary(null)
      setMovements([])
      setExpenses([])
    }
  }, [includeCancelled, isSuperAdmin])

  useEffect(() => {
    loadCash().catch((error) => {
      console.error(error)
      setSaveMessage("No se pudo cargar Caja.")
    })
  }, [loadCash, setSaveMessage])

  useEffect(() => {
    const timer = window.setInterval(() => setGameTick((current) => current + 1), 60000)
    return () => window.clearInterval(timer)
  }, [])

  const refreshAll = async (message: string) => {
    await loadCash()
    await onRefresh()
    setSaveMessage(message)
  }

  const runAction = async (action: () => Promise<void>, message: string) => {
    setWorking(true)
    try {
      await action()
      await refreshAll(message)
    } catch (error) {
      console.error(error)
      setSaveMessage(error instanceof Error ? error.message : "No se pudo completar la accion.")
    } finally {
      setWorking(false)
    }
  }

  const filteredProducts = useMemo(() => {
    const search = posSearch.trim().toLowerCase()
    return products
      .filter((product) => product.isActive)
      .filter((product) => posCategory === "all" || product.categoryId === posCategory)
      .filter((product) => !search || `${product.name} ${product.description || ""}`.toLowerCase().includes(search))
  }, [products, posCategory, posSearch])

  const reservationMatches = useMemo(() => {
    const search = reservationSearch.trim().toLowerCase()
    return bookings
      .filter((booking) => ["pending_payment", "pendiente_verificacion", "confirmed", "paid"].includes(booking.status))
      .filter((booking) => {
        if (!search) return true
        return [
          booking.fullName,
          booking.phone,
          booking.reservationCode,
          booking.status,
          new Date(booking.startsAt).toLocaleDateString("es-BO"),
        ]
          .join(" ")
          .toLowerCase()
          .includes(search)
      })
      .slice(0, 30)
  }, [bookings, reservationSearch])

  const selectedReservation = reservationMatches.find((booking) => booking.id === selectedReservationId) || null
  const pendingOrders = liveOrders.filter((order) => order.paymentStatus !== "paid" && !["rejected", "cancelled"].includes(order.orderStatus))
  const activeGameBookings = bookings.filter((booking) => ["paid", "confirmed", "in_game"].includes(booking.status))

  const cartDetails = useMemo(() => {
    return cart.map((item) => {
      const product = products.find((nextProduct) => nextProduct.id === item.productId)
      const variant = product?.variants.find((nextVariant) => nextVariant.id === item.variantId) || null
      const options = product?.optionGroups.flatMap((group) =>
        group.options
          .filter((option) => item.optionIds.includes(option.id))
          .map((option) => ({ ...option, groupName: group.name })),
      ) || []
      const unitPrice = variant?.price ?? product?.basePrice ?? 0
      const optionsTotal = options.reduce((sum, option) => sum + option.extraPrice, 0)
      const total = (unitPrice + optionsTotal) * item.quantity
      return { item, product, variant, options, unitPrice, optionsTotal, total }
    })
  }, [cart, products])

  const cartSubtotal = cartDetails.reduce((sum, row) => sum + row.total, 0)
  const cartDiscount = Math.min(Number(posForm.discount || 0), cartSubtotal)
  const cartTotal = Math.max(cartSubtotal - cartDiscount, 0)

  const addToCart = (product: AdminProduct) => {
    setCart((current) => [
      ...current,
      {
        key: `${product.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        productId: product.id,
        variantId: product.variants[0]?.id || null,
        optionIds: [],
        quantity: 1,
        notes: "",
      },
    ])
  }

  const updateCartItem = (key: string, patch: Partial<CartItem>) => {
    setCart((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  const requireOpenCash = () => {
    if (!isCashOpen) {
      setSaveMessage("Debes abrir caja antes de registrar movimientos.")
      return false
    }
    return true
  }

  const handleOpenCash = () =>
    runAction(
      () => openCashSession(Number(openingAmount || 0), openingNotes),
      "Caja abierta correctamente.",
    )

  const handleManualIncome = () => {
    if (!requireOpenCash()) return
    runAction(
      () =>
        createManualIncome({
          amount: Number(manualIncome.amount || 0),
          paymentMethod: manualIncome.method,
          description: manualIncome.description,
          customerName: manualIncome.customerName,
          customerPhone: manualIncome.customerPhone,
        }),
      "Ingreso manual registrado.",
    )
  }

  const handleExpense = () => {
    if (!requireOpenCash()) return
    runAction(async () => {
      const receiptPath = expenseReceipt ? await uploadCashReceipt(expenseReceipt) : null
      await createCashExpense({
        amount: Number(expenseForm.amount || 0),
        paymentMethod: expenseForm.method,
        reason: expenseForm.reason,
        categoryId: expenseForm.categoryId || null,
        description: expenseForm.description,
        receiptImagePath: receiptPath,
      })
      setExpenseForm({ amount: "", method: "cash", reason: "", categoryId: "", description: "" })
      setExpenseReceipt(null)
    }, "Egreso registrado.")
  }

  const handlePosSale = () => {
    if (!requireOpenCash()) return
    if (cart.length === 0) {
      setSaveMessage("Agrega productos al carrito.")
      return
    }
    runAction(async () => {
      const receiptPath = posForm.method === "qr" && posReceipt ? await uploadCashReceipt(posReceipt) : null
      if (posForm.method === "qr" && !receiptPath) throw new Error("Sube el comprobante QR.")
      await createPosSale({
        customerName: posForm.customerName,
        customerPhone: posForm.customerPhone,
        discountAmount: Number(posForm.discount || 0),
        paymentMethod: posForm.method,
        receiptImagePath: receiptPath,
        notes: posForm.notes,
        items: cart.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          notes: item.notes,
          options: item.optionIds,
        })),
      })
      setCart([])
      setPosReceipt(null)
      setPosForm({ customerName: "", customerPhone: "", discount: "0", method: "cash", notes: "" })
    }, "Venta directa registrada.")
  }

  const handleReservationPayment = () => {
    if (!requireOpenCash() || !selectedReservation) return
    runAction(async () => {
      const receiptPath =
        reservationPaymentMethod === "qr" && reservationReceipt ? await uploadCashReceipt(reservationReceipt) : null
      if (reservationPaymentMethod === "qr" && !receiptPath) throw new Error("Sube el comprobante QR.")
      await registerReservationPayment({
        bookingId: selectedReservation.id,
        paymentMethod: reservationPaymentMethod,
        receiptImagePath: receiptPath,
      })
      setReservationReceipt(null)
    }, "Pago de reserva registrado.")
  }

  const handleOrderPayment = (order: AdminLiveOrder, method: CashPaymentMethod) => {
    if (!requireOpenCash()) return
    runAction(
      () => registerTableOrderPayment({ orderId: order.id, paymentMethod: method }),
      "Pago de pedido confirmado.",
    )
  }

  const handleCloseCash = () => {
    if (!requireOpenCash()) return
    runAction(
      () => closeCashSession(Number(closingCash || 0), closingNotes),
      "Caja cerrada correctamente.",
    )
  }

  const handleCancelMovement = () => {
    if (!cancelModal) return
    runAction(
      async () => {
        await cancelCashMovement(cancelModal.movement.id, cancelModal.reason, cancelModal.key)
        setCancelModal(null)
      },
      "Movimiento anulado con auditoria.",
    )
  }

  const handleGameAction = (bookingId: string, action: "start" | "finish" | "no_show") => {
    runAction(
      () =>
        action === "start"
          ? startBookingGame(bookingId)
          : action === "finish"
            ? finishBookingGame(bookingId)
            : markBookingNoShow(bookingId, "Marcado como no asistio desde Caja."),
      action === "start" ? "Juego iniciado." : action === "finish" ? "Juego finalizado." : "Reserva marcada como no asistio.",
    )
  }

  const exportMovementsCsv = () => {
    const header = ["Fecha", "Tipo", "Descripcion", "Metodo", "Entrada", "Salida", "Estado", "Usuario"]
    const rows = movements.map((movement) => [
      dateTime(movement.createdAt),
      movementLabels[movement.movementType] || movement.movementType,
      movement.description,
      paymentLabels[movement.paymentMethod],
      movement.direction === "in" ? movement.amount : 0,
      movement.direction === "out" ? movement.amount : 0,
      movement.status,
      movement.createdByEmail || "",
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `caja-${cashSession?.sessionDate || "reporte"}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportPdf = () => {
    const doc = new jsPDF()
    const lines = [
      "Eureka Play & Coffee - Reporte de caja",
      `Fecha: ${cashSession?.sessionDate || summary?.sessionDate || "-"}`,
      `Abre: ${summary?.openedByEmail || cashSession?.openedByEmail || "-"}`,
      `Apertura: ${dateTime(summary?.openedAt || cashSession?.openedAt)}`,
      `Monto inicial: ${money(summary?.openingCashAmount)}`,
      `Ingresos efectivo: ${money(summary?.totalCashIncome)}`,
      `Ingresos QR: ${money(summary?.totalQrIncome)}`,
      `Reservas cobradas: ${money(summary?.totalReservationPayments)}`,
      `Pedidos mesa cobrados: ${money(summary?.totalTableOrderPayments)}`,
      `Ventas directas: ${money(summary?.totalPosSales)}`,
      `Egresos: ${money(summary?.totalExpenses)}`,
      `Efectivo esperado: ${money(summary?.expectedCashAmount)}`,
      "",
      "Movimientos:",
      ...movements.slice(0, 30).map((movement) => `${dateTime(movement.createdAt)} | ${movement.description} | ${movement.direction === "in" ? "+" : "-"}${money(movement.amount)} | ${paymentLabels[movement.paymentMethod]}`),
      "",
      "Firma cajero: ____________________",
      "Firma encargado: _________________",
    ]
    let y = 14
    lines.forEach((line) => {
      if (y > 280) {
        doc.addPage()
        y = 14
      }
      doc.text(line, 12, y)
      y += 7
    })
    doc.save(`reporte-caja-${cashSession?.sessionDate || "eureka"}.pdf`)
  }

  const printReport = () => {
    window.print()
  }

  return (
    <section className="cash-panel">
      <div className="admin-section-heading">
        <div>
          <span className="admin-kicker">Caja / Punto de venta</span>
          <h2>Control diario de ingresos y egresos</h2>
        </div>
        <div className="admin-inline-actions">
          {cashSession ? (
            <span className={`cash-status cash-status--${cashSession.status}`}>{cashSession.status === "open" ? "Caja abierta" : "Caja cerrada"}</span>
          ) : (
            <span className="cash-status cash-status--closed">Sin caja abierta</span>
          )}
          <button type="button" className="btn-edit" onClick={() => loadCash()} disabled={working}>
            Actualizar
          </button>
        </div>
      </div>

      {!cashSession ? (
        <div className="admin-panel-card cash-open-card">
          <div>
            <span className="admin-kicker">Apertura</span>
            <h3>Abre la caja diaria</h3>
            <p>No se pueden registrar ingresos, ventas o egresos hasta abrir caja.</p>
          </div>
          <label>Monto inicial efectivo<input type="number" min="0" step="0.5" value={openingAmount} onChange={(event) => setOpeningAmount(event.target.value)} /></label>
          <label>Notas<textarea value={openingNotes} onChange={(event) => setOpeningNotes(event.target.value)} /></label>
          <button type="button" className="btn-approve" onClick={handleOpenCash} disabled={working}><FaCashRegister />Abrir caja</button>
        </div>
      ) : null}

      <div className="cash-tabs" role="tablist">
        {tabs.map((tab) => (
          <button key={tab.id} type="button" className={activeTab === tab.id ? "is-active" : ""} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "summary" ? (
        <div className="cash-grid">
          {[
            ["Monto inicial", summary?.openingCashAmount],
            ["Ingresos efectivo", summary?.totalCashIncome],
            ["Ingresos QR", summary?.totalQrIncome],
            ["Ventas directas", summary?.totalPosSales],
            ["Reservas", summary?.totalReservationPayments],
            ["Pedidos mesa", summary?.totalTableOrderPayments],
            ["Egresos", summary?.totalExpenses],
            ["Efectivo esperado", summary?.expectedCashAmount],
          ].map(([label, value]) => (
            <article key={label as string} className="cash-stat">
              <span>{label}</span>
              <strong>{money(value as number)}</strong>
            </article>
          ))}
          <article className="admin-panel-card cash-wide">
            <div className="admin-card-toolbar">
              <strong>Ingreso manual</strong>
              <span>Para ajustes o ingresos no ligados a venta</span>
            </div>
            <div className="cash-form-grid">
              <input placeholder="Monto" type="number" min="0" step="0.5" value={manualIncome.amount} onChange={(event) => setManualIncome({ ...manualIncome, amount: event.target.value })} />
              <select value={manualIncome.method} onChange={(event) => setManualIncome({ ...manualIncome, method: event.target.value as CashPaymentMethod })}>
                <option value="cash">Efectivo</option>
                <option value="qr">QR</option>
                <option value="transfer">Transferencia</option>
                <option value="other">Otro</option>
              </select>
              <input placeholder="Descripcion" value={manualIncome.description} onChange={(event) => setManualIncome({ ...manualIncome, description: event.target.value })} />
              <button type="button" className="btn-approve" onClick={handleManualIncome} disabled={working || !isCashOpen}>Registrar ingreso</button>
            </div>
          </article>
          <article className="admin-panel-card cash-wide">
            <div className="admin-card-toolbar">
              <strong>Ultimos movimientos</strong>
              <button type="button" className="btn-edit" onClick={() => setActiveTab("movements")}>Ver todos</button>
            </div>
            <MovementList movements={movements.slice(0, 6)} isSuperAdmin={isSuperAdmin} onCancel={setCancelModal} />
          </article>
        </div>
      ) : null}

      {activeTab === "pos" ? (
        <div className="cash-pos">
          <section className="admin-panel-card">
            <div className="cash-form-grid cash-form-grid--tools">
              <div className="cash-search"><FaSearch /><input placeholder="Buscar producto" value={posSearch} onChange={(event) => setPosSearch(event.target.value)} /></div>
              <select value={posCategory} onChange={(event) => setPosCategory(event.target.value)}>
                <option value="all">Todas las categorias</option>
                {productCategories.filter((category) => category.isActive).map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div className="cash-product-grid">
              {filteredProducts.map((product) => (
                <button key={product.id} type="button" className="cash-product-tile" onClick={() => addToCart(product)}>
                  {product.imagePath ? <img src={product.imagePath} alt={product.name} /> : <span />}
                  <strong>{product.name}</strong>
                  <em>{money(product.variants[0]?.price ?? product.basePrice)}</em>
                </button>
              ))}
            </div>
          </section>

          <aside className="admin-panel-card cash-cart">
            <div className="admin-card-toolbar">
              <strong>Carrito</strong>
              <span>{cart.length} item(s)</span>
            </div>
            {cartDetails.length === 0 ? <p className="admin-template-help">Agrega productos para iniciar la venta.</p> : null}
            {cartDetails.map(({ item, product, variant, options, total }) => (
              <article key={item.key} className="cash-cart-item">
                <div className="cash-cart-item__head">
                  <strong>{product?.name || "Producto"}</strong>
                  <button type="button" onClick={() => setCart((current) => current.filter((row) => row.key !== item.key))}><FaTimes /></button>
                </div>
                {product && product.variants.length > 0 ? (
                  <select value={variant?.id || ""} onChange={(event) => updateCartItem(item.key, { variantId: event.target.value || null })}>
                    {product.variants.filter((nextVariant) => nextVariant.isActive).map((nextVariant) => (
                      <option key={nextVariant.id} value={nextVariant.id}>{nextVariant.name} - {money(nextVariant.price)}</option>
                    ))}
                  </select>
                ) : null}
                {product?.optionGroups.filter((group) => group.isActive).map((group) => (
                  <div key={group.id} className="cash-options">
                    <span>{group.name}</span>
                    {group.options.filter((option) => option.isActive).map((option) => (
                      <label key={option.id}>
                        <input
                          type="checkbox"
                          checked={item.optionIds.includes(option.id)}
                          onChange={(event) => {
                            const nextOptions = event.target.checked
                              ? [...item.optionIds, option.id]
                              : item.optionIds.filter((optionId) => optionId !== option.id)
                            updateCartItem(item.key, { optionIds: nextOptions })
                          }}
                        />
                        {option.name} {option.extraPrice > 0 ? `+${money(option.extraPrice)}` : ""}
                      </label>
                    ))}
                  </div>
                ))}
                <div className="cash-cart-item__qty">
                  <input type="number" min="1" value={item.quantity} onChange={(event) => updateCartItem(item.key, { quantity: Math.max(1, Number(event.target.value || 1)) })} />
                  <strong>{money(total)}</strong>
                </div>
                {options.length > 0 ? <small>{options.map((option) => option.name).join(", ")}</small> : null}
              </article>
            ))}
            <div className="cash-total-box">
              <span>Subtotal <strong>{money(cartSubtotal)}</strong></span>
              <label>Descuento<input type="number" min="0" step="0.5" value={posForm.discount} onChange={(event) => setPosForm({ ...posForm, discount: event.target.value })} /></label>
              <span>Total <strong>{money(cartTotal)}</strong></span>
            </div>
            <div className="cash-form-grid">
              <input placeholder="Cliente opcional" value={posForm.customerName} onChange={(event) => setPosForm({ ...posForm, customerName: event.target.value })} />
              <input placeholder="Telefono opcional" value={posForm.customerPhone} onChange={(event) => setPosForm({ ...posForm, customerPhone: event.target.value })} />
              <select value={posForm.method} onChange={(event) => setPosForm({ ...posForm, method: event.target.value as CashPaymentMethod })}>
                <option value="cash">Efectivo</option>
                <option value="qr">QR</option>
              </select>
            </div>
            {posForm.method === "qr" ? <QrPaymentBlock qr={activePaymentQr} file={posReceipt} setFile={setPosReceipt} /> : null}
            <textarea placeholder="Nota opcional" value={posForm.notes} onChange={(event) => setPosForm({ ...posForm, notes: event.target.value })} />
            <button type="button" className="btn-approve" onClick={handlePosSale} disabled={working || !isCashOpen}>Confirmar venta</button>
          </aside>
        </div>
      ) : null}

      {activeTab === "reservations" ? (
        <div className="cash-two-col">
          <section className="admin-panel-card">
            <div className="cash-search"><FaSearch /><input placeholder="Nombre, telefono, codigo o fecha" value={reservationSearch} onChange={(event) => setReservationSearch(event.target.value)} /></div>
            <div className="cash-list">
              {reservationMatches.map((booking) => (
                <button key={booking.id} type="button" className={selectedReservationId === booking.id ? "is-active" : ""} onClick={() => setSelectedReservationId(booking.id)}>
                  <strong>{booking.fullName}</strong>
                  <span>{booking.reservationCode} | {dateTime(booking.startsAt)} | {money(booking.amountDue)}</span>
                  <em>{booking.paymentStatus === "paid" ? "Pagada" : booking.status}</em>
                </button>
              ))}
            </div>
          </section>
          <section className="admin-panel-card">
            {selectedReservation ? (
              <div className="cash-detail">
                <span className={`status-pill status-pill--${selectedReservation.status}`}>{selectedReservation.status}</span>
                <h3>{selectedReservation.fullName}</h3>
                <p>{selectedReservation.phone} | Codigo {selectedReservation.reservationCode}</p>
                <strong>{money(selectedReservation.amountDue)}</strong>
                {selectedReservation.paymentStatus === "paid" ? (
                  <p className="cash-warning">Esta reserva ya tiene un pago registrado.</p>
                ) : (
                  <>
                    <select value={reservationPaymentMethod} onChange={(event) => setReservationPaymentMethod(event.target.value as CashPaymentMethod)}>
                      <option value="cash">Efectivo</option>
                      <option value="qr">QR</option>
                    </select>
                    {reservationPaymentMethod === "qr" ? <QrPaymentBlock qr={activePaymentQr} file={reservationReceipt} setFile={setReservationReceipt} /> : null}
                    <button type="button" className="btn-approve" onClick={handleReservationPayment} disabled={working || !isCashOpen}>Completar pago</button>
                  </>
                )}
              </div>
            ) : (
              <p className="admin-template-help">Selecciona una reserva para cobrarla.</p>
            )}
          </section>
        </div>
      ) : null}

      {activeTab === "orders" ? (
        <div className="cash-order-grid">
          {pendingOrders.length === 0 ? <div className="admin-empty-state"><strong>Sin pedidos pendientes de pago</strong></div> : null}
          {pendingOrders.map((order) => (
            <article key={order.id} className="admin-live-order">
              <div className="admin-live-order__head">
                <div>
                  <h3>{order.orderCode}</h3>
                  <p>Mesa {order.tableNumber || "-"} | {order.customerName}</p>
                </div>
                <strong>{money(order.total)}</strong>
              </div>
              <div className="admin-order-badges">
                <span>{paymentLabels[order.paymentMethod]}</span>
                <span>{order.paymentStatus}</span>
                <span>{order.orderStatus}</span>
              </div>
              {order.receipts.filter((receipt) => !receipt.isDeleted).map((receipt) => (
                <a key={receipt.id} className="admin-proof-link" href={receipt.imagePath} target="_blank" rel="noreferrer">Ver comprobante</a>
              ))}
              <div className="admin-inline-actions">
                <button type="button" className="btn-approve" onClick={() => handleOrderPayment(order, "cash")} disabled={working || !isCashOpen}>Pagado efectivo</button>
                <button type="button" className="btn-edit" onClick={() => handleOrderPayment(order, "qr")} disabled={working || !isCashOpen}>Confirmar QR</button>
                <a className="btn-whatsapp" href={`https://wa.me/${order.customerPhone}?text=${encodeURIComponent(`Hola ${order.customerName}, tu pedido ${order.orderCode} en Eureka esta en revision de pago.`)}`} target="_blank" rel="noreferrer">WhatsApp</a>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {activeTab === "expenses" ? (
        <div className="cash-two-col">
          <section className="admin-panel-card cash-detail">
            <h3>Registrar egreso</h3>
            <input placeholder="Monto" type="number" min="0" step="0.5" value={expenseForm.amount} onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })} />
            <select value={expenseForm.method} onChange={(event) => setExpenseForm({ ...expenseForm, method: event.target.value as CashPaymentMethod })}>
              <option value="cash">Efectivo</option>
              <option value="qr">QR</option>
              <option value="transfer">Transferencia</option>
              <option value="other">Otro</option>
            </select>
            <select value={expenseForm.categoryId} onChange={(event) => setExpenseForm({ ...expenseForm, categoryId: event.target.value })}>
              <option value="">Sin categoria</option>
              {expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <input placeholder="Motivo" value={expenseForm.reason} onChange={(event) => setExpenseForm({ ...expenseForm, reason: event.target.value })} />
            <textarea placeholder="Descripcion" value={expenseForm.description} onChange={(event) => setExpenseForm({ ...expenseForm, description: event.target.value })} />
            <input type="file" accept="image/*" onChange={(event) => setExpenseReceipt(event.target.files?.[0] || null)} />
            <button type="button" className="btn-approve" onClick={handleExpense} disabled={working || !isCashOpen}>Registrar egreso</button>
          </section>
          <section className="admin-panel-card">
            <div className="admin-card-toolbar"><strong>Egresos del dia</strong><span>{money(expenses.reduce((sum, item) => sum + item.amount, 0))}</span></div>
            <div className="cash-list cash-list--static">
              {expenses.map((expense) => (
                <article key={expense.id}>
                  <strong>{expense.reason}</strong>
                  <span>{paymentLabels[expense.paymentMethod]} | {dateTime(expense.createdAt)}</span>
                  <em>{money(expense.amount)}</em>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "movements" ? (
        <section className="admin-panel-card">
          <div className="admin-card-toolbar">
            <strong>Movimientos del dia</strong>
            <div className="admin-inline-actions">
              {isSuperAdmin ? (
                <label className="admin-switch"><input type="checkbox" checked={includeCancelled} onChange={(event) => setIncludeCancelled(event.target.checked)} />Ver anulados</label>
              ) : null}
              <button type="button" className="btn-edit" onClick={exportMovementsCsv}><FaDownload />CSV</button>
            </div>
          </div>
          <MovementList movements={movements} isSuperAdmin={isSuperAdmin} onCancel={setCancelModal} />
        </section>
      ) : null}

      {activeTab === "closure" ? (
        <section className="admin-panel-card cash-detail">
          <h3>Cierre de caja</h3>
          <div className="cash-closure-grid">
            <span>Efectivo esperado <strong>{money(summary?.expectedCashAmount)}</strong></span>
            <span>Ingresos QR <strong>{money(summary?.totalQrIncome)}</strong></span>
            <span>Egresos <strong>{money(summary?.totalExpenses)}</strong></span>
            <span>Total general <strong>{money(summary?.grossIncome)}</strong></span>
          </div>
          <input placeholder="Efectivo contado fisicamente" type="number" min="0" step="0.5" value={closingCash} onChange={(event) => setClosingCash(event.target.value)} />
          <textarea placeholder="Notas de cierre" value={closingNotes} onChange={(event) => setClosingNotes(event.target.value)} />
          <div className="admin-inline-actions">
            <button type="button" className="btn-approve" onClick={handleCloseCash} disabled={working || !isCashOpen}>Cerrar caja</button>
            <button type="button" className="btn-edit" onClick={exportPdf}><FaDownload />PDF</button>
            <button type="button" className="btn-edit" onClick={printReport}><FaPrint />Imprimir</button>
          </div>
        </section>
      ) : null}

      {activeTab === "reports" ? (
        <div className="cash-two-col">
          <section className="admin-panel-card">
            <div className="admin-card-toolbar">
              <strong>Historial de cajas</strong>
              <button type="button" className="btn-edit" onClick={exportPdf}><FaDownload />PDF actual</button>
            </div>
            <div className="cash-list cash-list--static">
              {sessions.map((session) => (
                <article key={session.id}>
                  <strong>{session.sessionDate} | {session.status}</strong>
                  <span>Abre: {session.openedByEmail || "-"} | Cierra: {session.closedByEmail || "-"}</span>
                  <em>{money(session.expectedCashAmount ?? session.openingCashAmount)}</em>
                </article>
              ))}
            </div>
          </section>
          <section className="admin-panel-card">
            <strong>Reportes cerrados</strong>
            <div className="cash-list cash-list--static">
              {closureReports.map((report) => (
                <article key={report.id}>
                  <strong>{report.reportDate}</strong>
                  <span>Cerrado: {dateTime(report.closedAt)}</span>
                  <em>Diferencia {money(report.differenceAmount)}</em>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "games" ? (
        <section className="admin-panel-card">
          <div className="admin-card-toolbar">
            <strong>Reservas confirmadas / en juego</strong>
            <span>{gameTick >= 0 ? "Timer activo" : ""}</span>
          </div>
          <div className="cash-order-grid">
            {activeGameBookings.map((booking) => {
              const elapsed = booking.startedAt
                ? Math.max(0, Math.floor(((booking.finishedAt ? new Date(booking.finishedAt).getTime() : Date.now()) - new Date(booking.startedAt).getTime()) / 60000))
                : 0
              return (
                <article key={booking.id} className="admin-reservation-card">
                  <div className="admin-reservation-card__top">
                    <strong>{booking.fullName}</strong>
                    <span className={`status-pill status-pill--${booking.status}`}>{booking.status}</span>
                  </div>
                  <p>{booking.phone} | {dateTime(booking.startsAt)}</p>
                  <p>Inicio real: {dateTime(booking.startedAt)} | Tiempo: {booking.startedAt ? minutesLabel(elapsed) : "-"}</p>
                  <div className="admin-inline-actions">
                    <button type="button" className="btn-approve" onClick={() => handleGameAction(booking.id, "start")} disabled={booking.status === "in_game"}><FaPlay />Iniciar</button>
                    <button type="button" className="btn-edit" onClick={() => handleGameAction(booking.id, "finish")} disabled={booking.status !== "in_game"}><FaStop />Finalizar</button>
                    <button type="button" className="btn-reject" onClick={() => handleGameAction(booking.id, "no_show")}>No asistio</button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ) : null}

      {cancelModal ? (
        <div className="admin-modal">
          <div className="admin-modal-card admin-danger-modal">
            <div className="admin-modal-head">
              <div>
                <span className="admin-kicker">Autorizar anulacion</span>
                <h2>{cancelModal.movement.description}</h2>
              </div>
              <button type="button" className="admin-modal-close" onClick={() => setCancelModal(null)}><FaTimes /></button>
            </div>
            <div className="admin-modal-form">
              <label>Motivo de anulacion<textarea value={cancelModal.reason} onChange={(event) => setCancelModal({ ...cancelModal, reason: event.target.value })} /></label>
              <label>Clave de autorizacion<input type="password" value={cancelModal.key} onChange={(event) => setCancelModal({ ...cancelModal, key: event.target.value })} /></label>
              <button type="button" className="btn-danger" onClick={handleCancelMovement} disabled={working}>Anular</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function QrPaymentBlock({ qr, file, setFile }: { qr: AdminPaymentQr | null; file: File | null; setFile: (file: File | null) => void }) {
  return (
    <div className="cash-qr-box">
      {qr ? (
        <>
          <img src={qr.imagePath} alt={qr.label} />
          <div><strong>{qr.label}</strong><span>{qr.instructions || "Escanea el QR y sube el comprobante."}</span></div>
        </>
      ) : (
        <p>No hay QR activo configurado.</p>
      )}
      <label><FaQrcode />Comprobante<input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
      {file ? <small>{file.name}</small> : null}
    </div>
  )
}

function MovementList({
  movements,
  isSuperAdmin,
  onCancel,
}: {
  movements: CashMovement[]
  isSuperAdmin: boolean
  onCancel: (value: { movement: CashMovement; reason: string; key: string }) => void
}) {
  if (movements.length === 0) {
    return <p className="admin-template-help">Sin movimientos registrados.</p>
  }

  return (
    <div className="cash-movement-list">
      {movements.map((movement) => (
        <article key={movement.id} className={movement.status === "cancelled" ? "is-cancelled" : ""}>
          <div>
            <strong>{movement.description}</strong>
            <span>{movementLabels[movement.movementType] || movement.movementType} | {paymentLabels[movement.paymentMethod]} | {dateTime(movement.createdAt)}</span>
            {movement.cancellationReason ? <small>{movement.cancellationReason}</small> : null}
          </div>
          <em className={movement.direction === "in" ? "is-in" : "is-out"}>{movement.direction === "in" ? "+" : "-"}{money(movement.amount)}</em>
          {isSuperAdmin && movement.status === "active" ? (
            <button type="button" className="btn-reject" onClick={() => onCancel({ movement, reason: "", key: "" })}>Anular</button>
          ) : null}
        </article>
      ))}
    </div>
  )
}
