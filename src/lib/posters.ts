import { z } from "zod"
import prisma from "./prisma"
import { hasPermission } from "./rbac"
import { resolveImageUrl } from "./pdf/resolveImage"

/** Managing the library follows the Settings permission (like Materials & Finishes). */
export async function canManagePosters(user: { id: string; role?: string }) {
  return user.role === "SUPER_ADMIN" || (await hasPermission(user.id, "SETTINGS", "edit"))
}

export const PosterSchema = z.object({
  title: z.string().trim().min(1, "Give the poster a title").max(200),
  description: z.string().trim().max(1000).nullable().optional(),
  imageUrl: z.string().trim().min(1, "Upload an image").max(2000)
    .refine((u) => u.startsWith("/uploads/") || /^https:\/\//i.test(u), "The image must be an uploaded file"),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(40)).max(30).default([]),
  productIds: z.array(z.string().min(1)).max(500).default([]),
  categoryIds: z.array(z.string().min(1)).max(200).default([]),
  appliesToAll: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(100000).default(0),
})

export type PosterRow = {
  id: string
  title: string
  description: string | null
  imageUrl: string
  tags: string[]
  productIds: string[]
  categoryIds: string[]
  appliesToAll: boolean
  isActive: boolean
  sortOrder: number
}

/** Products in a quotation, widened to their master products, plus their categories and parent categories. */
async function expandProducts(productIds: string[]) {
  const ids = Array.from(new Set(productIds.filter(Boolean)))
  if (ids.length === 0) return { productIds: [] as string[], categoryIds: [] as string[] }
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      parentProductId: true,
      categoryId: true,
      category: { select: { parentId: true } },
      parentProduct: { select: { categoryId: true } },
    },
  })
  const productSet = new Set<string>(ids)
  const categorySet = new Set<string>()
  for (const p of products) {
    if (p.parentProductId) productSet.add(p.parentProductId)
    if (p.categoryId) categorySet.add(p.categoryId)
    if (p.category?.parentId) categorySet.add(p.category.parentId)
    if (p.parentProduct?.categoryId) categorySet.add(p.parentProduct.categoryId)
  }
  return { productIds: Array.from(productSet), categoryIds: Array.from(categorySet) }
}

/** Active posters suggested for these products: linked to a product or category, or for all quotations. */
export async function suggestPosters(productIds: string[]): Promise<PosterRow[]> {
  const { productIds: pIds, categoryIds } = await expandProducts(productIds)
  return prisma.poster.findMany({
    where: {
      isActive: true,
      OR: [
        { appliesToAll: true },
        ...(pIds.length ? [{ productIds: { hasSome: pIds } }] : []),
        ...(categoryIds.length ? [{ categoryIds: { hasSome: categoryIds } }] : []),
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  })
}

/** Posters a quotation prints: automatic suggestions, or exactly the chosen ones in their order. */
export async function resolveQuotationPosters(quotation: {
  postersAuto?: boolean | null
  posterIds?: string[] | null
  items?: { productId?: string | null }[] | null
}): Promise<PosterRow[]> {
  if (quotation.postersAuto) {
    return suggestPosters((quotation.items || []).map((i) => i.productId || "").filter(Boolean))
  }
  const ids = (quotation.posterIds || []).filter(Boolean)
  if (ids.length === 0) return []
  const rows = await prisma.poster.findMany({ where: { id: { in: ids }, isActive: true } })
  const ordered: PosterRow[] = []
  for (const id of ids) {
    const row = rows.find((r) => r.id === id)
    if (row) ordered.push(row)
  }
  return ordered
}

/** Poster pages ready for the PDF (images embedded); posters whose image can't be loaded are skipped. */
export async function posterPagesForPdf(quotation: Parameters<typeof resolveQuotationPosters>[0]) {
  try {
    const posters = await resolveQuotationPosters(quotation)
    const pages = await Promise.all(posters.map(async (p) => {
      const src = await resolveImageUrl(p.imageUrl)
      return src ? { title: p.title, src } : null
    }))
    return pages.filter((p): p is { title: string; src: string } => !!p)
  } catch (err) {
    console.error("[posters] Failed to prepare poster pages:", err)
    return []
  }
}

/** Poster fields to save on a quotation from a request body (defaults: automatic for new quotations). */
export function posterFieldsFromBody(body: any, fallback?: { postersAuto?: boolean | null; posterIds?: string[] | null }) {
  const postersAuto = typeof body?.postersAuto === "boolean" ? body.postersAuto : (fallback?.postersAuto ?? true)
  const posterIds = Array.isArray(body?.posterIds)
    ? body.posterIds.filter((x: unknown): x is string => typeof x === "string" && x.length > 0).slice(0, 50)
    : (fallback?.posterIds ?? [])
  return { postersAuto, posterIds }
}
