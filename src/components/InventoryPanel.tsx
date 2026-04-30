import { useEffect, useMemo, useState } from "react"
import {
  FaBell,
  FaBoxes,
  FaChartLine,
  FaClipboardCheck,
  FaDownload,
  FaEdit,
  FaExclamationTriangle,
  FaFileCsv,
  FaFilePdf,
  FaLayerGroup,
  FaPlus,
  FaSave,
  FaSearch,
  FaTags,
  FaTimes,
  FaTrash,
  FaTruck,
  FaWarehouse,
} from "react-icons/fa"
import {
  applyInventoryMovement,
  buildInventoryAlerts,
  buildInventorySummary,
  completeInventoryCount,
  createInventoryCount,
  deleteInventoryCategory,
  deleteInventoryItem,
  downloadInventoryCsv,
  fetchInventoryItemsByCategory,
  fetchInventoryDashboard,
  makeInventoryCsv,
  saveInventoryCategory,
  saveInventoryItem,
  saveInventoryLocation,
  saveInventorySupplier,
  saveInventoryUnit,
  updateInventoryCountItem,
  type InventoryBatch,
  type InventoryCategory,
  type InventoryCount,
  type InventoryCountItem,
  type InventoryDashboardData,
  type InventoryItem,
  type InventoryItemInput,
  type InventoryLocation,
  type InventoryMovement,
  type InventoryMovementInput,
  type InventoryMovementType,
  type InventorySupplier,
  type InventoryUnit,
  type InventoryUnitType,
} from "../lib/inventoryService"
import { exportTablePDF } from "../lib/pdfUtils"
import "../styles/InventoryPanel.css"

type InventoryTab =
  | "summary"
  | "items"
  | "categories"
  | "batches"
  | "movements"
  | "counts"
  | "alerts"
  | "reports"
  | "suppliers"

type InventoryModal =
  | { type: "item"; item?: InventoryItem }
  | { type: "category"; category?: InventoryCategory; parentId?: string | null }
  | { type: "deleteCategory"; category: InventoryCategory; relatedItems: Array<Pick<InventoryItem, "id" | "sku" | "name">> }
  | { type: "unit"; unit?: InventoryUnit }
  | { type: "location"; location?: InventoryLocation }
  | { type: "supplier"; supplier?: InventorySupplier }
  | { type: "movement"; item?: InventoryItem; movementType?: InventoryMovementType }
  | { type: "count"; count?: InventoryCount }
  | { type: "detail"; item: InventoryItem }
  | null

interface InventoryPanelProps {
  isSuperAdmin: boolean
}

const emptyData: InventoryDashboardData = {
  categories: [],
  units: [],
  conversions: [],
  locations: [],
  suppliers: [],
  items: [],
  batches: [],
  movements: [],
  counts: [],
  countItems: [],
}

const movementLabels: Record<InventoryMovementType, string> = {
  in: "Entrada",
  out: "Salida",
  adjustment_in: "Ajuste +",
  adjustment_out: "Ajuste -",
  waste: "Merma",
  expired: "Vencimiento",
  transfer: "Transferencia",
  purchase: "Compra",
  return: "Devolución",
  internal_use: "Uso interno",
  correction: "Corrección",
}

const unitTypeLabels: Record<InventoryUnitType, string> = {
  unit: "Unidad",
  weight: "Peso",
  volume: "Volumen",
  length: "Longitud",
  package: "Empaque",
  other: "Otro",
}

const tabs: Array<{ id: InventoryTab; label: string; icon: typeof FaBoxes }> = [
  { id: "summary", label: "Resumen", icon: FaChartLine },
  { id: "items", label: "Ítems / Insumos", icon: FaBoxes },
  { id: "categories", label: "Categorías", icon: FaLayerGroup },
  { id: "batches", label: "Lotes", icon: FaTags },
  { id: "movements", label: "Movimientos", icon: FaWarehouse },
  { id: "counts", label: "Conteos", icon: FaClipboardCheck },
  { id: "alerts", label: "Alertas", icon: FaBell },
  { id: "reports", label: "Reportes", icon: FaDownload },
  { id: "suppliers", label: "Proveedores", icon: FaTruck },
]

const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`
}

const money = (value: number) => `Bs ${value.toFixed(2)}`

export default function InventoryPanel({ isSuperAdmin }: InventoryPanelProps) {
  const [data, setData] = useState<InventoryDashboardData>(emptyData)
  const [activeTab, setActiveTab] = useState<InventoryTab>("summary")
  const [modal, setModal] = useState<InventoryModal>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState("")
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [locationFilter, setLocationFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("active")
  const [reportType, setReportType] = useState("stock")
  const [dateFrom, setDateFrom] = useState(today().slice(0, 8) + "01")
  const [dateTo, setDateTo] = useState(today())

  const loadInventory = async (withLoader = true) => {
    if (withLoader) setLoading(true)
    try {
      setData(await fetchInventoryDashboard())
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar inventario.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInventory().catch((error) => console.error(error))
  }, [])

  const categoryById = useMemo(() => new Map(data.categories.map((category) => [category.id, category])), [data.categories])
  const unitById = useMemo(() => new Map(data.units.map((unit) => [unit.id, unit])), [data.units])
  const locationById = useMemo(() => new Map(data.locations.map((location) => [location.id, location])), [data.locations])
  const supplierById = useMemo(() => new Map(data.suppliers.map((supplier) => [supplier.id, supplier])), [data.suppliers])
  const itemById = useMemo(() => new Map(data.items.map((item) => [item.id, item])), [data.items])
  const summary = useMemo(() => buildInventorySummary(data), [data])
  const alerts = useMemo(() => buildInventoryAlerts(data), [data])
  const parentCategories = data.categories.filter((category) => !category.parentId)
  const childCategories = data.categories.filter((category) => category.parentId)

  const getCategoryLabel = (categoryId?: string | null) => {
    if (!categoryId) return "Sin categoría"
    const category = categoryById.get(categoryId)
    if (!category) return "Sin categoría"
    const parent = category.parentId ? categoryById.get(category.parentId) : null
    return parent ? `${parent.name} / ${category.name}` : category.name
  }

  const visibleItems = data.items.filter((item) => {
    const category = item.categoryId ? categoryById.get(item.categoryId) : null
    const text = `${item.sku || ""} ${item.name} ${item.description || ""} ${category?.name || ""}`.toLowerCase()
    const matchesSearch = text.includes(search.trim().toLowerCase())
    const matchesCategory = categoryFilter === "all" || item.categoryId === categoryFilter || category?.parentId === categoryFilter
    const matchesLocation = locationFilter === "all" || item.locationId === locationFilter
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && item.isActive) ||
      (statusFilter === "inactive" && !item.isActive) ||
      (statusFilter === "low" && item.currentStock > 0 && item.currentStock <= item.minimumStock) ||
      (statusFilter === "out" && item.currentStock <= 0)

    return matchesSearch && matchesCategory && matchesLocation && matchesStatus
  })

  const movementRows = data.movements.filter((movement) => {
    const date = movement.createdAt.slice(0, 10)
    return date >= dateFrom && date <= dateTo
  })

  const reportRows = useMemo(() => {
    if (reportType === "movements") {
      return movementRows.map((movement) => ({
        Fecha: new Date(movement.createdAt).toLocaleString("es-BO"),
        Item: itemById.get(movement.itemId)?.name || "-",
        Tipo: movementLabels[movement.movementType],
        Cantidad: movement.quantity,
        Unidad: unitById.get(movement.unitId)?.abbreviation || "-",
        Motivo: movement.reason || "",
        Total: movement.totalCost ?? "",
      }))
    }

    if (reportType === "waste") {
      return movementRows
        .filter((movement) => ["waste", "expired"].includes(movement.movementType))
        .map((movement) => ({
          Fecha: new Date(movement.createdAt).toLocaleString("es-BO"),
          Item: itemById.get(movement.itemId)?.name || "-",
          Tipo: movementLabels[movement.movementType],
          Cantidad: movement.quantity,
          Motivo: movement.reason || "",
          Notas: movement.notes || "",
        }))
    }

    if (reportType === "batches") {
      return data.batches.map((batch) => ({
        Item: itemById.get(batch.itemId)?.name || "-",
        Lote: batch.batchCode || "-",
        Disponible: batch.currentQuantity,
        Vence: batch.expirationDate || "-",
        Estado: batch.status,
        Proveedor: batch.supplierId ? supplierById.get(batch.supplierId)?.name || "-" : "-",
      }))
    }

    return visibleItems.map((item) => ({
      SKU: item.sku || "-",
      Item: item.name,
      Categoría: getCategoryLabel(item.categoryId),
      Stock: item.currentStock,
      Unidad: unitById.get(item.unitId)?.abbreviation || "-",
      "Stock mínimo": item.minimumStock,
      Costo: item.unitCost,
      Valor: item.currentStock * (item.averageCost ?? item.unitCost),
      Ubicación: item.locationId ? locationById.get(item.locationId)?.name || "-" : "-",
    }))
  }, [categoryById, data.batches, itemById, locationById, movementRows, reportType, supplierById, unitById, visibleItems])

  const refreshAfter = async (action: () => Promise<void>, success: string) => {
    setWorking(true)
    setMessage("")
    try {
      await action()
      setMessage(success)
      setModal(null)
      await loadInventory(false)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo completar la acción.")
    } finally {
      setWorking(false)
    }
  }

  const exportCurrentCsv = () => {
    const csv = makeInventoryCsv(reportRows)
    downloadInventoryCsv(`inventario-${reportType}-${today()}.csv`, csv)
  }

  const exportCurrentPdf = () => {
    exportTablePDF({
      title: `Reporte de inventario: ${reportType}`,
      subtitle: `Generado el ${new Date().toLocaleString("es-BO")}`,
      filters: [`Desde ${dateFrom}`, `Hasta ${dateTo}`, `Categoría ${categoryFilter}`, `Ubicación ${locationFilter}`],
      columns: Object.keys(reportRows[0] || { SinDatos: "" }).map((key) => ({ key, header: key })),
      rows: reportRows,
      totals: [`Filas: ${reportRows.length}`, `Valor estimado: ${money(summary.inventoryValue)}`],
      filename: `inventario-${reportType}-${today()}.pdf`,
    })
  }

  if (loading) {
    return (
      <section className="inventory-panel">
        <div className="admin-panel-card">Cargando inventario...</div>
      </section>
    )
  }

  return (
    <section className="inventory-panel">
      <div className="admin-section-heading inventory-hero">
        <div>
          <span className="admin-kicker">Inventario global</span>
          <h2>Control global de insumos, lotes, movimientos y reportes</h2>
          <p className="admin-template-help">
            Independiente de productos y pedidos. Listo para cafeterías, pizzerías, alitas, bares y restaurantes.
          </p>
        </div>
        <div className="admin-inline-actions">
          <button type="button" className="btn-approve" onClick={() => setModal({ type: "item" })}>
            <FaPlus />
            Nuevo item
          </button>
          <button type="button" className="btn-edit" onClick={() => setModal({ type: "movement", movementType: "purchase" })}>
            <FaWarehouse />
            Registrar entrada
          </button>
          <button type="button" className="btn-reject" onClick={() => setModal({ type: "movement", movementType: "waste" })}>
            <FaTrash />
            Registrar merma
          </button>
          <button type="button" className="btn-edit" onClick={exportCurrentCsv}>
            <FaFileCsv />
            CSV
          </button>
        </div>
      </div>

      {message ? <div className="admin-alert admin-alert--neutral">{message}</div> : null}

      <div className="inventory-tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? "is-active" : ""}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === "summary" ? (
        <InventorySummaryView
          data={data}
          summary={summary}
          alerts={alerts}
          itemById={itemById}
          unitById={unitById}
          setActiveTab={setActiveTab}
          setModal={setModal}
        />
      ) : null}

      {activeTab === "items" ? (
        <>
          <InventoryFilters
            search={search}
            setSearch={setSearch}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            locationFilter={locationFilter}
            setLocationFilter={setLocationFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            categories={data.categories}
            locations={data.locations}
          />
          <div className="inventory-item-grid">
            {visibleItems.map((item) => (
              <article key={item.id} className={`inventory-item-card ${item.currentStock <= item.minimumStock ? "is-low" : ""}`}>
                <div className="inventory-item-card__top">
                  <div>
                    <span>{item.sku || "Sin SKU"}</span>
                    <h3>{item.name}</h3>
                  </div>
                  <strong>{item.currentStock} {unitById.get(item.unitId)?.abbreviation}</strong>
                </div>
                <p>{getCategoryLabel(item.categoryId)}</p>
                <div className="inventory-stock-bar">
                  <span style={{ width: `${Math.min(100, item.minimumStock > 0 ? (item.currentStock / item.minimumStock) * 100 : 100)}%` }} />
                </div>
                <div className="inventory-mini-stats">
                  <span>Min {item.minimumStock}</span>
                  <span>{money(item.unitCost)}</span>
                  <span>{item.locationId ? locationById.get(item.locationId)?.name : "Sin ubicación"}</span>
                </div>
                <div className="admin-inline-actions">
                  <button type="button" className="btn-edit" onClick={() => setModal({ type: "detail", item })}>Detalle</button>
                  <button type="button" className="btn-edit" onClick={() => setModal({ type: "item", item })}><FaEdit />Editar</button>
                  <button type="button" className="btn-approve" onClick={() => setModal({ type: "movement", item, movementType: "purchase" })}>Entrada</button>
                  <button type="button" className="btn-reject" onClick={() => setModal({ type: "movement", item, movementType: "waste" })}>Merma</button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => refreshAfter(() => deleteInventoryItem(item.id, isSuperAdmin), isSuperAdmin ? "Item eliminado." : "Item desactivado.")}
                  >
                    {isSuperAdmin ? "Eliminar" : "Desactivar"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}

      {activeTab === "categories" ? (
        <InventoryCategoriesView
          parents={parentCategories}
          children={childCategories}
          setModal={setModal}
          items={data.items}
          toggleCategoryStatus={(category) => refreshAfter(() => saveInventoryCategory(category), category.isActive ? "Subcategoría activada." : "Subcategoría desactivada.")}
          requestDeleteCategory={async (category) => {
            try {
              const relatedItems = await fetchInventoryItemsByCategory(category.id)
              setModal({ type: "deleteCategory", category, relatedItems })
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "No se pudo validar la categoría.")
            }
          }}
        />
      ) : null}

      {activeTab === "batches" ? (
        <InventoryBatchesView batches={data.batches} itemById={itemById} supplierById={supplierById} locationById={locationById} />
      ) : null}

      {activeTab === "movements" ? (
        <InventoryMovementsView movements={data.movements} itemById={itemById} unitById={unitById} locationById={locationById} />
      ) : null}

      {activeTab === "counts" ? (
        <InventoryCountsView
          counts={data.counts}
          countItems={data.countItems}
          itemById={itemById}
          unitById={unitById}
          setModal={setModal}
          saveCountItem={(id, quantity, notes) => refreshAfter(() => updateInventoryCountItem(id, quantity, notes), "Conteo actualizado.")}
          completeCount={(id, apply) => refreshAfter(() => completeInventoryCount(id, apply), "Conteo completado.")}
        />
      ) : null}

      {activeTab === "alerts" ? <InventoryAlertsView alerts={alerts} itemById={itemById} /> : null}

      {activeTab === "reports" ? (
        <InventoryReportsView
          reportType={reportType}
          setReportType={setReportType}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          rows={reportRows}
          exportCsv={exportCurrentCsv}
          exportPdf={exportCurrentPdf}
        />
      ) : null}

      {activeTab === "suppliers" ? (
        <InventorySuppliersView
          suppliers={data.suppliers}
          locations={data.locations}
          units={data.units}
          setModal={setModal}
        />
      ) : null}

      {modal ? (
        <InventoryModalView
          modal={modal}
          data={data}
          working={working}
          isSuperAdmin={isSuperAdmin}
          close={() => setModal(null)}
          save={(action, success) => refreshAfter(action, success)}
        />
      ) : null}
    </section>
  )
}

function InventorySummaryView({
  data,
  summary,
  alerts,
  itemById,
  unitById,
  setActiveTab,
  setModal,
}: {
  data: InventoryDashboardData
  summary: ReturnType<typeof buildInventorySummary>
  alerts: ReturnType<typeof buildInventoryAlerts>
  itemById: Map<string, InventoryItem>
  unitById: Map<string, InventoryUnit>
  setActiveTab: (tab: InventoryTab) => void
  setModal: (modal: InventoryModal) => void
}) {
  const latestMovements = data.movements.slice(0, 8)
  return (
    <>
      <div className="inventory-stat-grid">
        <InventoryStat label="Total de ítems" value={summary.totalItems} />
        <InventoryStat label="Stock bajo" value={summary.lowStock} tone="warning" />
        <InventoryStat label="Sin stock" value={summary.outOfStock} tone="danger" />
        <InventoryStat label="Por vencer" value={summary.expiringBatches} tone="warning" />
        <InventoryStat label="Vencidos" value={summary.expiredBatches} tone="danger" />
        <InventoryStat label="Valor estimado" value={money(summary.inventoryValue)} />
      </div>
      <div className="inventory-dashboard-grid">
        <section className="admin-panel-card">
          <div className="admin-section-heading">
            <div>
              <span className="admin-kicker">Operacion</span>
              <h2>Acciones rapidas</h2>
            </div>
          </div>
          <div className="inventory-quick-actions">
            <button type="button" className="btn-approve" onClick={() => setModal({ type: "movement", movementType: "purchase" })}>Registrar compra / entrada</button>
            <button type="button" className="btn-reject" onClick={() => setModal({ type: "movement", movementType: "waste" })}>Registrar merma</button>
            <button type="button" className="btn-edit" onClick={() => setModal({ type: "movement", movementType: "transfer" })}>Transferir ubicación</button>
            <button type="button" className="btn-edit" onClick={() => setModal({ type: "count" })}>Crear conteo</button>
          </div>
        </section>
        <section className="admin-panel-card">
          <div className="admin-section-heading">
            <div>
              <span className="admin-kicker">Alertas</span>
              <h2>Atencion requerida</h2>
            </div>
            <button type="button" className="btn-edit" onClick={() => setActiveTab("alerts")}>Ver todas</button>
          </div>
          <div className="inventory-alert-list">
            {alerts.slice(0, 6).map((alert) => (
              <article key={alert.id} className={`inventory-alert inventory-alert--${alert.tone}`}>
                <strong>{alert.title}</strong>
                <span>{alert.detail}</span>
              </article>
            ))}
            {alerts.length === 0 ? <p className="admin-template-help">Sin alertas por ahora. Eso siempre da paz.</p> : null}
          </div>
        </section>
        <section className="admin-panel-card">
          <div className="admin-section-heading">
            <div>
              <span className="admin-kicker">Kardex</span>
              <h2>Movimientos recientes</h2>
            </div>
            <button type="button" className="btn-edit" onClick={() => setActiveTab("movements")}>Ver kardex</button>
          </div>
          <div className="inventory-compact-list">
            {latestMovements.map((movement) => (
              <article key={movement.id}>
                <strong>{itemById.get(movement.itemId)?.name || "Item"}</strong>
                <span>{movementLabels[movement.movementType]} | {movement.quantity} {unitById.get(movement.unitId)?.abbreviation}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}

function InventoryStat({ label, value, tone = "ok" }: { label: string; value: string | number; tone?: "ok" | "warning" | "danger" }) {
  return (
    <article className={`inventory-stat inventory-stat--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function InventoryFilters({
  search,
  setSearch,
  categoryFilter,
  setCategoryFilter,
  locationFilter,
  setLocationFilter,
  statusFilter,
  setStatusFilter,
  categories,
  locations,
}: {
  search: string
  setSearch: (value: string) => void
  categoryFilter: string
  setCategoryFilter: (value: string) => void
  locationFilter: string
  setLocationFilter: (value: string) => void
  statusFilter: string
  setStatusFilter: (value: string) => void
  categories: InventoryCategory[]
  locations: InventoryLocation[]
}) {
  return (
    <section className="inventory-filter-card">
      <label>
        <FaSearch />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, SKU o categoría" />
      </label>
      <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
        <option value="all">Todas las categorías</option>
        {categories.map((category) => <option key={category.id} value={category.id}>{category.parentId ? "↳ " : ""}{category.name}</option>)}
      </select>
      <select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
        <option value="all">Todas las ubicaciones</option>
        {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
      </select>
      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
        <option value="active">Activos</option>
        <option value="all">Todos</option>
        <option value="low">Stock bajo</option>
        <option value="out">Sin stock</option>
        <option value="inactive">Inactivos</option>
      </select>
    </section>
  )
}

function InventoryCategoriesView({
  parents,
  children,
  items,
  setModal,
  toggleCategoryStatus,
  requestDeleteCategory,
}: {
  parents: InventoryCategory[]
  children: InventoryCategory[]
  items: InventoryItem[]
  setModal: (modal: InventoryModal) => void
  toggleCategoryStatus: (category: InventoryCategory) => void
  requestDeleteCategory: (category: InventoryCategory) => void
}) {
  return (
    <section className="admin-panel-card">
      <div className="admin-section-heading">
        <div>
          <span className="admin-kicker">Secciones</span>
          <h2>Categorías y subcategorías</h2>
        </div>
        <button type="button" className="btn-approve" onClick={() => setModal({ type: "category" })}><FaPlus />Categoría</button>
      </div>
      <div className="inventory-category-grid">
        {parents.map((category) => {
          const subcategories = children.filter((child) => child.parentId === category.id)
          return (
            <article key={category.id} className="inventory-category-card">
              <div>
                <span style={{ background: category.color || "#84ba4a" }} />
                <strong>{category.name}</strong>
              </div>
              <p>{category.description || "Sin descripción"}</p>
              <div className="inventory-subcategory-panel">
                <div className="inventory-subcategory-panel__head">
                  <span>Subcategorías</span>
                  <strong>{subcategories.length}</strong>
                </div>
                <div className="inventory-subcategory-list">
                  {subcategories.map((child) => {
                    const relatedCount = items.filter((item) => item.categoryId === child.id).length
                    return (
                      <div key={child.id} className={!child.isActive ? "inventory-subcategory-row is-muted" : "inventory-subcategory-row"}>
                        <div>
                          <strong>{child.name}</strong>
                          <span>{relatedCount} ítems</span>
                        </div>
                        <div className="inventory-subcategory-actions">
                          <button type="button" className="btn-edit" onClick={() => setModal({ type: "category", category: child })}><FaEdit />Editar</button>
                          <button
                            type="button"
                            className={child.isActive ? "btn-reject" : "btn-approve"}
                            onClick={() => toggleCategoryStatus({ ...child, isActive: !child.isActive })}
                          >
                            {child.isActive ? "Desactivar" : "Activar"}
                          </button>
                          <button type="button" className="btn-danger" onClick={() => requestDeleteCategory(child)}><FaTrash />Eliminar</button>
                        </div>
                      </div>
                    )
                  })}
                  {subcategories.length === 0 ? <p className="inventory-empty-note">Sin subcategorías disponibles.</p> : null}
                </div>
              </div>
              <div className="admin-inline-actions">
                <button type="button" className="btn-edit" onClick={() => setModal({ type: "category", category })}>Editar categoría</button>
                <button type="button" className="btn-approve" onClick={() => setModal({ type: "category", parentId: category.id })}>Subcategoría</button>
                <button type="button" className="btn-reject" onClick={() => requestDeleteCategory(category)}>Eliminar</button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function InventoryBatchesView({
  batches,
  itemById,
  supplierById,
  locationById,
}: {
  batches: InventoryBatch[]
  itemById: Map<string, InventoryItem>
  supplierById: Map<string, InventorySupplier>
  locationById: Map<string, InventoryLocation>
}) {
  return (
    <section className="admin-panel-card">
      <InventoryTable
        columns={["Item", "Lote", "Disponible", "Compra", "Vence", "Proveedor", "Ubicación", "Estado"]}
        rows={batches.map((batch) => [
          itemById.get(batch.itemId)?.name || "-",
          batch.batchCode || "-",
          batch.currentQuantity,
          batch.purchaseDate || "-",
          batch.expirationDate || "-",
          batch.supplierId ? supplierById.get(batch.supplierId)?.name || "-" : "-",
          batch.locationId ? locationById.get(batch.locationId)?.name || "-" : "-",
          batch.status,
        ])}
      />
    </section>
  )
}

function InventoryMovementsView({
  movements,
  itemById,
  unitById,
  locationById,
}: {
  movements: InventoryMovement[]
  itemById: Map<string, InventoryItem>
  unitById: Map<string, InventoryUnit>
  locationById: Map<string, InventoryLocation>
}) {
  return (
    <section className="admin-panel-card">
      <InventoryTable
        columns={["Fecha", "Item", "Tipo", "Cantidad", "Origen", "Destino", "Motivo", "Total"]}
        rows={movements.map((movement) => [
          new Date(movement.createdAt).toLocaleString("es-BO"),
          itemById.get(movement.itemId)?.name || "-",
          movementLabels[movement.movementType],
          `${movement.quantity} ${unitById.get(movement.unitId)?.abbreviation || ""}`,
          movement.fromLocationId ? locationById.get(movement.fromLocationId)?.name || "-" : "-",
          movement.toLocationId ? locationById.get(movement.toLocationId)?.name || "-" : "-",
          movement.reason || "-",
          movement.totalCost === null ? "-" : money(movement.totalCost),
        ])}
      />
    </section>
  )
}

function InventoryCountsView({
  counts,
  countItems,
  itemById,
  unitById,
  setModal,
  saveCountItem,
  completeCount,
}: {
  counts: InventoryCount[]
  countItems: InventoryCountItem[]
  itemById: Map<string, InventoryItem>
  unitById: Map<string, InventoryUnit>
  setModal: (modal: InventoryModal) => void
  saveCountItem: (id: string, quantity: number | null, notes?: string | null) => void
  completeCount: (id: string, applyAdjustments: boolean) => void
}) {
  const [expanded, setExpanded] = useState<string | null>(counts[0]?.id || null)
  return (
    <section className="admin-panel-card">
      <div className="admin-section-heading">
        <div>
          <span className="admin-kicker">Conteos</span>
          <h2>Diarios, semanales, mensuales y personalizados</h2>
        </div>
        <button type="button" className="btn-approve" onClick={() => setModal({ type: "count" })}><FaPlus />Nuevo conteo</button>
      </div>
      <div className="inventory-count-list">
        {counts.map((count) => {
          const rows = countItems.filter((item) => item.countId === count.id)
          return (
            <article key={count.id} className="inventory-count-card">
              <button type="button" onClick={() => setExpanded((current) => current === count.id ? null : count.id)}>
                <strong>{count.title}</strong>
                <span>{count.countType} | {count.status} | {rows.length} ítems</span>
              </button>
              {expanded === count.id ? (
                <div>
                  <InventoryTable
                    columns={["Item", "Esperado", "Contado", "Dif.", "Notas", "Guardar"]}
                    rows={rows.map((row) => [
                      itemById.get(row.itemId)?.name || "-",
                      `${row.expectedQuantity} ${unitById.get(row.unitId)?.abbreviation || ""}`,
                      <input key={`${row.id}-qty`} type="number" step="0.001" defaultValue={row.countedQuantity ?? ""} id={`count-${row.id}`} />,
                      row.differenceQuantity ?? "-",
                      <input key={`${row.id}-notes`} defaultValue={row.notes || ""} id={`notes-${row.id}`} />,
                      <button
                        key={`${row.id}-save`}
                        type="button"
                        className="btn-edit"
                        onClick={() => {
                          const qtyInput = document.getElementById(`count-${row.id}`) as HTMLInputElement | null
                          const notesInput = document.getElementById(`notes-${row.id}`) as HTMLInputElement | null
                          saveCountItem(row.id, qtyInput?.value ? Number(qtyInput.value) : null, notesInput?.value || "")
                        }}
                      >
                        Guardar
                      </button>,
                    ])}
                  />
                  {count.status !== "completed" ? (
                    <div className="admin-inline-actions">
                      <button type="button" className="btn-approve" onClick={() => completeCount(count.id, false)}>Completar sin ajustar</button>
                      <button type="button" className="btn-reject" onClick={() => completeCount(count.id, true)}>Completar y ajustar stock</button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function InventoryAlertsView({ alerts, itemById }: { alerts: ReturnType<typeof buildInventoryAlerts>; itemById: Map<string, InventoryItem> }) {
  return (
    <section className="inventory-alert-grid">
      {alerts.map((alert) => (
        <article key={alert.id} className={`inventory-alert-card inventory-alert-card--${alert.tone}`}>
          <span>{alert.type}</span>
          <strong>{alert.title}</strong>
          <p>{alert.detail}</p>
          {alert.itemId ? <small>{itemById.get(alert.itemId)?.sku || "Sin SKU"}</small> : null}
        </article>
      ))}
      {alerts.length === 0 ? <section className="admin-panel-card">No hay alertas activas.</section> : null}
    </section>
  )
}

function InventoryReportsView({
  reportType,
  setReportType,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  rows,
  exportCsv,
  exportPdf,
}: {
  reportType: string
  setReportType: (value: string) => void
  dateFrom: string
  setDateFrom: (value: string) => void
  dateTo: string
  setDateTo: (value: string) => void
  rows: Array<Record<string, string | number | null | undefined>>
  exportCsv: () => void
  exportPdf: () => void
}) {
  return (
    <section className="admin-panel-card">
      <div className="inventory-report-toolbar">
        <select value={reportType} onChange={(event) => setReportType(event.target.value)}>
          <option value="stock">Stock actual</option>
          <option value="movements">Movimientos por fecha</option>
          <option value="waste">Mermas y vencimientos</option>
          <option value="batches">Lotes y vencimientos</option>
        </select>
        <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        <button type="button" className="btn-edit" onClick={exportCsv}><FaFileCsv />CSV</button>
        <button type="button" className="btn-approve" onClick={exportPdf}><FaFilePdf />PDF</button>
      </div>
      <InventoryTable columns={Object.keys(rows[0] || { Reporte: "Sin datos" })} rows={rows.map((row) => Object.values(row))} />
    </section>
  )
}

function InventorySuppliersView({
  suppliers,
  locations,
  units,
  setModal,
}: {
  suppliers: InventorySupplier[]
  locations: InventoryLocation[]
  units: InventoryUnit[]
  setModal: (modal: InventoryModal) => void
}) {
  return (
    <div className="inventory-dashboard-grid">
      <section className="admin-panel-card">
        <div className="admin-section-heading">
          <div><span className="admin-kicker">Proveedores</span><h2>Contactos de compra</h2></div>
          <button type="button" className="btn-approve" onClick={() => setModal({ type: "supplier" })}><FaPlus />Proveedor</button>
        </div>
        <InventoryTable
          columns={["Nombre", "Contacto", "Teléfono", "Email", "Estado", "Editar"]}
          rows={suppliers.map((supplier) => [
            supplier.name,
            supplier.contactName || "-",
            supplier.phone || "-",
            supplier.email || "-",
            supplier.isActive ? "Activo" : "Inactivo",
            <button key={supplier.id} type="button" className="btn-edit" onClick={() => setModal({ type: "supplier", supplier })}>Editar</button>,
          ])}
        />
      </section>
      <section className="admin-panel-card">
        <div className="admin-section-heading">
          <div><span className="admin-kicker">Ubicaciones</span><h2>Almacenes y zonas</h2></div>
          <button type="button" className="btn-approve" onClick={() => setModal({ type: "location" })}><FaPlus />Ubicación</button>
        </div>
        <InventoryTable
          columns={["Nombre", "Descripción", "Estado", "Editar"]}
          rows={locations.map((location) => [
            location.name,
            location.description || "-",
            location.isActive ? "Activa" : "Inactiva",
            <button key={location.id} type="button" className="btn-edit" onClick={() => setModal({ type: "location", location })}>Editar</button>,
          ])}
        />
      </section>
      <section className="admin-panel-card">
        <div className="admin-section-heading">
          <div><span className="admin-kicker">Unidades</span><h2>Medidas y empaques</h2></div>
          <button type="button" className="btn-approve" onClick={() => setModal({ type: "unit" })}><FaPlus />Unidad</button>
        </div>
        <InventoryTable
          columns={["Nombre", "Abrev.", "Tipo", "Base", "Estado", "Editar"]}
          rows={units.map((unit) => [
            unit.name,
            unit.abbreviation,
            unitTypeLabels[unit.unitType],
            unit.isBaseUnit ? "Si" : "No",
            unit.isActive ? "Activa" : "Inactiva",
            <button key={unit.id} type="button" className="btn-edit" onClick={() => setModal({ type: "unit", unit })}>Editar</button>,
          ])}
        />
      </section>
    </div>
  )
}

function InventoryTable({ columns, rows }: { columns: string[]; rows: Array<Array<React.ReactNode>> }) {
  return (
    <div className="inventory-table-wrap">
      <table className="inventory-table">
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? <p className="admin-template-help">Sin registros para mostrar.</p> : null}
    </div>
  )
}

function InventoryModalView({
  modal,
  data,
  working,
  isSuperAdmin,
  close,
  save,
}: {
  modal: Exclude<InventoryModal, null>
  data: InventoryDashboardData
  working: boolean
  isSuperAdmin: boolean
  close: () => void
  save: (action: () => Promise<void>, success: string) => void
}) {
  const category = modal.type === "category" ? modal.category : undefined
  const deleteCategoryTarget = modal.type === "deleteCategory" ? modal.category : undefined
  const item = modal.type === "item" ? modal.item : undefined
  const unit = modal.type === "unit" ? modal.unit : undefined
  const location = modal.type === "location" ? modal.location : undefined
  const supplier = modal.type === "supplier" ? modal.supplier : undefined
  const detailItem = modal.type === "detail" ? modal.item : undefined
  const initialItem: InventoryItemInput = {
    id: item?.id,
    sku: item?.sku || "",
    name: item?.name || "",
    description: item?.description || "",
    categoryId: item?.categoryId || "",
    unitId: item?.unitId || data.units[0]?.id || "",
    currentStock: item?.currentStock || 0,
    minimumStock: item?.minimumStock || 0,
    maximumStock: item?.maximumStock,
    reorderPoint: item?.reorderPoint,
    unitCost: item?.unitCost || 0,
    tracksBatches: item?.tracksBatches || false,
    tracksExpiration: item?.tracksExpiration || false,
    usesFifo: item?.usesFifo ?? true,
    imagePath: item?.imagePath || "",
    locationId: item?.locationId || "",
    notes: item?.notes || "",
    isActive: item?.isActive ?? true,
  }
  const itemCategory = item?.categoryId ? data.categories.find((entry) => entry.id === item.categoryId) : undefined
  const initialParentCategoryId = itemCategory?.parentId || itemCategory?.id || ""
  const initialSubcategoryId = itemCategory?.parentId ? itemCategory.id : ""
  const [selectedParentCategoryId, setSelectedParentCategoryId] = useState(initialParentCategoryId)
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(initialSubcategoryId)
  const [itemForm, setItemForm] = useState<InventoryItemInput>(initialItem)
  const [categoryForm, setCategoryForm] = useState({
    id: category?.id,
    name: category?.name || "",
    description: category?.description || "",
    parentId: category?.parentId || (modal.type === "category" ? modal.parentId || "" : ""),
    color: category?.color || "#84ba4a",
    icon: category?.icon || "",
    sortOrder: category?.sortOrder || 0,
    isActive: category?.isActive ?? true,
  })
  const [unitForm, setUnitForm] = useState({
    id: unit?.id,
    name: unit?.name || "",
    abbreviation: unit?.abbreviation || "",
    unitType: unit?.unitType || "unit" as InventoryUnitType,
    isBaseUnit: unit?.isBaseUnit || false,
    isActive: unit?.isActive ?? true,
  })
  const [locationForm, setLocationForm] = useState({
    id: location?.id,
    name: location?.name || "",
    description: location?.description || "",
    isActive: location?.isActive ?? true,
  })
  const [supplierForm, setSupplierForm] = useState({
    id: supplier?.id,
    name: supplier?.name || "",
    contactName: supplier?.contactName || "",
    phone: supplier?.phone || "",
    email: supplier?.email || "",
    address: supplier?.address || "",
    notes: supplier?.notes || "",
    isActive: supplier?.isActive ?? true,
  })
  const selectedMovementItem = modal.type === "movement" ? modal.item : undefined
  const [movementForm, setMovementForm] = useState<InventoryMovementInput>({
    itemId: selectedMovementItem?.id || data.items[0]?.id || "",
    movementType: modal.type === "movement" ? modal.movementType || "purchase" : "purchase",
    quantity: 1,
    unitId: selectedMovementItem?.unitId || data.items[0]?.unitId || data.units[0]?.id || "",
    unitCost: selectedMovementItem?.unitCost || 0,
    fromLocationId: "",
    toLocationId: selectedMovementItem?.locationId || data.locations[0]?.id || "",
    supplierId: "",
    reason: "",
    notes: "",
    batchCode: "",
    purchaseDate: today(),
    expirationDate: "",
  })
  const [countForm, setCountForm] = useState({
    countType: "monthly" as const,
    title: `Conteo ${today()}`,
    locationId: "",
    categoryId: "",
  })
  const parentCategories = data.categories.filter((entry) => !entry.parentId)
  const selectedSubcategories = data.categories.filter((entry) => entry.parentId === selectedParentCategoryId)

  const updateItemCategory = (parentId: string, childId = "") => {
    setSelectedParentCategoryId(parentId)
    setSelectedSubcategoryId(childId)
    setItemForm((current) => ({ ...current, categoryId: childId || parentId || "" }))
  }

  const saveCategoryForm = () => {
    const startedAsSubcategory = Boolean(category?.parentId || (modal.type === "category" && modal.parentId))
    if (startedAsSubcategory && !categoryForm.parentId) {
      save(async () => {
        throw new Error("Selecciona una categoría padre para guardar la subcategoría.")
      }, "")
      return
    }
    save(() => saveInventoryCategory(categoryForm), categoryForm.parentId ? "Subcategoría guardada." : "Categoría guardada.")
  }

  const saveItemForm = () => {
    if (selectedSubcategoryId) {
      const subcategory = data.categories.find((entry) => entry.id === selectedSubcategoryId)
      if (!subcategory || subcategory.parentId !== selectedParentCategoryId) {
        save(async () => {
          throw new Error("La subcategoría seleccionada no pertenece a la categoría elegida.")
        }, "")
        return
      }
    }
    save(() => saveInventoryItem({ ...itemForm, categoryId: selectedSubcategoryId || selectedParentCategoryId || null }), "Item guardado.")
  }

  useEffect(() => {
    if (movementForm.itemId) {
      const nextItem = data.items.find((entry) => entry.id === movementForm.itemId)
      if (nextItem && nextItem.unitId !== movementForm.unitId) {
        setMovementForm((current) => ({
          ...current,
          unitId: nextItem.unitId,
          unitCost: nextItem.unitCost,
          toLocationId: current.toLocationId || nextItem.locationId || "",
        }))
      }
    }
  }, [data.items, movementForm.itemId, movementForm.unitId])

  const title =
    modal.type === "item" ? (item ? "Editar item" : "Nuevo item") :
    modal.type === "category" ? (category ? "Editar categoría" : "Nueva categoría") :
    modal.type === "deleteCategory" ? (deleteCategoryTarget?.parentId ? "Eliminar subcategoría" : "Eliminar categoría") :
    modal.type === "unit" ? (unit ? "Editar unidad" : "Nueva unidad") :
    modal.type === "location" ? (location ? "Editar ubicación" : "Nueva ubicación") :
    modal.type === "supplier" ? (supplier ? "Editar proveedor" : "Nuevo proveedor") :
    modal.type === "movement" ? "Registrar movimiento" :
    modal.type === "count" ? "Crear conteo" :
    "Detalle del item"

  return (
    <div className="admin-modal" role="dialog" aria-modal="true">
      <div className="admin-modal-card inventory-modal-card">
        <div className="admin-modal-head">
          <div>
            <span className="admin-kicker">Inventario</span>
            <h2>{title}</h2>
          </div>
          <button type="button" className="admin-modal-close" onClick={close}><FaTimes /></button>
        </div>

        {modal.type === "detail" && detailItem ? (
          <InventoryItemDetail item={detailItem} data={data} isSuperAdmin={isSuperAdmin} />
        ) : null}

        {modal.type === "deleteCategory" && deleteCategoryTarget ? (
          <div className={modal.relatedItems.length > 0 ? "inventory-delete-modal inventory-delete-modal--blocked" : "inventory-delete-modal"}>
            {modal.relatedItems.length > 0 ? (
              <>
                <div className="inventory-delete-alert">
                  <FaExclamationTriangle />
                  <div>
                    <h3>No se puede eliminar esta subcategoría</h3>
                    <p>Esta subcategoría tiene ítems registrados. Para eliminarla, primero debes mover, editar o desactivar esos ítems.</p>
                  </div>
                </div>
                <div className="inventory-related-list">
                  {modal.relatedItems.map((relatedItem) => (
                    <span key={relatedItem.id}>
                      {relatedItem.sku ? `SKU: ${relatedItem.sku} - ${relatedItem.name}` : relatedItem.name}
                    </span>
                  ))}
                </div>
                <div className="admin-inline-actions">
                  <button type="button" className="btn-danger" onClick={close}>Entendido</button>
                </div>
              </>
            ) : (
              <>
                <p>¿Seguro que deseas eliminar la {deleteCategoryTarget.parentId ? "subcategoría" : "categoría"} “{deleteCategoryTarget.name}”? Esta acción no se puede deshacer.</p>
                <div className="admin-inline-actions">
                  <button type="button" className="btn-edit" onClick={close}>Cancelar</button>
                  <button type="button" className="btn-danger" disabled={working} onClick={() => save(() => deleteInventoryCategory(deleteCategoryTarget.id), deleteCategoryTarget.parentId ? "Subcategoría eliminada correctamente." : "Categoría eliminada correctamente.")}>
                    <FaTrash />
                    Eliminar
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}

        {modal.type === "item" ? (
          <div className="admin-modal-form inventory-form-grid">
            <label>SKU<input value={itemForm.sku || ""} onChange={(event) => setItemForm({ ...itemForm, sku: event.target.value })} /></label>
            <label>Nombre<input value={itemForm.name} onChange={(event) => setItemForm({ ...itemForm, name: event.target.value })} /></label>
            <label>Categoría<select value={selectedParentCategoryId} onChange={(event) => updateItemCategory(event.target.value)}><option value="">Sin categoría</option>{parentCategories.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
            <label>Subcategoría<select value={selectedSubcategoryId} disabled={!selectedParentCategoryId || selectedSubcategories.length === 0} onChange={(event) => updateItemCategory(selectedParentCategoryId, event.target.value)}><option value="">{selectedParentCategoryId && selectedSubcategories.length === 0 ? "Sin subcategorías disponibles" : "Sin subcategoría"}</option>{selectedSubcategories.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
            <label>Unidad<select value={itemForm.unitId} onChange={(event) => setItemForm({ ...itemForm, unitId: event.target.value })}>{data.units.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} ({entry.abbreviation})</option>)}</select></label>
            <label>Stock inicial<input type="number" step="0.001" value={itemForm.currentStock || 0} onChange={(event) => setItemForm({ ...itemForm, currentStock: Number(event.target.value) })} /></label>
            <label>Stock mínimo<input type="number" step="0.001" value={itemForm.minimumStock || 0} onChange={(event) => setItemForm({ ...itemForm, minimumStock: Number(event.target.value) })} /></label>
            <label>Stock máximo<input type="number" step="0.001" value={itemForm.maximumStock ?? ""} onChange={(event) => setItemForm({ ...itemForm, maximumStock: event.target.value ? Number(event.target.value) : null })} /></label>
            <label>Punto de reorden<input type="number" step="0.001" value={itemForm.reorderPoint ?? ""} onChange={(event) => setItemForm({ ...itemForm, reorderPoint: event.target.value ? Number(event.target.value) : null })} /></label>
            <label>Costo unitario<input type="number" step="0.0001" value={itemForm.unitCost || 0} onChange={(event) => setItemForm({ ...itemForm, unitCost: Number(event.target.value) })} /></label>
            <label>Ubicación<select value={itemForm.locationId || ""} onChange={(event) => setItemForm({ ...itemForm, locationId: event.target.value })}><option value="">Sin ubicación</option>{data.locations.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
            <label>Imagen / ruta<input value={itemForm.imagePath || ""} onChange={(event) => setItemForm({ ...itemForm, imagePath: event.target.value })} /></label>
            <label>Descripción<textarea value={itemForm.description || ""} onChange={(event) => setItemForm({ ...itemForm, description: event.target.value })} /></label>
            <label className="admin-switch"><input type="checkbox" checked={itemForm.tracksBatches || false} onChange={(event) => setItemForm({ ...itemForm, tracksBatches: event.target.checked })} />Maneja lotes</label>
            <label className="admin-switch"><input type="checkbox" checked={itemForm.tracksExpiration || false} onChange={(event) => setItemForm({ ...itemForm, tracksExpiration: event.target.checked })} />Maneja vencimiento</label>
            <label className="admin-switch"><input type="checkbox" checked={itemForm.usesFifo || false} onChange={(event) => setItemForm({ ...itemForm, usesFifo: event.target.checked })} />Usa FIFO</label>
            <label className="admin-switch"><input type="checkbox" checked={itemForm.isActive || false} onChange={(event) => setItemForm({ ...itemForm, isActive: event.target.checked })} />Activo</label>
            <label className="inventory-form-wide">Notas<textarea value={itemForm.notes || ""} onChange={(event) => setItemForm({ ...itemForm, notes: event.target.value })} /></label>
            <button type="button" className="btn-approve inventory-form-wide" disabled={working} onClick={saveItemForm}><FaSave />Guardar item</button>
          </div>
        ) : null}

        {modal.type === "category" ? (
          <div className="admin-modal-form inventory-form-grid">
            <label>Nombre<input value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} /></label>
            <label>Categoría padre<select value={categoryForm.parentId || ""} onChange={(event) => setCategoryForm({ ...categoryForm, parentId: event.target.value })}><option value="">Categoría principal</option>{data.categories.filter((entry) => !entry.parentId && entry.id !== categoryForm.id).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
            <label>Color<input type="color" value={categoryForm.color} onChange={(event) => setCategoryForm({ ...categoryForm, color: event.target.value })} /></label>
            <label>Icono<input value={categoryForm.icon} onChange={(event) => setCategoryForm({ ...categoryForm, icon: event.target.value })} /></label>
            <label>Orden<input type="number" value={categoryForm.sortOrder} onChange={(event) => setCategoryForm({ ...categoryForm, sortOrder: Number(event.target.value) })} /></label>
            <label className="admin-switch"><input type="checkbox" checked={categoryForm.isActive} onChange={(event) => setCategoryForm({ ...categoryForm, isActive: event.target.checked })} />Activa</label>
            <label className="inventory-form-wide">Descripción<textarea value={categoryForm.description} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} /></label>
            <button type="button" className="btn-approve inventory-form-wide" disabled={working} onClick={saveCategoryForm}>Guardar {categoryForm.parentId ? "subcategoría" : "categoría"}</button>
          </div>
        ) : null}

        {modal.type === "unit" ? (
          <div className="admin-modal-form inventory-form-grid">
            <label>Nombre<input value={unitForm.name} onChange={(event) => setUnitForm({ ...unitForm, name: event.target.value })} /></label>
            <label>Abreviatura<input value={unitForm.abbreviation} onChange={(event) => setUnitForm({ ...unitForm, abbreviation: event.target.value })} /></label>
            <label>Tipo<select value={unitForm.unitType} onChange={(event) => setUnitForm({ ...unitForm, unitType: event.target.value as InventoryUnitType })}>{Object.entries(unitTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label className="admin-switch"><input type="checkbox" checked={unitForm.isBaseUnit} onChange={(event) => setUnitForm({ ...unitForm, isBaseUnit: event.target.checked })} />Unidad base</label>
            <label className="admin-switch"><input type="checkbox" checked={unitForm.isActive} onChange={(event) => setUnitForm({ ...unitForm, isActive: event.target.checked })} />Activa</label>
            <button type="button" className="btn-approve inventory-form-wide" disabled={working} onClick={() => save(() => saveInventoryUnit(unitForm), "Unidad guardada.")}>Guardar unidad</button>
          </div>
        ) : null}

        {modal.type === "location" ? (
          <div className="admin-modal-form inventory-form-grid">
            <label>Nombre<input value={locationForm.name} onChange={(event) => setLocationForm({ ...locationForm, name: event.target.value })} /></label>
            <label className="admin-switch"><input type="checkbox" checked={locationForm.isActive} onChange={(event) => setLocationForm({ ...locationForm, isActive: event.target.checked })} />Activa</label>
            <label className="inventory-form-wide">Descripción<textarea value={locationForm.description} onChange={(event) => setLocationForm({ ...locationForm, description: event.target.value })} /></label>
            <button type="button" className="btn-approve inventory-form-wide" disabled={working} onClick={() => save(() => saveInventoryLocation(locationForm), "Ubicación guardada.")}>Guardar ubicación</button>
          </div>
        ) : null}

        {modal.type === "supplier" ? (
          <div className="admin-modal-form inventory-form-grid">
            <label>Nombre<input value={supplierForm.name} onChange={(event) => setSupplierForm({ ...supplierForm, name: event.target.value })} /></label>
            <label>Contacto<input value={supplierForm.contactName} onChange={(event) => setSupplierForm({ ...supplierForm, contactName: event.target.value })} /></label>
            <label>Teléfono<input value={supplierForm.phone} onChange={(event) => setSupplierForm({ ...supplierForm, phone: event.target.value })} /></label>
            <label>Email<input value={supplierForm.email} onChange={(event) => setSupplierForm({ ...supplierForm, email: event.target.value })} /></label>
            <label>Dirección<input value={supplierForm.address} onChange={(event) => setSupplierForm({ ...supplierForm, address: event.target.value })} /></label>
            <label className="admin-switch"><input type="checkbox" checked={supplierForm.isActive} onChange={(event) => setSupplierForm({ ...supplierForm, isActive: event.target.checked })} />Activo</label>
            <label className="inventory-form-wide">Notas<textarea value={supplierForm.notes} onChange={(event) => setSupplierForm({ ...supplierForm, notes: event.target.value })} /></label>
            <button type="button" className="btn-approve inventory-form-wide" disabled={working} onClick={() => save(() => saveInventorySupplier(supplierForm), "Proveedor guardado.")}>Guardar proveedor</button>
          </div>
        ) : null}

        {modal.type === "movement" ? (
          <div className="admin-modal-form inventory-form-grid">
            <label>Item<select value={movementForm.itemId} onChange={(event) => setMovementForm({ ...movementForm, itemId: event.target.value })}>{data.items.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
            <label>Tipo<select value={movementForm.movementType} onChange={(event) => setMovementForm({ ...movementForm, movementType: event.target.value as InventoryMovementType })}>{Object.entries(movementLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label>Cantidad<input type="number" step="0.001" value={movementForm.quantity} onChange={(event) => setMovementForm({ ...movementForm, quantity: Number(event.target.value) })} /></label>
            <label>Unidad<select value={movementForm.unitId} onChange={(event) => setMovementForm({ ...movementForm, unitId: event.target.value })}>{data.units.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
            <label>Costo unitario<input type="number" step="0.0001" value={movementForm.unitCost || 0} onChange={(event) => setMovementForm({ ...movementForm, unitCost: Number(event.target.value) })} /></label>
            <label>Proveedor<select value={movementForm.supplierId || ""} onChange={(event) => setMovementForm({ ...movementForm, supplierId: event.target.value })}><option value="">Sin proveedor</option>{data.suppliers.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
            <label>Origen<select value={movementForm.fromLocationId || ""} onChange={(event) => setMovementForm({ ...movementForm, fromLocationId: event.target.value })}><option value="">Sin origen</option>{data.locations.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
            <label>Destino<select value={movementForm.toLocationId || ""} onChange={(event) => setMovementForm({ ...movementForm, toLocationId: event.target.value })}><option value="">Sin destino</option>{data.locations.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
            <label>Lote existente<select value={movementForm.batchId || ""} onChange={(event) => setMovementForm({ ...movementForm, batchId: event.target.value })}><option value="">Crear/ninguno</option>{data.batches.filter((entry) => entry.itemId === movementForm.itemId).map((entry) => <option key={entry.id} value={entry.id}>{entry.batchCode || entry.id.slice(0, 8)}</option>)}</select></label>
            <label>Codigo de lote<input value={movementForm.batchCode || ""} onChange={(event) => setMovementForm({ ...movementForm, batchCode: event.target.value })} /></label>
            <label>Fecha compra<input type="date" value={movementForm.purchaseDate || ""} onChange={(event) => setMovementForm({ ...movementForm, purchaseDate: event.target.value })} /></label>
            <label>Vencimiento<input type="date" value={movementForm.expirationDate || ""} onChange={(event) => setMovementForm({ ...movementForm, expirationDate: event.target.value })} /></label>
            <label>Motivo<input value={movementForm.reason || ""} onChange={(event) => setMovementForm({ ...movementForm, reason: event.target.value })} /></label>
            <label className="inventory-form-wide">Notas<textarea value={movementForm.notes || ""} onChange={(event) => setMovementForm({ ...movementForm, notes: event.target.value })} /></label>
            <button type="button" className="btn-approve inventory-form-wide" disabled={working} onClick={() => save(() => applyInventoryMovement(movementForm), "Movimiento registrado.")}>Registrar movimiento</button>
          </div>
        ) : null}

        {modal.type === "count" ? (
          <div className="admin-modal-form inventory-form-grid">
            <label>Título<input value={countForm.title} onChange={(event) => setCountForm({ ...countForm, title: event.target.value })} /></label>
            <label>Tipo<select value={countForm.countType} onChange={(event) => setCountForm({ ...countForm, countType: event.target.value as typeof countForm.countType })}><option value="daily">Diario</option><option value="weekly">Semanal</option><option value="monthly">Mensual</option><option value="quarterly">Trimestral</option><option value="annual">Anual</option><option value="custom">Personalizado</option></select></label>
            <label>Categoría<select value={countForm.categoryId} onChange={(event) => setCountForm({ ...countForm, categoryId: event.target.value })}><option value="">Todas</option>{data.categories.map((entry) => <option key={entry.id} value={entry.id}>{entry.parentId ? "↳ " : ""}{entry.name}</option>)}</select></label>
            <label>Ubicación<select value={countForm.locationId} onChange={(event) => setCountForm({ ...countForm, locationId: event.target.value })}><option value="">Todas</option>{data.locations.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
            <button type="button" className="btn-approve inventory-form-wide" disabled={working} onClick={() => save(() => createInventoryCount(countForm), "Conteo creado.")}>Crear conteo</button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function InventoryItemDetail({ item, data, isSuperAdmin }: { item: InventoryItem; data: InventoryDashboardData; isSuperAdmin: boolean }) {
  const unit = data.units.find((entry) => entry.id === item.unitId)
  const category = data.categories.find((entry) => entry.id === item.categoryId)
  const location = data.locations.find((entry) => entry.id === item.locationId)
  const batches = data.batches.filter((batch) => batch.itemId === item.id)
  const movements = data.movements.filter((movement) => movement.itemId === item.id).slice(0, 12)

  return (
    <div className="inventory-detail">
      <div className="inventory-detail-hero">
        <div>
          <span>{item.sku || "Sin SKU"}</span>
          <h3>{item.name}</h3>
          <p>{item.description || "Sin descripción"}</p>
        </div>
        <strong>{item.currentStock} {unit?.abbreviation}</strong>
      </div>
      <div className="inventory-mini-stats">
        <span>{category?.name || "Sin categoría"}</span>
        <span>{location?.name || "Sin ubicación"}</span>
        <span>{money(item.unitCost)} c/u</span>
        <span>{isSuperAdmin ? "Super Admin puede eliminar" : "Admin puede gestionar"}</span>
      </div>
      <h3>Lotes activos</h3>
      <InventoryTable columns={["Lote", "Disponible", "Vence", "Estado"]} rows={batches.map((batch) => [batch.batchCode || "-", batch.currentQuantity, batch.expirationDate || "-", batch.status])} />
      <h3>Movimientos recientes</h3>
      <InventoryTable columns={["Fecha", "Tipo", "Cantidad", "Motivo"]} rows={movements.map((movement) => [new Date(movement.createdAt).toLocaleString("es-BO"), movementLabels[movement.movementType], movement.quantity, movement.reason || "-"])} />
    </div>
  )
}
