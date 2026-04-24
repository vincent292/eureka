import { supabase } from "./supabaseClient"

export interface HeroSlide {
  id: string
  imagePath: string
  altText: string
}

export interface NoveltyItem {
  id: string
  title: string
  description: string
  price: number | null
  imagePath: string
  badge: string
}

export interface PedidosYaPromo {
  id: string
  title: string
  description: string
  imagePath: string
  ctaLabel: string
  ctaUrl: string
  points: string[]
}

type HeroSlideRow = {
  id: string
  image_path: string
  alt_text: string
}

type NoveltyItemRow = {
  id: string
  title: string
  description: string
  price: number | null
  image_path: string
  badge: string
}

type PedidosYaPromoRow = {
  id: string
  title: string
  description: string
  image_path: string
  cta_label: string
  cta_url: string
  points: string[] | null
}

export const resolveMediaPath = (path: string, bucket: string) => {
  if (path.startsWith("/") || path.startsWith("http")) {
    return path
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export async function fetchHeroSlides(): Promise<HeroSlide[]> {
  const { data, error } = await supabase
    .from("hero_slides")
    .select("id, image_path, alt_text")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) {
    console.warn("No se pudieron cargar los slides desde Supabase:", error.message)
    return []
  }

  return ((data || []) as HeroSlideRow[]).map((slide) => ({
    id: slide.id,
    imagePath: resolveMediaPath(slide.image_path, "hero"),
    altText: slide.alt_text,
  }))
}

export async function fetchNoveltyItems(): Promise<NoveltyItem[]> {
  const { data, error } = await supabase
    .from("novelty_items")
    .select("id, title, description, price, image_path, badge")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) {
    console.warn("No se pudieron cargar las novedades desde Supabase:", error.message)
    return []
  }

  return ((data || []) as NoveltyItemRow[]).map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    price: item.price,
    imagePath: resolveMediaPath(item.image_path, "novedades"),
    badge: item.badge,
  }))
}

export async function fetchPedidosYaPromo(): Promise<PedidosYaPromo | null> {
  const { data, error } = await supabase
    .from("pedidosya_promos")
    .select("id, title, description, image_path, cta_label, cta_url, points")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn("No se pudo cargar la promo de PedidosYa:", error.message)
    return null
  }

  if (!data) {
    return null
  }

  const promo = data as PedidosYaPromoRow

  return {
    id: promo.id,
    title: promo.title,
    description: promo.description,
    imagePath: resolveMediaPath(promo.image_path, "novedades"),
    ctaLabel: promo.cta_label,
    ctaUrl: promo.cta_url,
    points: promo.points || [],
  }
}
