// Product selection tabs on quotation lines. Chairs and Workstations use configurators;
// Storage and Others use the catalog search.
export const PRODUCT_SELECTION_TABS = [
  { key: "chairs", label: "Chairs" },
  { key: "workstations", label: "Workstations" },
  { key: "storage", label: "Storage" },
  { key: "others", label: "Others" },
] as const

export type ProductTab = (typeof PRODUCT_SELECTION_TABS)[number]["key"]

type CategoryLike = { id: string; name: string; parentId?: string | null }

/** Classifies a product by its category (or its parent category) into a quotation selection tab. */
export function productTabOf(p: { categoryId?: string; category?: { name?: string } | null } | null | undefined, categories: CategoryLike[]): ProductTab {
  const cat = categories.find((c) => c.id === p?.categoryId)
  const parent = cat?.parentId ? categories.find((c) => c.id === cat.parentId) : undefined
  const names = [p?.category?.name, cat?.name, parent?.name].filter(Boolean).join(" ").toLowerCase()
  if (/chair|seating|stool/.test(names)) return "chairs"
  if (/workstation|desk|table|height adjustable/.test(names)) return "workstations"
  if (/storage|storrage|pedestal|cabinet|locker|credenza/.test(names)) return "storage"
  return "others"
}
