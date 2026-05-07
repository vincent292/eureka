import { useEffect, useMemo, useState } from "react"
import { FaShoppingCart, FaTimes } from "react-icons/fa"
import { useParams } from "react-router-dom"
import {
  createTableOrder,
  fetchTableMenu,
  uploadOrderReceipt,
  type MenuPaymentMethod,
  type PublicMenuOptionGroup,
  type PublicMenuProduct,
  type PublicPaymentQr,
  type PublicRestaurantTable,
} from "../lib/tableOrderService"
import { resolveCatalogImage } from "../lib/contentService"
import "../styles/TableMenu.css"

type CartItem = {
  key: string
  product: PublicMenuProduct
  variantId: string | null
  selectedOptions: string[]
  quantity: number
  notes: string
}

type StoredOrderDraft = {
  cart: CartItem[]
  customerName: string
  customerPhone: string
  paymentMethod: MenuPaymentMethod
  invoiceRequired: boolean
  invoiceDocument: string
  invoiceName: string
}

const formatMoney = (value: number) => `Bs ${value.toFixed(2)}`

const formatQrDate = (value: string) =>
  new Date(value).toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

const optionGroupValid = (group: PublicMenuOptionGroup, selectedOptions: string[]) => {
  const count = group.options.filter((option) => selectedOptions.includes(option.id)).length
  if (group.isRequired && count < Math.max(group.minSelect, 1)) return false
  if (count < group.minSelect) return false
  if (group.maxSelect > 0 && count > group.maxSelect) return false
  return true
}

const getTableDraftKey = (tableCode: string) => `eureka_table_order_${tableCode}`

const readStoredOrderDraft = (tableCode: string): StoredOrderDraft => {
  try {
    const parsed = JSON.parse(localStorage.getItem(getTableDraftKey(tableCode)) || "{}") as Partial<StoredOrderDraft>
    return {
      cart: Array.isArray(parsed.cart) ? parsed.cart : [],
      customerName: parsed.customerName || "",
      customerPhone: parsed.customerPhone || "",
      paymentMethod: parsed.paymentMethod === "qr" ? "qr" : "cash",
      invoiceRequired: Boolean(parsed.invoiceRequired),
      invoiceDocument: parsed.invoiceDocument || "",
      invoiceName: parsed.invoiceName || "",
    }
  } catch {
    return {
      cart: [],
      customerName: "",
      customerPhone: "",
      paymentMethod: "cash",
      invoiceRequired: false,
      invoiceDocument: "",
      invoiceName: "",
    }
  }
}

export default function TableMenu() {
  const { tableCode = "" } = useParams()
  const storedDraft = readStoredOrderDraft(tableCode)
  const [table, setTable] = useState<PublicRestaurantTable | null>(null)
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [products, setProducts] = useState<PublicMenuProduct[]>([])
  const [paymentQr, setPaymentQr] = useState<PublicPaymentQr | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState("all")
  const [selectedProduct, setSelectedProduct] = useState<PublicMenuProduct | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState("")
  const [cart, setCart] = useState<CartItem[]>(storedDraft.cart)
  const [customerName, setCustomerName] = useState(storedDraft.customerName)
  const [customerPhone, setCustomerPhone] = useState(storedDraft.customerPhone)
  const [paymentMethod, setPaymentMethod] = useState<MenuPaymentMethod>(storedDraft.paymentMethod)
  const [invoiceRequired, setInvoiceRequired] = useState(storedDraft.invoiceRequired)
  const [invoiceDocument, setInvoiceDocument] = useState(storedDraft.invoiceDocument)
  const [invoiceName, setInvoiceName] = useState(storedDraft.invoiceName)
  const [receipt, setReceipt] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [mobileCartOpen, setMobileCartOpen] = useState(false)

  useEffect(() => {
    let isMounted = true
    setLoading(true)

    fetchTableMenu(tableCode)
      .then((result) => {
        if (!isMounted) return
        setTable(result.table)
        setCategories(result.categories)
        setProducts(result.products)
        setPaymentQr(result.paymentQr)
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "Esta mesa no esta disponible.")
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [tableCode])

  useEffect(() => {
    const nextDraft = readStoredOrderDraft(tableCode)
    setCart(nextDraft.cart)
    setCustomerName(nextDraft.customerName)
    setCustomerPhone(nextDraft.customerPhone)
    setPaymentMethod(nextDraft.paymentMethod)
    setInvoiceRequired(nextDraft.invoiceRequired)
    setInvoiceDocument(nextDraft.invoiceDocument)
    setInvoiceName(nextDraft.invoiceName)
    setReceipt(null)
    setMessage("")
    setErrorMessage("")
  }, [tableCode])

  useEffect(() => {
    if (
      cart.length === 0 &&
      !customerName &&
      !customerPhone &&
      paymentMethod === "cash" &&
      !invoiceRequired &&
      !invoiceDocument &&
      !invoiceName
    ) {
      localStorage.removeItem(getTableDraftKey(tableCode))
      return
    }

    localStorage.setItem(
      getTableDraftKey(tableCode),
      JSON.stringify({
        cart,
        customerName,
        customerPhone,
        paymentMethod,
        invoiceRequired,
        invoiceDocument,
        invoiceName,
      } satisfies StoredOrderDraft),
    )
  }, [cart, customerName, customerPhone, paymentMethod, invoiceRequired, invoiceDocument, invoiceName, tableCode])

  useEffect(() => {
    if (!selectedProduct) return
    setSelectedVariantId(selectedProduct.variants[0]?.id || null)
    setSelectedOptions([])
    setQuantity(1)
    setNotes("")
  }, [selectedProduct])

  useEffect(() => {
    document.body.classList.toggle("table-cart-lock", mobileCartOpen)
    return () => document.body.classList.remove("table-cart-lock")
  }, [mobileCartOpen])

  const selectedQrExpired = Boolean(
    paymentQr?.expiresAt && new Date(paymentQr.expiresAt).getTime() <= Date.now(),
  )

  const visibleProducts = products.filter(
    (product) => selectedCategoryId === "all" || product.categoryId === selectedCategoryId,
  )

  const optionById = useMemo(() => {
    const map = new Map<string, { name: string; extraPrice: number; groupName: string }>()
    products.forEach((product) => {
      product.optionGroups.forEach((group) => {
        group.options.forEach((option) => {
          map.set(option.id, {
            name: option.name,
            extraPrice: option.extraPrice,
            groupName: group.name,
          })
        })
      })
    })
    return map
  }, [products])

  const getItemPrice = (item: CartItem) => {
    const variant = item.product.variants.find((nextVariant) => nextVariant.id === item.variantId)
    const base = variant?.price ?? item.product.basePrice
    const extras = item.selectedOptions.reduce(
      (sum, optionId) => sum + (optionById.get(optionId)?.extraPrice || 0),
      0,
    )
    return (base + extras) * item.quantity
  }

  const cartTotal = cart.reduce((sum, item) => sum + getItemPrice(item), 0)
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const toggleOption = (group: PublicMenuOptionGroup, optionId: string) => {
    setSelectedOptions((current) => {
      if (current.includes(optionId)) {
        return current.filter((id) => id !== optionId)
      }

      if (group.selectionType === "single") {
        const groupOptionIds = group.options.map((option) => option.id)
        return [...current.filter((id) => !groupOptionIds.includes(id)), optionId]
      }

      const currentInGroup = group.options.filter((option) => current.includes(option.id)).length
      if (group.maxSelect > 0 && currentInGroup >= group.maxSelect) return current
      return [...current, optionId]
    })
  }

  const addToCart = () => {
    if (!selectedProduct) return

    const invalidGroup = selectedProduct.optionGroups.find(
      (group) => !optionGroupValid(group, selectedOptions),
    )
    if (invalidGroup) {
      setErrorMessage(`Completa la opcion: ${invalidGroup.name}`)
      return
    }

    setCart((current) => [
      ...current,
      {
        key: `${selectedProduct.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        product: selectedProduct,
        variantId: selectedVariantId,
        selectedOptions,
        quantity,
        notes,
      },
    ])
    setSelectedProduct(null)
    setErrorMessage("")
    if (window.matchMedia("(max-width: 900px)").matches) {
      setMobileCartOpen(true)
    }
  }

  const handleReceipt = (file: File | undefined) => {
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrorMessage("Sube un comprobante JPG, PNG o WEBP.")
      return
    }
    setReceipt(file)
  }

  const downloadPaymentQr = async () => {
    if (!paymentQr) return

    try {
      const response = await fetch(paymentQr.imagePath)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${paymentQr.label || "qr-eureka"}.png`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      setErrorMessage("No se pudo descargar el QR.")
    }
  }

  const submitOrder = async () => {
    if (!table) return
    if (cart.length === 0) {
      setErrorMessage("Agrega al menos un producto.")
      return
    }
    if (!customerName.trim() || customerPhone.replace(/\D/g, "").length < 7) {
      setErrorMessage("Ingresa tu nombre y WhatsApp.")
      return
    }
    if (paymentMethod === "qr" && (!paymentQr || selectedQrExpired)) {
      setErrorMessage("El QR de pago no esta disponible. Elige pago en caja.")
      return
    }
    if (paymentMethod === "qr" && !receipt) {
      setErrorMessage("Sube el comprobante de pago.")
      return
    }
    if (invoiceRequired && (!invoiceDocument.trim() || !invoiceName.trim())) {
      setErrorMessage("Completa NIT/CI y nombre para la factura.")
      return
    }

    setSubmitting(true)
    setErrorMessage("")

    try {
      const receiptPath = paymentMethod === "qr" && receipt ? await uploadOrderReceipt(receipt) : null
      const result = await createTableOrder({
        tableCode: table.tableCode,
        customerName,
        customerPhone,
        paymentMethod,
        paymentReceiptPath: receiptPath,
        invoiceRequired,
        invoiceDocument,
        invoiceName,
        items: cart.map((item) => ({
          productId: item.product.id,
          variantId: item.variantId,
          quantity: item.quantity,
          notes: item.notes,
          options: item.selectedOptions,
        })),
      })

      setMessage(
        paymentMethod === "cash"
          ? `Tu pedido ${result.orderCode} fue enviado. Para procesarlo, por favor acercate a caja y realiza el pago.`
          : `Tu pedido ${result.orderCode} fue enviado correctamente. Estamos revisando tu pago.`,
      )
      setCart([])
      setCustomerName("")
      setCustomerPhone("")
      setPaymentMethod("cash")
      setInvoiceRequired(false)
      setInvoiceDocument("")
      setInvoiceName("")
      setReceipt(null)
      setMobileCartOpen(false)
      localStorage.removeItem(getTableDraftKey(tableCode))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo enviar el pedido.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <main className="table-menu-page"><div className="table-menu-state">Cargando menu...</div></main>
  }

  if (errorMessage && !table) {
    return <main className="table-menu-page"><div className="table-menu-state table-menu-state--error">{errorMessage}</div></main>
  }

  return (
    <main className="table-menu-page">
      <section className="table-menu-hero">
        <span>Eureka Play & Coffee</span>
        <h1>{table?.tableName || `Mesa ${table?.tableNumber}`}</h1>
        <p>Elige tus productos, confirma tu pedido y lo enviamos directo al equipo.</p>
      </section>

      {message ? <div className="table-menu-result">{message}</div> : null}
      {errorMessage && table ? <div className="table-menu-result table-menu-result--error">{errorMessage}</div> : null}

      <button
        type="button"
        className="table-mobile-cart-button"
        onClick={() => setMobileCartOpen(true)}
        aria-label="Ver pedido"
      >
        <span><FaShoppingCart /> Pedido ({cartItemCount})</span>
        <strong>{formatMoney(cartTotal)}</strong>
      </button>

      <section className="table-menu-layout">
        <div className="table-menu-products">
          <div className="table-menu-tabs">
            <button className={selectedCategoryId === "all" ? "is-active" : ""} onClick={() => setSelectedCategoryId("all")}>
              Todo
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                className={selectedCategoryId === category.id ? "is-active" : ""}
                onClick={() => setSelectedCategoryId(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="table-menu-grid">
            {visibleProducts.map((product) => {
              const price = product.variants[0]?.price ?? product.basePrice
              return (
                <article key={product.id} className="table-product-card">
                  <img src={resolveCatalogImage(product.imagePath)} alt={product.name} />
                  <div>
                    <span>{product.productType === "combo" ? "Combo" : "Producto"}</span>
                    <strong>{product.name}</strong>
                    <p>{product.description || "Listo para pedir en mesa."}</p>
                    <button type="button" onClick={() => setSelectedProduct(product)}>
                      Agregar {formatMoney(price)}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </div>

        <aside className={`table-cart ${mobileCartOpen ? "is-open" : ""}`}>
          <div className="table-cart-header">
            <h2>Tu pedido</h2>
            <button
              type="button"
              className="table-cart-close"
              onClick={() => setMobileCartOpen(false)}
              aria-label="Cerrar pedido"
            >
              <FaTimes />
            </button>
          </div>
          {cart.length === 0 ? <p>No agregaste productos todavia.</p> : null}
          {cart.map((item) => (
            <article key={item.key} className="table-cart-item">
              <strong>{item.quantity} x {item.product.name}</strong>
              {item.variantId ? (
                <span>{item.product.variants.find((variant) => variant.id === item.variantId)?.name}</span>
              ) : null}
              {item.selectedOptions.map((optionId) => (
                <span key={optionId}>{optionById.get(optionId)?.groupName}: {optionById.get(optionId)?.name}</span>
              ))}
              <div>
                <b>{formatMoney(getItemPrice(item))}</b>
                <button type="button" onClick={() => setCart((current) => current.filter((next) => next.key !== item.key))}>
                  Quitar
                </button>
              </div>
            </article>
          ))}
          <div className="table-cart-total">
            <span>Total</span>
            <strong>{formatMoney(cartTotal)}</strong>
          </div>

          <label>Nombre completo<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} /></label>
          <label>WhatsApp<input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} inputMode="tel" /></label>

          <label className="table-invoice-toggle">
            <span>¿Requiere factura?</span>
            <input
              type="checkbox"
              checked={invoiceRequired}
              onChange={(event) => {
                const checked = event.target.checked
                setInvoiceRequired(checked)
                if (!checked) {
                  setInvoiceDocument("")
                  setInvoiceName("")
                }
              }}
            />
          </label>
          {invoiceRequired ? (
            <div className="table-invoice-fields">
              <label>NIT / CI<input value={invoiceDocument} onChange={(event) => setInvoiceDocument(event.target.value)} /></label>
              <label>Nombre o razon social<input value={invoiceName} onChange={(event) => setInvoiceName(event.target.value)} /></label>
            </div>
          ) : null}

          <div className="table-payment-toggle">
            <button type="button" className={paymentMethod === "cash" ? "is-active" : ""} onClick={() => setPaymentMethod("cash")}>
              Caja / efectivo
            </button>
            <button type="button" className={paymentMethod === "qr" ? "is-active" : ""} onClick={() => setPaymentMethod("qr")}>
              Pago QR
            </button>
          </div>

          {paymentMethod === "cash" ? (
            <p className="table-payment-note">Para procesar tu pedido, por favor acercate a caja y realiza el pago.</p>
          ) : paymentQr && !selectedQrExpired ? (
            <div className="table-payment-qr">
              <img src={paymentQr.imagePath} alt={paymentQr.label} />
              <strong>{paymentQr.label}</strong>
              {paymentQr.expiresAt ? <span>Valido hasta: {formatQrDate(paymentQr.expiresAt)}</span> : null}
              <button type="button" className="table-qr-download" onClick={downloadPaymentQr}>
                Descargar QR
              </button>
              <label>Comprobante<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleReceipt(event.target.files?.[0])} /></label>
              {receipt ? <small>{receipt.name}</small> : null}
            </div>
          ) : (
            <p className="table-payment-note table-payment-note--error">
              {paymentQr ? "El QR de pago ha expirado. Por favor paga en caja." : "No hay QR de pago disponible actualmente."}
            </p>
          )}

          <button type="button" className="table-submit" onClick={submitOrder} disabled={submitting}>
            {submitting ? "Enviando..." : "Confirmar pedido"}
          </button>
        </aside>
      </section>

      {mobileCartOpen ? (
        <button
          type="button"
          className="table-cart-backdrop"
          onClick={() => setMobileCartOpen(false)}
          aria-label="Cerrar pedido"
        />
      ) : null}

      {selectedProduct ? (
        <div className="table-product-modal" role="dialog" aria-modal="true">
          <div className="table-product-modal__card">
            <button type="button" className="table-modal-close" onClick={() => setSelectedProduct(null)}>Cerrar</button>
            <h2>{selectedProduct.name}</h2>
            <p>{selectedProduct.description || "Personaliza este producto."}</p>
            {selectedProduct.variants.length > 0 ? (
              <div className="table-option-group">
                <strong>Presentacion</strong>
                {selectedProduct.variants.map((variant) => (
                  <label key={variant.id}>
                    <input
                      type="radio"
                      checked={selectedVariantId === variant.id}
                      onChange={() => setSelectedVariantId(variant.id)}
                    />
                    {variant.name} - {formatMoney(variant.price)}
                  </label>
                ))}
              </div>
            ) : null}

            {selectedProduct.optionGroups.map((group) => (
              <div key={group.id} className="table-option-group">
                <strong>{group.name}{group.isRequired ? " *" : ""}</strong>
                {group.options.map((option) => (
                  <label key={option.id}>
                    <input
                      type={group.selectionType === "single" ? "radio" : "checkbox"}
                      checked={selectedOptions.includes(option.id)}
                      onChange={() => toggleOption(group, option.id)}
                    />
                    {option.name}{option.extraPrice > 0 ? ` + ${formatMoney(option.extraPrice)}` : ""}
                  </label>
                ))}
              </div>
            ))}

            <label>Notas<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Sin cebolla, poco hielo, etc." /></label>
            <div className="table-quantity">
              <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))}>-</button>
              <strong>{quantity}</strong>
              <button type="button" onClick={() => setQuantity((current) => current + 1)}>+</button>
            </div>
            <button type="button" className="table-submit" onClick={addToCart}>Agregar al carrito</button>
          </div>
        </div>
      ) : null}
    </main>
  )
}
