import { supabase } from "./supabaseClient"

export type InventoryUnitType = "unit" | "weight" | "volume" | "length" | "package" | "other"
export type InventoryMovementType =
  | "in"
  | "out"
  | "adjustment_in"
  | "adjustment_out"
  | "waste"
  | "expired"
  | "transfer"
  | "purchase"
  | "return"
  | "internal_use"
  | "correction"
export type InventoryCountType = "daily" | "weekly" | "monthly" | "quarterly" | "annual" | "custom"
export type InventoryCountStatus = "draft" | "in_progress" | "completed" | "cancelled"
export type InventoryBatchStatus = "active" | "expired" | "depleted"
export type InventoryAlertType =
  | "low_stock"
  | "out_of_stock"
  | "reorder"
  | "overstock"
  | "expiring"
  | "expired"
  | "missing_cost"
  | "missing_category"
  | "inactive"

export interface InventoryCategory {
  id: string
  name: string
  description: string | null
  parentId: string | null
  color: string | null
  icon: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface InventoryUnit {
  id: string
  name: string
  abbreviation: string
  unitType: InventoryUnitType
  isBaseUnit: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface InventoryUnitConversion {
  id: string
  fromUnitId: string
  toUnitId: string
  factor: number
  description: string | null
}

export interface InventoryLocation {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface InventorySupplier {
  id: string
  name: string
  contactName: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface InventoryItem {
  id: string
  sku: string | null
  name: string
  description: string | null
  categoryId: string | null
  unitId: string
  currentStock: number
  minimumStock: number
  maximumStock: number | null
  reorderPoint: number | null
  unitCost: number
  averageCost: number | null
  tracksBatches: boolean
  tracksExpiration: boolean
  usesFifo: boolean
  imagePath: string | null
  locationId: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface InventoryBatch {
  id: string
  itemId: string
  batchCode: string | null
  supplierId: string | null
  locationId: string | null
  initialQuantity: number
  currentQuantity: number
  unitCost: number
  purchaseDate: string | null
  expirationDate: string | null
  status: InventoryBatchStatus
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface InventoryMovement {
  id: string
  itemId: string
  batchId: string | null
  movementType: InventoryMovementType
  quantity: number
  unitId: string
  unitCost: number | null
  totalCost: number | null
  fromLocationId: string | null
  toLocationId: string | null
  supplierId: string | null
  reason: string | null
  notes: string | null
  createdBy: string | null
  createdAt: string
}

export interface InventoryCount {
  id: string
  countType: InventoryCountType
  title: string
  locationId: string | null
  categoryId: string | null
  status: InventoryCountStatus
  startedAt: string
  completedAt: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface InventoryCountItem {
  id: string
  countId: string
  itemId: string
  expectedQuantity: number
  countedQuantity: number | null
  differenceQuantity: number | null
  unitId: string
  notes: string | null
}

export interface InventoryAlert {
  id: string
  type: InventoryAlertType
  tone: "danger" | "warning" | "neutral"
  title: string
  detail: string
  itemId?: string
  batchId?: string
}

export interface InventoryDashboardData {
  categories: InventoryCategory[]
  units: InventoryUnit[]
  conversions: InventoryUnitConversion[]
  locations: InventoryLocation[]
  suppliers: InventorySupplier[]
  items: InventoryItem[]
  batches: InventoryBatch[]
  movements: InventoryMovement[]
  counts: InventoryCount[]
  countItems: InventoryCountItem[]
}

export interface InventorySummary {
  totalItems: number
  lowStock: number
  outOfStock: number
  expiringBatches: number
  expiredBatches: number
  inventoryValue: number
}

export interface InventoryItemInput {
  id?: string
  sku?: string
  name: string
  description?: string
  categoryId?: string | null
  unitId: string
  currentStock?: number
  minimumStock?: number
  maximumStock?: number | null
  reorderPoint?: number | null
  unitCost?: number
  tracksBatches?: boolean
  tracksExpiration?: boolean
  usesFifo?: boolean
  imagePath?: string | null
  locationId?: string | null
  notes?: string | null
  isActive?: boolean
}

export interface InventoryMovementInput {
  itemId: string
  movementType: InventoryMovementType
  quantity: number
  unitId: string
  batchId?: string | null
  unitCost?: number | null
  fromLocationId?: string | null
  toLocationId?: string | null
  supplierId?: string | null
  reason?: string | null
  notes?: string | null
  batchCode?: string | null
  purchaseDate?: string | null
  expirationDate?: string | null
}

type CategoryRow = {
  id: string
  name: string
  description: string | null
  parent_id: string | null
  color: string | null
  icon: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

type UnitRow = {
  id: string
  name: string
  abbreviation: string
  unit_type: InventoryUnitType
  is_base_unit: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

type ConversionRow = {
  id: string
  from_unit_id: string
  to_unit_id: string
  factor: number
  description: string | null
}

type LocationRow = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

type SupplierRow = {
  id: string
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

type ItemRow = {
  id: string
  sku: string | null
  name: string
  description: string | null
  category_id: string | null
  unit_id: string
  current_stock: number
  minimum_stock: number
  maximum_stock: number | null
  reorder_point: number | null
  unit_cost: number
  average_cost: number | null
  tracks_batches: boolean
  tracks_expiration: boolean
  uses_fifo: boolean
  image_path: string | null
  location_id: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

type BatchRow = {
  id: string
  item_id: string
  batch_code: string | null
  supplier_id: string | null
  location_id: string | null
  initial_quantity: number
  current_quantity: number
  unit_cost: number
  purchase_date: string | null
  expiration_date: string | null
  status: InventoryBatchStatus
  notes: string | null
  created_at: string
  updated_at: string
}

type MovementRow = {
  id: string
  item_id: string
  batch_id: string | null
  movement_type: InventoryMovementType
  quantity: number
  unit_id: string
  unit_cost: number | null
  total_cost: number | null
  from_location_id: string | null
  to_location_id: string | null
  supplier_id: string | null
  reason: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

type CountRow = {
  id: string
  count_type: InventoryCountType
  title: string
  location_id: string | null
  category_id: string | null
  status: InventoryCountStatus
  started_at: string
  completed_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

type CountItemRow = {
  id: string
  count_id: string
  item_id: string
  expected_quantity: number
  counted_quantity: number | null
  difference_quantity: number | null
  unit_id: string
  notes: string | null
}

const toCategory = (row: CategoryRow): InventoryCategory => ({
  id: row.id,
  name: row.name,
  description: row.description,
  parentId: row.parent_id,
  color: row.color,
  icon: row.icon,
  sortOrder: row.sort_order,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const toUnit = (row: UnitRow): InventoryUnit => ({
  id: row.id,
  name: row.name,
  abbreviation: row.abbreviation,
  unitType: row.unit_type,
  isBaseUnit: row.is_base_unit,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const toConversion = (row: ConversionRow): InventoryUnitConversion => ({
  id: row.id,
  fromUnitId: row.from_unit_id,
  toUnitId: row.to_unit_id,
  factor: Number(row.factor),
  description: row.description,
})

const toLocation = (row: LocationRow): InventoryLocation => ({
  id: row.id,
  name: row.name,
  description: row.description,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const toSupplier = (row: SupplierRow): InventorySupplier => ({
  id: row.id,
  name: row.name,
  contactName: row.contact_name,
  phone: row.phone,
  email: row.email,
  address: row.address,
  notes: row.notes,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const toItem = (row: ItemRow): InventoryItem => ({
  id: row.id,
  sku: row.sku,
  name: row.name,
  description: row.description,
  categoryId: row.category_id,
  unitId: row.unit_id,
  currentStock: Number(row.current_stock),
  minimumStock: Number(row.minimum_stock),
  maximumStock: row.maximum_stock === null ? null : Number(row.maximum_stock),
  reorderPoint: row.reorder_point === null ? null : Number(row.reorder_point),
  unitCost: Number(row.unit_cost),
  averageCost: row.average_cost === null ? null : Number(row.average_cost),
  tracksBatches: row.tracks_batches,
  tracksExpiration: row.tracks_expiration,
  usesFifo: row.uses_fifo,
  imagePath: row.image_path,
  locationId: row.location_id,
  notes: row.notes,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const toBatch = (row: BatchRow): InventoryBatch => ({
  id: row.id,
  itemId: row.item_id,
  batchCode: row.batch_code,
  supplierId: row.supplier_id,
  locationId: row.location_id,
  initialQuantity: Number(row.initial_quantity),
  currentQuantity: Number(row.current_quantity),
  unitCost: Number(row.unit_cost),
  purchaseDate: row.purchase_date,
  expirationDate: row.expiration_date,
  status: row.status,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const toMovement = (row: MovementRow): InventoryMovement => ({
  id: row.id,
  itemId: row.item_id,
  batchId: row.batch_id,
  movementType: row.movement_type,
  quantity: Number(row.quantity),
  unitId: row.unit_id,
  unitCost: row.unit_cost === null ? null : Number(row.unit_cost),
  totalCost: row.total_cost === null ? null : Number(row.total_cost),
  fromLocationId: row.from_location_id,
  toLocationId: row.to_location_id,
  supplierId: row.supplier_id,
  reason: row.reason,
  notes: row.notes,
  createdBy: row.created_by,
  createdAt: row.created_at,
})

const toCount = (row: CountRow): InventoryCount => ({
  id: row.id,
  countType: row.count_type,
  title: row.title,
  locationId: row.location_id,
  categoryId: row.category_id,
  status: row.status,
  startedAt: row.started_at,
  completedAt: row.completed_at,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const toCountItem = (row: CountItemRow): InventoryCountItem => ({
  id: row.id,
  countId: row.count_id,
  itemId: row.item_id,
  expectedQuantity: Number(row.expected_quantity),
  countedQuantity: row.counted_quantity === null ? null : Number(row.counted_quantity),
  differenceQuantity: row.difference_quantity === null ? null : Number(row.difference_quantity),
  unitId: row.unit_id,
  notes: row.notes,
})

const requireName = (value: string, label: string) => {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`${label} es obligatorio.`)
  return trimmed
}

const nonNegative = (value: number | null | undefined, label: string) => {
  if (value !== null && value !== undefined && Number(value) < 0) {
    throw new Error(`${label} no puede ser negativo.`)
  }
}

export async function fetchInventoryDashboard(): Promise<InventoryDashboardData> {
  const [
    categories,
    units,
    conversions,
    locations,
    suppliers,
    items,
    batches,
    movements,
    counts,
    countItems,
  ] = await Promise.all([
    supabase.from("inventory_categories").select("*").order("sort_order").order("name"),
    supabase.from("inventory_units").select("*").order("unit_type").order("name"),
    supabase.from("inventory_unit_conversions").select("*").order("created_at", { ascending: false }),
    supabase.from("inventory_locations").select("*").order("name"),
    supabase.from("inventory_suppliers").select("*").order("name"),
    supabase.from("inventory_items").select("*").order("name"),
    supabase.from("inventory_batches").select("*").order("expiration_date", { ascending: true, nullsFirst: false }),
    supabase.from("inventory_movements").select("*").order("created_at", { ascending: false }).limit(150),
    supabase.from("inventory_counts").select("*").order("created_at", { ascending: false }).limit(60),
    supabase.from("inventory_count_items").select("*").order("created_at", { ascending: false }).limit(500),
  ])

  const results = [categories, units, conversions, locations, suppliers, items, batches, movements, counts, countItems]
  const error = results.find((result) => result.error)?.error
  if (error) throw new Error(error.message)

  return {
    categories: ((categories.data || []) as CategoryRow[]).map(toCategory),
    units: ((units.data || []) as UnitRow[]).map(toUnit),
    conversions: ((conversions.data || []) as ConversionRow[]).map(toConversion),
    locations: ((locations.data || []) as LocationRow[]).map(toLocation),
    suppliers: ((suppliers.data || []) as SupplierRow[]).map(toSupplier),
    items: ((items.data || []) as ItemRow[]).map(toItem),
    batches: ((batches.data || []) as BatchRow[]).map(toBatch),
    movements: ((movements.data || []) as MovementRow[]).map(toMovement),
    counts: ((counts.data || []) as CountRow[]).map(toCount),
    countItems: ((countItems.data || []) as CountItemRow[]).map(toCountItem),
  }
}

export function buildInventorySummary(data: InventoryDashboardData): InventorySummary {
  const now = new Date()
  const soon = new Date()
  soon.setDate(soon.getDate() + 7)
  const activeItems = data.items.filter((item) => item.isActive)

  return {
    totalItems: activeItems.length,
    lowStock: activeItems.filter((item) => item.currentStock > 0 && item.currentStock <= item.minimumStock).length,
    outOfStock: activeItems.filter((item) => item.currentStock <= 0).length,
    expiringBatches: data.batches.filter((batch) => {
      if (!batch.expirationDate || batch.currentQuantity <= 0) return false
      const date = new Date(`${batch.expirationDate}T00:00:00`)
      return date >= now && date <= soon
    }).length,
    expiredBatches: data.batches.filter((batch) => {
      if (!batch.expirationDate || batch.currentQuantity <= 0) return false
      return new Date(`${batch.expirationDate}T23:59:59`) < now
    }).length,
    inventoryValue: activeItems.reduce((sum, item) => sum + item.currentStock * (item.averageCost ?? item.unitCost), 0),
  }
}

export function buildInventoryAlerts(data: InventoryDashboardData): InventoryAlert[] {
  const now = new Date()
  const soon = new Date()
  soon.setDate(soon.getDate() + 7)
  const alerts: InventoryAlert[] = []

  data.items.forEach((item) => {
    if (!item.isActive) {
      alerts.push({ id: `inactive-${item.id}`, type: "inactive", tone: "neutral", title: item.name, detail: "Item inactivo.", itemId: item.id })
    }
    if (item.currentStock <= 0) {
      alerts.push({ id: `out-${item.id}`, type: "out_of_stock", tone: "danger", title: item.name, detail: "Sin stock disponible.", itemId: item.id })
    } else if (item.currentStock <= item.minimumStock) {
      alerts.push({ id: `low-${item.id}`, type: "low_stock", tone: "warning", title: item.name, detail: `Stock bajo: ${item.currentStock}.`, itemId: item.id })
    }
    if (item.reorderPoint !== null && item.currentStock <= item.reorderPoint) {
      alerts.push({ id: `reorder-${item.id}`, type: "reorder", tone: "warning", title: item.name, detail: "Alcanzó el punto de reorden.", itemId: item.id })
    }
    if (item.maximumStock !== null && item.currentStock > item.maximumStock) {
      alerts.push({ id: `over-${item.id}`, type: "overstock", tone: "neutral", title: item.name, detail: "Stock por encima del máximo.", itemId: item.id })
    }
    if (item.unitCost <= 0) {
      alerts.push({ id: `cost-${item.id}`, type: "missing_cost", tone: "neutral", title: item.name, detail: "Sin costo unitario configurado.", itemId: item.id })
    }
    if (!item.categoryId) {
      alerts.push({ id: `cat-${item.id}`, type: "missing_category", tone: "neutral", title: item.name, detail: "Sin categoría asignada.", itemId: item.id })
    }
  })

  data.batches.forEach((batch) => {
    if (!batch.expirationDate || batch.currentQuantity <= 0) return
    const expiration = new Date(`${batch.expirationDate}T00:00:00`)
    if (new Date(`${batch.expirationDate}T23:59:59`) < now) {
      alerts.push({ id: `expired-${batch.id}`, type: "expired", tone: "danger", title: batch.batchCode || "Lote sin código", detail: `Vencido el ${batch.expirationDate}.`, batchId: batch.id, itemId: batch.itemId })
    } else if (expiration <= soon) {
      alerts.push({ id: `expiring-${batch.id}`, type: "expiring", tone: "warning", title: batch.batchCode || "Lote proximo", detail: `Vence el ${batch.expirationDate}.`, batchId: batch.id, itemId: batch.itemId })
    }
  })

  return alerts
}

export async function saveInventoryCategory(input: Partial<InventoryCategory>) {
  const name = requireName(input.name || "", "Nombre")
  const parentId = input.parentId || null
  let duplicateQuery = supabase
    .from("inventory_categories")
    .select("id", { count: "exact", head: true })
    .ilike("name", name)

  duplicateQuery = parentId ? duplicateQuery.eq("parent_id", parentId) : duplicateQuery.is("parent_id", null)
  if (input.id) duplicateQuery = duplicateQuery.neq("id", input.id)

  const { count: duplicateCount, error: duplicateError } = await duplicateQuery
  if (duplicateError) throw new Error(duplicateError.message)
  if ((duplicateCount || 0) > 0) throw new Error("Ya existe una categoría con ese nombre en esta sección.")

  const payload = {
    name,
    description: input.description || null,
    parent_id: parentId,
    color: input.color || null,
    icon: input.icon || null,
    sort_order: input.sortOrder ?? 0,
    is_active: input.isActive ?? true,
  }

  const query = input.id
    ? supabase.from("inventory_categories").update(payload).eq("id", input.id)
    : supabase.from("inventory_categories").insert(payload)
  const { error } = await query
  if (error) throw new Error(error.message)
}

export async function fetchInventoryItemsByCategory(categoryId: string): Promise<Array<Pick<InventoryItem, "id" | "sku" | "name">>> {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("id, sku, name")
    .eq("category_id", categoryId)
    .order("name")

  if (error) throw new Error(error.message)
  return ((data || []) as Pick<ItemRow, "id" | "sku" | "name">[]).map((row) => ({
    id: row.id,
    sku: row.sku,
    name: row.name,
  }))
}

export async function deleteInventoryCategory(id: string) {
  const { count: itemCount, error: itemError } = await supabase
    .from("inventory_items")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id)
  if (itemError) throw new Error(itemError.message)
  if ((itemCount || 0) > 0) throw new Error("No se puede eliminar una categoría con ítems. Desactívala primero.")

  const { count: childCount, error: childError } = await supabase
    .from("inventory_categories")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", id)
  if (childError) throw new Error(childError.message)
  if ((childCount || 0) > 0) throw new Error("No se puede eliminar una categoría con subcategorías.")

  const { error } = await supabase.from("inventory_categories").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

export async function saveInventoryUnit(input: Partial<InventoryUnit>) {
  const payload = {
    name: requireName(input.name || "", "Nombre"),
    abbreviation: requireName(input.abbreviation || "", "Abreviatura"),
    unit_type: input.unitType || "unit",
    is_base_unit: input.isBaseUnit ?? false,
    is_active: input.isActive ?? true,
  }

  const query = input.id
    ? supabase.from("inventory_units").update(payload).eq("id", input.id)
    : supabase.from("inventory_units").insert(payload)
  const { error } = await query
  if (error) throw new Error(error.message)
}

export async function saveInventoryLocation(input: Partial<InventoryLocation>) {
  const payload = {
    name: requireName(input.name || "", "Nombre"),
    description: input.description || null,
    is_active: input.isActive ?? true,
  }

  const query = input.id
    ? supabase.from("inventory_locations").update(payload).eq("id", input.id)
    : supabase.from("inventory_locations").insert(payload)
  const { error } = await query
  if (error) throw new Error(error.message)
}

export async function saveInventorySupplier(input: Partial<InventorySupplier>) {
  const payload = {
    name: requireName(input.name || "", "Nombre"),
    contact_name: input.contactName || null,
    phone: input.phone || null,
    email: input.email || null,
    address: input.address || null,
    notes: input.notes || null,
    is_active: input.isActive ?? true,
  }

  const query = input.id
    ? supabase.from("inventory_suppliers").update(payload).eq("id", input.id)
    : supabase.from("inventory_suppliers").insert(payload)
  const { error } = await query
  if (error) throw new Error(error.message)
}

export async function saveInventoryItem(input: InventoryItemInput) {
  requireName(input.name, "Nombre")
  if (!input.unitId) throw new Error("La unidad es obligatoria.")
  nonNegative(input.currentStock, "Stock")
  nonNegative(input.minimumStock, "Stock mínimo")
  nonNegative(input.maximumStock, "Stock máximo")
  nonNegative(input.reorderPoint, "Punto de reorden")
  nonNegative(input.unitCost, "Costo")

  const payload = {
    sku: input.sku?.trim() || null,
    name: input.name.trim(),
    description: input.description || null,
    category_id: input.categoryId || null,
    unit_id: input.unitId,
    current_stock: input.currentStock ?? 0,
    minimum_stock: input.minimumStock ?? 0,
    maximum_stock: input.maximumStock ?? null,
    reorder_point: input.reorderPoint ?? null,
    unit_cost: input.unitCost ?? 0,
    tracks_batches: input.tracksBatches ?? false,
    tracks_expiration: input.tracksExpiration ?? false,
    uses_fifo: input.usesFifo ?? true,
    image_path: input.imagePath || null,
    location_id: input.locationId || null,
    notes: input.notes || null,
    is_active: input.isActive ?? true,
  }

  const query = input.id
    ? supabase.from("inventory_items").update(payload).eq("id", input.id)
    : supabase.from("inventory_items").insert(payload)
  const { error } = await query
  if (error) throw new Error(error.message)
}

export async function deleteInventoryItem(id: string, hardDelete: boolean) {
  if (!hardDelete) {
    const { error } = await supabase.from("inventory_items").update({ is_active: false }).eq("id", id)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await supabase.from("inventory_items").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

export async function applyInventoryMovement(input: InventoryMovementInput) {
  if (!input.itemId) throw new Error("Selecciona un item.")
  if (!input.unitId) throw new Error("Selecciona una unidad.")
  if (!input.quantity || input.quantity <= 0) throw new Error("La cantidad debe ser mayor a 0.")
  nonNegative(input.unitCost, "Costo unitario")

  const { error } = await supabase.rpc("inventory_apply_movement", {
    p_item_id: input.itemId,
    p_movement_type: input.movementType,
    p_quantity: input.quantity,
    p_unit_id: input.unitId,
    p_batch_id: input.batchId || null,
    p_unit_cost: input.unitCost ?? null,
    p_from_location_id: input.fromLocationId || null,
    p_to_location_id: input.toLocationId || null,
    p_supplier_id: input.supplierId || null,
    p_reason: input.reason || null,
    p_notes: input.notes || null,
    p_batch_code: input.batchCode || null,
    p_purchase_date: input.purchaseDate || null,
    p_expiration_date: input.expirationDate || null,
  })

  if (error) throw new Error(error.message)
}

export async function createInventoryCount(input: {
  countType: InventoryCountType
  title: string
  locationId?: string | null
  categoryId?: string | null
}) {
  const { error } = await supabase.rpc("inventory_create_count", {
    p_count_type: input.countType,
    p_title: input.title,
    p_location_id: input.locationId || null,
    p_category_id: input.categoryId || null,
  })
  if (error) throw new Error(error.message)
}

export async function updateInventoryCountItem(id: string, countedQuantity: number | null, notes?: string | null) {
  if (countedQuantity !== null) nonNegative(countedQuantity, "Cantidad contada")
  const { error } = await supabase
    .from("inventory_count_items")
    .update({ counted_quantity: countedQuantity, notes: notes || null })
    .eq("id", id)
  if (error) throw new Error(error.message)
}

export async function completeInventoryCount(countId: string, applyAdjustments: boolean) {
  const { error } = await supabase.rpc("inventory_complete_count", {
    p_count_id: countId,
    p_apply_adjustments: applyAdjustments,
  })
  if (error) throw new Error(error.message)
}

export function makeInventoryCsv(rows: Array<Record<string, string | number | null | undefined>>) {
  if (rows.length === 0) return ""
  const headers = Object.keys(rows[0])
  const escape = (value: string | number | null | undefined) => {
    const text = String(value ?? "")
    return `"${text.replaceAll('"', '""')}"`
  }
  return [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n")
}

export function downloadInventoryCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
