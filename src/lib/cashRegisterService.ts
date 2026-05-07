import { resolveMediaPath } from "./contentService"
import { supabase } from "./supabaseClient"

export type CashPaymentMethod = "cash" | "qr" | "card" | "transfer" | "other"
export type CashMovementDirection = "in" | "out"
export type CashMovementStatus = "active" | "cancelled"

export interface CashSession {
  id: string
  openedByEmail: string | null
  openingOperatorName: string | null
  openedAt: string
  closedByEmail: string | null
  closingOperatorName: string | null
  closedAt: string | null
  openingCashAmount: number
  openingBalanceReason: string | null
  closingCashCounted: number | null
  expectedCashAmount: number | null
  differenceAmount: number | null
  status: "open" | "closed" | "cancelled"
  notes: string | null
  closingNotes: string | null
  sessionDate: string
}

export interface CashSummary {
  sessionId: string
  sessionDate: string
  status: string
  openingCashAmount: number
  openedByEmail: string | null
  openedAt: string
  closedByEmail: string | null
  closedAt: string | null
  totalCashIncome: number
  totalQrIncome: number
  totalCardIncome: number
  totalTransferIncome: number
  totalExpenses: number
  totalCashExpenses: number
  totalReservationPayments: number
  totalTableOrderPayments: number
  totalPosSales: number
  totalManualIncome: number
  totalCancellations: number
  expectedCashAmount: number
  grossIncome: number
}

export interface CashMovement {
  id: string
  cashSessionId: string
  movementType: string
  sourceType: string | null
  sourceId: string | null
  description: string
  amount: number
  paymentMethod: CashPaymentMethod
  direction: CashMovementDirection
  status: CashMovementStatus
  createdByEmail: string | null
  createdAt: string
  cancelledAt: string | null
  cancellationReason: string | null
}

export interface CashExpense {
  id: string
  categoryId: string | null
  amount: number
  paymentMethod: CashPaymentMethod
  reason: string
  description: string | null
  receiptImagePath: string | null
  createdByEmail: string | null
  createdAt: string
  isDeleted: boolean
}

export interface ExpenseCategory {
  id: string
  name: string
  description: string | null
  isActive: boolean
}

export interface ClosureReport {
  id: string
  cashSessionId: string
  reportDate: string
  openingCashAmount: number
  totalCashIncome: number
  totalQrIncome: number
  totalCardIncome: number
  totalTransferIncome: number
  totalExpenses: number
  totalReservationPayments: number
  totalTableOrderPayments: number
  totalPosSales: number
  totalManualIncome: number
  expectedCashAmount: number
  countedCashAmount: number
  differenceAmount: number
  openingOperatorName: string | null
  closingOperatorName: string | null
  closedByEmail: string | null
  closedAt: string
  reportSnapshot: Record<string, unknown>
}

export interface CashGameTemplate {
  id: string
  name: string
  slug: string
  defaultPrice: number
  defaultPartySize: number
  sortOrder: number
  isActive: boolean
}

export interface WalkInGame {
  id: string
  cashSessionId: string
  gameTemplateId: string | null
  gameName: string
  customerName: string | null
  customerPhone: string | null
  partySize: number
  price: number
  paymentMethod: CashPaymentMethod | null
  paymentStatus: "pending" | "paid" | "cancelled"
  receiptImagePath: string | null
  receiptDeletedAt: string | null
  status: "pending_payment" | "paid" | "in_game" | "completed" | "cancelled"
  notes: string | null
  paidAt: string | null
  startedAt: string | null
  finishedAt: string | null
  createdByEmail: string | null
  createdAt: string
}

export interface PosSaleInputItem {
  productId: string
  variantId: string | null
  quantity: number
  notes?: string
  options: string[]
}

type CashSessionRow = {
  id: string
  opened_by_email: string | null
  opening_operator_name: string | null
  opened_at: string
  closed_by_email: string | null
  closing_operator_name: string | null
  closed_at: string | null
  opening_cash_amount: number
  opening_balance_reason: string | null
  closing_cash_counted: number | null
  expected_cash_amount: number | null
  difference_amount: number | null
  status: "open" | "closed" | "cancelled"
  notes: string | null
  closing_notes: string | null
  session_date: string
}

type CashMovementRow = {
  id: string
  cash_session_id: string
  movement_type: string
  source_type: string | null
  source_id: string | null
  description: string
  amount: number
  payment_method: CashPaymentMethod
  direction: CashMovementDirection
  status: CashMovementStatus
  created_by_email: string | null
  created_at: string
  cancelled_at: string | null
  cancellation_reason: string | null
}

type CashExpenseRow = {
  id: string
  category_id: string | null
  amount: number
  payment_method: CashPaymentMethod
  reason: string
  description: string | null
  receipt_image_path: string | null
  created_by_email: string | null
  created_at: string
  is_deleted: boolean
}

type ExpenseCategoryRow = {
  id: string
  name: string
  description: string | null
  is_active: boolean
}

type ClosureReportRow = {
  id: string
  cash_session_id: string
  report_date: string
  opening_cash_amount: number
  total_cash_income: number
  total_qr_income: number
  total_card_income: number
  total_transfer_income: number
  total_expenses: number
  total_reservation_payments: number
  total_table_order_payments: number
  total_pos_sales: number
  total_manual_income: number
  expected_cash_amount: number
  counted_cash_amount: number
  difference_amount: number
  opening_operator_name: string | null
  closing_operator_name: string | null
  closed_by_email: string | null
  closed_at: string
  report_snapshot: Record<string, unknown>
}

type CashGameTemplateRow = {
  id: string
  name: string
  slug: string
  default_price: number
  default_party_size: number
  sort_order: number
  is_active: boolean
}

type WalkInGameRow = {
  id: string
  cash_session_id: string
  game_template_id: string | null
  game_name: string
  customer_name: string | null
  customer_phone: string | null
  party_size: number
  price: number
  payment_method: CashPaymentMethod | null
  payment_status: "pending" | "paid" | "cancelled"
  receipt_image_path: string | null
  receipt_deleted_at: string | null
  status: "pending_payment" | "paid" | "in_game" | "completed" | "cancelled"
  notes: string | null
  paid_at: string | null
  started_at: string | null
  finished_at: string | null
  created_by_email: string | null
  created_at: string
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

const toNumber = (value: unknown) => Number(value || 0)

const mapCashSession = (row: CashSessionRow): CashSession => ({
  id: row.id,
  openedByEmail: row.opened_by_email,
  openingOperatorName: row.opening_operator_name,
  openedAt: row.opened_at,
  closedByEmail: row.closed_by_email,
  closingOperatorName: row.closing_operator_name,
  closedAt: row.closed_at,
  openingCashAmount: Number(row.opening_cash_amount),
  openingBalanceReason: row.opening_balance_reason,
  closingCashCounted: row.closing_cash_counted === null ? null : Number(row.closing_cash_counted),
  expectedCashAmount: row.expected_cash_amount === null ? null : Number(row.expected_cash_amount),
  differenceAmount: row.difference_amount === null ? null : Number(row.difference_amount),
  status: row.status,
  notes: row.notes,
  closingNotes: row.closing_notes,
  sessionDate: row.session_date,
})

const normalizeSummary = (value: Record<string, unknown>): CashSummary => ({
  sessionId: String(value.sessionId || ""),
  sessionDate: String(value.sessionDate || ""),
  status: String(value.status || ""),
  openingCashAmount: toNumber(value.openingCashAmount),
  openedByEmail: (value.openedByEmail as string | null) || null,
  openedAt: String(value.openedAt || ""),
  closedByEmail: (value.closedByEmail as string | null) || null,
  closedAt: (value.closedAt as string | null) || null,
  totalCashIncome: toNumber(value.totalCashIncome),
  totalQrIncome: toNumber(value.totalQrIncome),
  totalCardIncome: toNumber(value.totalCardIncome),
  totalTransferIncome: toNumber(value.totalTransferIncome),
  totalExpenses: toNumber(value.totalExpenses),
  totalCashExpenses: toNumber(value.totalCashExpenses),
  totalReservationPayments: toNumber(value.totalReservationPayments),
  totalTableOrderPayments: toNumber(value.totalTableOrderPayments),
  totalPosSales: toNumber(value.totalPosSales),
  totalManualIncome: toNumber(value.totalManualIncome),
  totalCancellations: toNumber(value.totalCancellations),
  expectedCashAmount: toNumber(value.expectedCashAmount),
  grossIncome: toNumber(value.grossIncome),
})

export async function uploadCashReceipt(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Sube una imagen JPG, PNG o WEBP.")
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("El comprobante debe pesar 5 MB o menos.")
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const path = `uploads/cash-receipts/receipt-${newId()}-${Date.now()}.${extension}`
  const { error } = await supabase.storage.from("receipts").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  })

  if (error) throw new Error(error.message)
  return path
}

export async function cleanupOldCashReceipts() {
  const { error } = await supabase.rpc("cleanup_old_cash_receipts")
  if (error) console.warn("No se pudieron limpiar comprobantes vencidos:", error.message)
}

export async function fetchCashGameTemplates() {
  const { data, error } = await supabase
    .from("cash_game_templates")
    .select("id, name, slug, default_price, default_party_size, sort_order, is_active")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })

  if (error) throw new Error(error.message)

  return ((data || []) as CashGameTemplateRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    defaultPrice: Number(row.default_price),
    defaultPartySize: row.default_party_size,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  }))
}

export async function createCashGameTemplate(input: {
  name: string
  defaultPrice?: number
  defaultPartySize?: number
  sortOrder?: number
}) {
  const { error } = await supabase.rpc("create_cash_game_template", {
    p_name: input.name,
    p_default_price: input.defaultPrice ?? 0,
    p_default_party_size: input.defaultPartySize ?? 1,
    p_sort_order: input.sortOrder ?? 0,
  })

  if (error) throw new Error(error.message)
}

export async function updateCashGameTemplate(id: string, patch: Partial<CashGameTemplate>) {
  const payload: Record<string, string | number | boolean> = {}
  if ("name" in patch && patch.name !== undefined) payload.name = patch.name
  if ("defaultPrice" in patch && patch.defaultPrice !== undefined) payload.default_price = patch.defaultPrice
  if ("defaultPartySize" in patch && patch.defaultPartySize !== undefined) {
    payload.default_party_size = patch.defaultPartySize
  }
  if ("sortOrder" in patch && patch.sortOrder !== undefined) payload.sort_order = patch.sortOrder
  if ("isActive" in patch && patch.isActive !== undefined) payload.is_active = patch.isActive

  const { error } = await supabase.from("cash_game_templates").update(payload).eq("id", id)
  if (error) throw new Error(error.message)
}

export async function fetchWalkInGames(cashSessionId: string) {
  const { data, error } = await supabase
    .from("walk_in_games")
    .select("id, cash_session_id, game_template_id, game_name, customer_name, customer_phone, party_size, price, payment_method, payment_status, receipt_image_path, receipt_deleted_at, status, notes, paid_at, started_at, finished_at, created_by_email, created_at")
    .eq("cash_session_id", cashSessionId)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)

  return ((data || []) as WalkInGameRow[]).map((row) => ({
    id: row.id,
    cashSessionId: row.cash_session_id,
    gameTemplateId: row.game_template_id,
    gameName: row.game_name,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    partySize: row.party_size,
    price: Number(row.price),
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    receiptImagePath: row.receipt_image_path ? resolveMediaPath(row.receipt_image_path, "receipts") : null,
    receiptDeletedAt: row.receipt_deleted_at,
    status: row.status,
    notes: row.notes,
    paidAt: row.paid_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    createdByEmail: row.created_by_email,
    createdAt: row.created_at,
  }))
}

export async function createWalkInGame(input: {
  gameTemplateId?: string | null
  gameName: string
  customerName?: string
  customerPhone?: string
  partySize: number
  price: number
  notes?: string
}) {
  const { error } = await supabase.rpc("create_walk_in_game", {
    p_game_template_id: input.gameTemplateId || null,
    p_game_name: input.gameName,
    p_customer_name: input.customerName || null,
    p_customer_phone: input.customerPhone || null,
    p_party_size: input.partySize,
    p_price: input.price,
    p_notes: input.notes || null,
  })

  if (error) throw new Error(error.message)
}

export async function registerWalkInGamePayment(input: {
  gameId: string
  paymentMethod: CashPaymentMethod
  receiptImagePath?: string | null
  customerName?: string
  customerPhone?: string
  notes?: string
}) {
  const { error } = await supabase.rpc("register_walk_in_game_payment", {
    p_game_id: input.gameId,
    p_payment_method: input.paymentMethod,
    p_receipt_image_path: input.receiptImagePath || null,
    p_customer_name: input.customerName || null,
    p_customer_phone: input.customerPhone || null,
    p_notes: input.notes || null,
  })

  if (error) throw new Error(error.message)
}

export async function startWalkInGame(gameId: string) {
  const { error } = await supabase.rpc("start_walk_in_game", { p_game_id: gameId })
  if (error) throw new Error(error.message)
}

export async function finishWalkInGame(gameId: string) {
  const { error } = await supabase.rpc("finish_walk_in_game", { p_game_id: gameId })
  if (error) throw new Error(error.message)
}

export async function fetchOpenCashSession() {
  const { data, error } = await supabase.rpc("get_open_cash_session")
  if (error) throw new Error(error.message)
  return data ? mapCashSession(data as CashSessionRow) : null
}

export async function openCashSession(
  openingCashAmount: number,
  notes?: string,
  openingOperatorName?: string,
  openingBalanceReason?: string,
) {
  const { error } = await supabase.rpc("open_cash_session", {
    p_opening_cash_amount: openingCashAmount,
    p_notes: notes || null,
    p_opening_operator_name: openingOperatorName || null,
    p_opening_balance_reason: openingBalanceReason || null,
  })
  if (error) throw new Error(error.message)
}

export async function fetchCashSummary(cashSessionId: string) {
  const { data, error } = await supabase.rpc("cash_summary_for_session", {
    p_cash_session_id: cashSessionId,
  })
  if (error) throw new Error(error.message)
  return normalizeSummary((data || {}) as Record<string, unknown>)
}

export async function fetchCashMovements(cashSessionId: string, includeCancelled = false) {
  let query = supabase
    .from("cash_movements")
    .select("id, cash_session_id, movement_type, source_type, source_id, description, amount, payment_method, direction, status, created_by_email, created_at, cancelled_at, cancellation_reason")
    .eq("cash_session_id", cashSessionId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })

  if (!includeCancelled) {
    query = query.eq("status", "active")
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return ((data || []) as CashMovementRow[]).map((row) => ({
    id: row.id,
    cashSessionId: row.cash_session_id,
    movementType: row.movement_type,
    sourceType: row.source_type,
    sourceId: row.source_id,
    description: row.description,
    amount: Number(row.amount),
    paymentMethod: row.payment_method,
    direction: row.direction,
    status: row.status,
    createdByEmail: row.created_by_email,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at,
    cancellationReason: row.cancellation_reason,
  }))
}

export async function fetchExpenseCategories() {
  const { data, error } = await supabase
    .from("expense_categories")
    .select("id, name, description, is_active")
    .eq("is_active", true)
    .order("name", { ascending: true })

  if (error) throw new Error(error.message)
  return ((data || []) as ExpenseCategoryRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
  }))
}

export async function fetchCashExpenses(cashSessionId: string) {
  const { data, error } = await supabase
    .from("cash_expenses")
    .select("id, category_id, amount, payment_method, reason, description, receipt_image_path, created_by_email, created_at, is_deleted")
    .eq("cash_session_id", cashSessionId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return ((data || []) as CashExpenseRow[]).map((row) => ({
    id: row.id,
    categoryId: row.category_id,
    amount: Number(row.amount),
    paymentMethod: row.payment_method,
    reason: row.reason,
    description: row.description,
    receiptImagePath: row.receipt_image_path ? resolveMediaPath(row.receipt_image_path, "receipts") : null,
    createdByEmail: row.created_by_email,
    createdAt: row.created_at,
    isDeleted: row.is_deleted,
  }))
}

export async function createManualIncome(input: {
  amount: number
  paymentMethod: CashPaymentMethod
  description: string
  customerName?: string
  customerPhone?: string
  notes?: string
}) {
  const { error } = await supabase.rpc("create_manual_cash_income", {
    p_amount: input.amount,
    p_payment_method: input.paymentMethod,
    p_description: input.description,
    p_customer_name: input.customerName || null,
    p_customer_phone: input.customerPhone || null,
    p_notes: input.notes || null,
  })
  if (error) throw new Error(error.message)
}

export async function createCashExpense(input: {
  amount: number
  paymentMethod: CashPaymentMethod
  reason: string
  categoryId?: string | null
  description?: string
  receiptImagePath?: string | null
}) {
  const { error } = await supabase.rpc("create_cash_expense", {
    p_amount: input.amount,
    p_payment_method: input.paymentMethod,
    p_reason: input.reason,
    p_category_id: input.categoryId || null,
    p_description: input.description || null,
    p_receipt_image_path: input.receiptImagePath || null,
  })
  if (error) throw new Error(error.message)
}

export async function createPosSale(input: {
  customerName?: string
  customerPhone?: string
  discountAmount: number
  paymentMethod: CashPaymentMethod
  receiptImagePath?: string | null
  invoiceRequired?: boolean
  invoiceDocument?: string | null
  invoiceName?: string | null
  notes?: string
  items: PosSaleInputItem[]
}) {
  const { error } = await supabase.rpc("create_pos_sale", {
    p_customer_name: input.customerName || null,
    p_customer_phone: input.customerPhone || null,
    p_discount_amount: input.discountAmount,
    p_payment_method: input.paymentMethod,
    p_receipt_image_path: input.receiptImagePath || null,
    p_invoice_required: input.invoiceRequired ?? false,
    p_invoice_document: input.invoiceDocument || null,
    p_invoice_name: input.invoiceName || null,
    p_notes: input.notes || null,
    p_items: input.items.map((item) => ({
      product_id: item.productId,
      variant_id: item.variantId,
      quantity: item.quantity,
      notes: item.notes || "",
      options: item.options.map((optionId) => ({ option_id: optionId })),
    })),
  })
  if (error) throw new Error(error.message)
}

export async function registerReservationPayment(input: {
  bookingId: string
  paymentMethod: CashPaymentMethod
  receiptImagePath?: string | null
  notes?: string
}) {
  const { error } = await supabase.rpc("register_reservation_payment", {
    p_booking_id: input.bookingId,
    p_payment_method: input.paymentMethod,
    p_receipt_image_path: input.receiptImagePath || null,
    p_notes: input.notes || null,
  })
  if (error) throw new Error(error.message)
}

export async function registerTableOrderPayment(input: {
  orderId: string
  paymentMethod: CashPaymentMethod
  notes?: string
}) {
  const { error } = await supabase.rpc("register_table_order_payment", {
    p_order_id: input.orderId,
    p_payment_method: input.paymentMethod,
    p_notes: input.notes || null,
  })
  if (error) throw new Error(error.message)
}

export async function closeCashSession(
  countedCashAmount: number,
  closingNotes?: string,
  closingOperatorName?: string,
) {
  const { error } = await supabase.rpc("close_cash_session", {
    p_counted_cash_amount: countedCashAmount,
    p_closing_notes: closingNotes || null,
    p_closing_operator_name: closingOperatorName || null,
  })
  if (error) throw new Error(error.message)
}

export async function cancelCashMovement(movementId: string, reason: string, authorizationKey: string) {
  const { error } = await supabase.rpc("cancel_cash_movement", {
    p_movement_id: movementId,
    p_reason: reason,
    p_authorization_key: authorizationKey,
  })
  if (error) throw new Error(error.message)
}

export async function startBookingGame(bookingId: string) {
  const { error } = await supabase.rpc("start_booking_game", { p_booking_id: bookingId })
  if (error) throw new Error(error.message)
}

export async function finishBookingGame(bookingId: string) {
  const { error } = await supabase.rpc("finish_booking_game", { p_booking_id: bookingId })
  if (error) throw new Error(error.message)
}

export async function markBookingNoShow(bookingId: string, reason?: string) {
  const { error } = await supabase.rpc("mark_booking_no_show", {
    p_booking_id: bookingId,
    p_reason: reason || null,
  })
  if (error) throw new Error(error.message)
}

export async function fetchCashSessions(limit = 30) {
  const { data, error } = await supabase
    .from("cash_sessions")
    .select("id, opened_by_email, opening_operator_name, opened_at, closed_by_email, closing_operator_name, closed_at, opening_cash_amount, opening_balance_reason, closing_cash_counted, expected_cash_amount, difference_amount, status, notes, closing_notes, session_date")
    .order("session_date", { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return ((data || []) as CashSessionRow[]).map(mapCashSession)
}

export async function fetchClosureReports(limit = 30) {
  const { data, error } = await supabase
    .from("cash_closure_reports")
    .select("id, cash_session_id, report_date, opening_cash_amount, total_cash_income, total_qr_income, total_card_income, total_transfer_income, total_expenses, total_reservation_payments, total_table_order_payments, total_pos_sales, total_manual_income, expected_cash_amount, counted_cash_amount, difference_amount, opening_operator_name, closing_operator_name, closed_by_email, closed_at, report_snapshot")
    .order("closed_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return ((data || []) as ClosureReportRow[]).map((row) => ({
    id: row.id,
    cashSessionId: row.cash_session_id,
    reportDate: row.report_date,
    openingCashAmount: Number(row.opening_cash_amount),
    totalCashIncome: Number(row.total_cash_income),
    totalQrIncome: Number(row.total_qr_income),
    totalCardIncome: Number(row.total_card_income),
    totalTransferIncome: Number(row.total_transfer_income),
    totalExpenses: Number(row.total_expenses),
    totalReservationPayments: Number(row.total_reservation_payments),
    totalTableOrderPayments: Number(row.total_table_order_payments),
    totalPosSales: Number(row.total_pos_sales),
    totalManualIncome: Number(row.total_manual_income),
    expectedCashAmount: Number(row.expected_cash_amount),
    countedCashAmount: Number(row.counted_cash_amount),
    differenceAmount: Number(row.difference_amount),
    openingOperatorName: row.opening_operator_name,
    closingOperatorName: row.closing_operator_name,
    closedByEmail: row.closed_by_email,
    closedAt: row.closed_at,
    reportSnapshot: row.report_snapshot || {},
  }))
}
