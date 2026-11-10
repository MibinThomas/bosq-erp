/**
 * BOQ costing — one definition of the estimator's cost categories and the pricing maths,
 * shared by the BOQ screens and every BOQ route.
 *
 * Workflow: the Estimator enters costs only. The Interior Design Consultant owns the margin
 * (on the BOQ pricing row or later on the quotation).
 */

/** Estimator cost categories (per unit), in display order, with the column each is stored in. */
export const BOQ_COST_FIELDS = [
  { key: "materialCost", label: "Material", breakdownKey: "material" },
  { key: "laborCost", label: "Labour", breakdownKey: "labour" },
  { key: "outsourcingCost", label: "Outsourcing", breakdownKey: "outsourcing" },
  { key: "accessoriesCost", label: "Hardware", breakdownKey: "hardware" },
  { key: "factoryCost", label: "Factory", breakdownKey: "factory" },
  { key: "overheadCost", label: "Other", breakdownKey: "other" },
] as const

export type BoqCostKey = (typeof BOQ_COST_FIELDS)[number]["key"]

/** Legacy columns no longer shown, still counted so older BOQs keep their cost. */
const LEGACY_COST_KEYS = ["installationCost", "transportCost"] as const

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""))
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Unit cost = sum of every cost category (including legacy installation / transport). */
export function boqUnitCost(item: Record<string, unknown>) {
  let total = 0
  for (const f of BOQ_COST_FIELDS) total += num(item[f.key])
  for (const k of LEGACY_COST_KEYS) total += num(item[k])
  return Number(total.toFixed(2))
}

export function hasCostEntered(item: Record<string, unknown>) {
  return boqUnitCost(item) > 0
}

/** Cost categories as stored values (per unit), for saving. Missing values become 0. */
export function boqCostValues(item: Record<string, unknown>) {
  const out = {} as Record<BoqCostKey, number>
  for (const f of BOQ_COST_FIELDS) out[f.key] = num(item[f.key])
  return out
}

/** Snapshot carried to a quotation line: { material, labour, outsourcing, hardware, factory, other }. */
export function boqCostBreakdown(item: Record<string, unknown>) {
  const out: Record<string, number> = {}
  for (const f of BOQ_COST_FIELDS) out[f.breakdownKey] = num(item[f.key])
  out.other = Number((out.other + num(item.installationCost) + num(item.transportCost)).toFixed(2))
  return out
}

/** Selling price from a cost and a margin on price: price = cost ÷ (1 − margin%). */
export function priceFromMargin(cost: number, marginPct: number) {
  if (!(cost > 0)) return 0
  const m = Math.min(99.99, Math.max(-1000, Number.isFinite(marginPct) ? marginPct : 0)) / 100
  return Number((cost / (1 - m)).toFixed(2))
}

/** Settings → Pricing tier (stored as { dealer, interior, project, special }) for a customer segment. */
export function segmentMarginPct(
  tiers: { dealer?: number; interior?: number; project?: number; special?: number; direct?: number; online?: number } | null | undefined,
  segment: string | null | undefined
) {
  const t = tiers || {}
  const s = (segment || "").toLowerCase()
  const pick = (v: unknown, fallback: number) => {
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 && n < 100 ? n : fallback
  }
  if (s === "dealer") return pick(t.dealer, 15)
  if (s === "interior") return pick(t.interior, 30)
  if (s === "special") return pick(t.special ?? t.online, 75)
  return pick(t.project ?? t.direct, 50)
}
