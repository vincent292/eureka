import { resolveMediaPath } from "./contentService"
import { supabase } from "./supabaseClient"

export type MenuPaymentMethod = "qr" | "cash"

export interface PublicRestaurantTable {
  id: string
  tableNumber: number
  tableName: string | null
  tableCode: string
}

export interface PublicMenuCategory {
  id: string
  name: string
  description: string | null
  imagePath: string | null
  sortOrder: number
}

export interface PublicMenuProduct {
  id: string
  categoryId: string
  name: string
  description: string | null
  basePrice: number
  imagePath: string | null
  productType: "simple" | "combo"
  isFeatured: boolean
  sortOrder: number
  variants: PublicMenuVariant[]
  optionGroups: PublicMenuOptionGroup[]
}

export interface PublicMenuVariant {
  id: string
  productId: string
  name: string
  description: string | null
  price: number
  sortOrder: number
}

export interface PublicMenuOptionGroup {
  id: string
  productId: string
  name: string
  isRequired: boolean
  selectionType: "single" | "multiple"
  minSelect: number
  maxSelect: number
  sortOrder: number
  options: PublicMenuOption[]
}

export interface PublicMenuOption {
  id: string
  optionGroupId: string
  name: string
  extraPrice: number
  sortOrder: number
}

export interface PublicPaymentQr {
  id: string
  label: string
  imagePath: string
  instructions: string | null
  expiresAt: string | null
}

export interface CreateTableOrderItem {
  productId: string
  variantId: string | null
  quantity: number
  notes?: string
  options: string[]
}

export interface CreateTableOrderInput {
  tableCode: string
  customerName: string
  customerPhone: string
  paymentMethod: MenuPaymentMethod
  paymentReceiptPath: string | null
  items: CreateTableOrderItem[]
}

type TableRow = {
  id: string
  table_number: number
  table_name: string | null
  table_code: string
}

type CategoryRow = {
  id: string
  name: string
  description: string | null
  image_path: string | null
  sort_order: number
}

type ProductRow = {
  id: string
  category_id: string
  name: string
  description: string | null
  base_price: number
  image_path: string | null
  product_type: "simple" | "combo"
  is_featured: boolean
  sort_order: number
}

type VariantRow = {
  id: string
  product_id: string
  name: string
  description: string | null
  price: number
  sort_order: number
}

type OptionGroupRow = {
  id: string
  product_id: string
  name: string
  is_required: boolean
  selection_type: "single" | "multiple"
  min_select: number
  max_select: number
  sort_order: number
}

type OptionRow = {
  id: string
  option_group_id: string
  name: string
  extra_price: number
  sort_order: number
}

type PaymentQrRow = {
  id: string
  label: string
  image_path: string
  instructions: string | null
  expires_at: string | null
}

type OrderRpcRow = {
  order_id: string
  order_code: string
  total: number
  order_status: string
  payment_status: string
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

const isMissingPreparedStockFeatureError = (error: { message?: string; code?: string } | null | undefined) => {
  const message = error?.message || ""
  return error?.code === "PGRST202" || message.includes("preview_prepared_stock_issue")
}

export async function fetchTableMenu(tableCode: string) {
  const tableResult = await supabase
    .from("restaurant_tables")
    .select("id, table_number, table_name, table_code")
    .eq("table_code", tableCode)
    .eq("is_active", true)
    .maybeSingle()

  if (tableResult.error) throw new Error(tableResult.error.message)
  if (!tableResult.data) throw new Error("Esta mesa no esta disponible.")

  const [categoriesResult, productsResult, variantsResult, groupsResult, optionsResult, qrResult] =
    await Promise.all([
      supabase
        .from("product_categories")
        .select("id, name, description, image_path, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("products")
        .select("id, category_id, name, description, base_price, image_path, product_type, is_featured, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("product_variants")
        .select("id, product_id, name, description, price, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("product_option_groups")
        .select("id, product_id, name, is_required, selection_type, min_select, max_select, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("product_options")
        .select("id, option_group_id, name, extra_price, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("payment_qrs")
        .select("id, label, image_path, instructions, expires_at")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1),
    ])

  if (categoriesResult.error) throw new Error(categoriesResult.error.message)
  if (productsResult.error) throw new Error(productsResult.error.message)
  if (variantsResult.error) throw new Error(variantsResult.error.message)
  if (groupsResult.error) throw new Error(groupsResult.error.message)
  if (optionsResult.error) throw new Error(optionsResult.error.message)
  if (qrResult.error) throw new Error(qrResult.error.message)

  const optionsByGroup = new Map<string, PublicMenuOption[]>()
  ;((optionsResult.data || []) as OptionRow[]).forEach((option) => {
    optionsByGroup.set(option.option_group_id, [
      ...(optionsByGroup.get(option.option_group_id) || []),
      {
        id: option.id,
        optionGroupId: option.option_group_id,
        name: option.name,
        extraPrice: Number(option.extra_price),
        sortOrder: option.sort_order,
      },
    ])
  })

  const groupsByProduct = new Map<string, PublicMenuOptionGroup[]>()
  ;((groupsResult.data || []) as OptionGroupRow[]).forEach((group) => {
    groupsByProduct.set(group.product_id, [
      ...(groupsByProduct.get(group.product_id) || []),
      {
        id: group.id,
        productId: group.product_id,
        name: group.name,
        isRequired: group.is_required,
        selectionType: group.selection_type,
        minSelect: group.min_select,
        maxSelect: group.max_select,
        sortOrder: group.sort_order,
        options: optionsByGroup.get(group.id) || [],
      },
    ])
  })

  const variantsByProduct = new Map<string, PublicMenuVariant[]>()
  ;((variantsResult.data || []) as VariantRow[]).forEach((variant) => {
    variantsByProduct.set(variant.product_id, [
      ...(variantsByProduct.get(variant.product_id) || []),
      {
        id: variant.id,
        productId: variant.product_id,
        name: variant.name,
        description: variant.description,
        price: Number(variant.price),
        sortOrder: variant.sort_order,
      },
    ])
  })

  const table = tableResult.data as TableRow
  const paymentQrRow = ((qrResult.data || []) as PaymentQrRow[])[0]
  const paymentQr = paymentQrRow
    ? {
        id: paymentQrRow.id,
        label: paymentQrRow.label,
        imagePath: resolveMediaPath(paymentQrRow.image_path, "qr"),
        instructions: paymentQrRow.instructions,
        expiresAt: paymentQrRow.expires_at,
      }
    : null

  return {
    table: {
      id: table.id,
      tableNumber: table.table_number,
      tableName: table.table_name,
      tableCode: table.table_code,
    } satisfies PublicRestaurantTable,
    categories: ((categoriesResult.data || []) as CategoryRow[]).map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      imagePath: category.image_path ? resolveMediaPath(category.image_path, "products") : null,
      sortOrder: category.sort_order,
    })),
    products: ((productsResult.data || []) as ProductRow[]).map((product) => ({
      id: product.id,
      categoryId: product.category_id,
      name: product.name,
      description: product.description,
      basePrice: Number(product.base_price),
      imagePath: product.image_path ? resolveMediaPath(product.image_path, "products") : null,
      productType: product.product_type,
      isFeatured: product.is_featured,
      sortOrder: product.sort_order,
      variants: variantsByProduct.get(product.id) || [],
      optionGroups: groupsByProduct.get(product.id) || [],
    })),
    paymentQr,
  }
}

export async function uploadOrderReceipt(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Sube una imagen JPG, PNG o WEBP.")
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("El comprobante debe pesar 5 MB o menos.")
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const path = `uploads/receipts/order-${newId()}-${Date.now()}.${extension}`
  const { error } = await supabase.storage.from("receipts").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  })

  if (error) throw new Error(error.message)
  return path
}

export async function createTableOrder(input: CreateTableOrderInput) {
  const { data, error } = await supabase.rpc("create_table_order", {
    p_table_code: input.tableCode,
    p_customer_name: input.customerName,
    p_customer_phone: input.customerPhone,
    p_payment_method: input.paymentMethod,
    p_payment_receipt_path: input.paymentReceiptPath,
    p_items: input.items.map((item) => ({
      product_id: item.productId,
      variant_id: item.variantId,
      quantity: item.quantity,
      notes: item.notes || "",
      options: item.options.map((optionId) => ({ option_id: optionId })),
    })),
  })

  if (error) throw new Error(error.message)

  const row = (Array.isArray(data) ? data[0] : data) as OrderRpcRow | undefined
  if (!row) throw new Error("No se pudo crear el pedido.")

  return {
    orderId: row.order_id,
    orderCode: row.order_code,
    total: Number(row.total),
    orderStatus: row.order_status,
    paymentStatus: row.payment_status,
  }
}

export async function previewPreparedStockIssue(items: CreateTableOrderInput["items"]) {
  const { data, error } = await supabase.rpc("preview_prepared_stock_issue", {
    p_items: items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
    })),
  })

  if (error) {
    if (isMissingPreparedStockFeatureError(error)) return null
    throw new Error(error.message)
  }
  return typeof data === "string" && data.trim() ? data : null
}
