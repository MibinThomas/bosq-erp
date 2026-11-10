// Filters ("facets") and option summaries for a product model's variants, following the current
// product organisation: chairs (chair type + component options), workstations/desks/tables (layout +
// dimensions/colours), and other products (model, size, colour).
import { getChairOptions } from "@/lib/chair-options"
import { getWorkstationOptions } from "@/lib/workstation-options"
import { productTabOf, type ProductTab } from "@/lib/product-tabs"

export interface FacetVariant {
  productName: string
  productCode: string
  stock: number
  chairType?: string | null
  dimensions?: string | null
  availableColors?: string | null
  tableTopFinish?: string | null
  legType?: string | null
  finishMaterial?: string | null
  modelName?: string | null
  variantAttributes?: unknown
  category?: { name: string } | null
}

export interface FacetDef {
  key: string
  label: string
  /** Values this variant offers for the facet (a variant can offer several, e.g. colour options) */
  values: (v: FacetVariant) => string[]
}

export interface OptionSummary {
  label: string
  values: string[]
}

const clean = (s?: string | null) => {
  const t = (s || "").trim()
  return t && !/^(standard|null|n\/a|-)$/i.test(t) ? t : ""
}
const names = (opts: { name: string }[]) => opts.map((o) => o.name)
const stockState = (v: FacetVariant) => [v.stock > 0 ? "In stock" : "Out of stock"]

/** Which kind of product a model is, from its category (and parent category) name. */
export function variantKind(category?: { name: string } | null, variants: FacetVariant[] = []): ProductTab {
  const own = productTabOf({ category: category ?? undefined }, [])
  if (own !== "others") return own
  // fall back to the variants' categories (e.g. a model filed under a generic category)
  for (const v of variants) {
    const k = productTabOf({ category: v.category ?? undefined }, [])
    if (k !== "others") return k
  }
  return "others"
}

/** Label for one variant inside its model: chair type, workstation layout, or the variant's own name. */
export function variantTypeLabel(v: FacetVariant, kind: ProductTab, modelName: string): string {
  if (kind === "chairs") return clean(v.chairType) || stripModel(v.productName, modelName)
  if (kind === "workstations") {
    const layout = getWorkstationOptions(v.variantAttributes).layout
    return layout || stripModel(v.productName, modelName)
  }
  return clean(v.modelName) && v.modelName !== modelName ? (v.modelName as string) : stripModel(v.productName, modelName)
}

function stripModel(name: string, modelName: string) {
  const n = (name || "").trim()
  if (modelName && n.toLowerCase().startsWith(modelName.toLowerCase())) {
    return n.slice(modelName.length).replace(/^[\s—–-]+/, "").trim() || n
  }
  return n
}

export function facetDefsFor(kind: ProductTab, modelName: string): FacetDef[] {
  if (kind === "chairs") {
    return [
      { key: "type", label: "Chair Type", values: (v) => [variantTypeLabel(v, kind, modelName)] },
      { key: "backrest", label: "Backrest Colour", values: (v) => names(getChairOptions(v.variantAttributes).backrestColours) },
      { key: "seat", label: "Seat Colour", values: (v) => names(getChairOptions(v.variantAttributes).seatColours) },
      { key: "base", label: "Base Type", values: (v) => names(getChairOptions(v.variantAttributes).baseTypes) },
      { key: "stock", label: "Stock", values: stockState },
    ]
  }
  if (kind === "workstations") {
    return [
      { key: "layout", label: "Seater & Layout", values: (v) => [variantTypeLabel(v, kind, modelName)] },
      {
        key: "seats",
        label: "Seats per Unit",
        values: (v) => {
          const n = getWorkstationOptions(v.variantAttributes, variantTypeLabel(v, kind, modelName)).seatsPerUnit
          return n > 0 ? [`${n} seat${n === 1 ? "" : "s"}`] : []
        },
      },
      {
        key: "dimensions",
        label: "Dimensions",
        values: (v) => {
          const opts = names(getWorkstationOptions(v.variantAttributes).dimensions)
          return opts.length ? opts : [clean(v.dimensions)].filter(Boolean)
        },
      },
      {
        key: "top",
        label: "Table Top",
        values: (v) => {
          const opts = names(getWorkstationOptions(v.variantAttributes).tableTopColours)
          return opts.length ? opts : [clean(v.tableTopFinish)].filter(Boolean)
        },
      },
      {
        key: "leg",
        label: "Leg Frame",
        values: (v) => {
          const opts = names(getWorkstationOptions(v.variantAttributes).legFrameColours)
          return opts.length ? opts : [clean(v.legType)].filter(Boolean)
        },
      },
      { key: "stock", label: "Stock", values: stockState },
    ]
  }
  return [
    { key: "model", label: kind === "storage" ? "Product" : "Model", values: (v) => [variantTypeLabel(v, kind, modelName)] },
    { key: "size", label: "Size", values: (v) => [clean(v.dimensions)].filter(Boolean) },
    { key: "colour", label: "Colour / Finish", values: (v) => [clean(v.availableColors) || clean(v.finishMaterial)].filter(Boolean) },
    { key: "stock", label: "Stock", values: stockState },
  ]
}

/** Configurable options shown on a variant card (what can be chosen for it on a quotation). */
export function optionSummary(v: FacetVariant, kind: ProductTab): OptionSummary[] {
  const fmt = (opts: { name: string; surcharge: number }[]) =>
    opts.map((o) => (o.surcharge ? `${o.name} (+${o.surcharge})` : o.name))
  if (kind === "chairs") {
    const o = getChairOptions(v.variantAttributes)
    return [
      { label: "Headrest", values: /high[\s-]?back/i.test(v.chairType || "") ? fmt(o.headrestColours) : [] },
      { label: "Backrest", values: fmt(o.backrestColours) },
      { label: "Seat", values: fmt(o.seatColours) },
      { label: "Base", values: fmt(o.baseTypes) },
    ].filter((s) => s.values.length > 0)
  }
  if (kind === "workstations") {
    const o = getWorkstationOptions(v.variantAttributes)
    return [
      { label: "Sizes (mm)", values: fmt(o.dimensions) },
      { label: "Table top", values: fmt(o.tableTopColours) },
      { label: "Leg frame", values: fmt(o.legFrameColours) },
    ].filter((s) => s.values.length > 0)
  }
  return []
}

/** Breadcrumb for the model's category, e.g. ["Chairs", "Premium Chairs"]. */
export function categoryTrail(kind: ProductTab, categoryName?: string | null): string[] {
  const main = { chairs: "Chairs", workstations: "Workstations", storage: "Storage", others: "" }[kind]
  const cat = (categoryName || "").trim()
  if (!cat) return main ? [main] : []
  if (!main || cat.toLowerCase() === main.toLowerCase()) return [cat]
  return [main, cat]
}

/** Plural noun for the variants of a model of this kind. */
export const variantNoun = (kind: ProductTab, count: number) => {
  const one = kind === "chairs" ? "chair type" : kind === "workstations" ? "layout" : "variant"
  return `${count} ${one}${count === 1 ? "" : "s"}`
}
