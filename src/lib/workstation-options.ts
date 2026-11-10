// Workstation configuration helpers shared by the quotation workstation configurator and the product importer.
// Safe for both client and server (no database access). Option lists use the same format as chairs:
// comma-separated, with an optional customization charge, e.g. "1200 × 600 × 750, 1400 × 700 × 750 (+150)".
import { type ChairOption as ConfigOption, type SpecItem, parseOptionList, specListHtml, specToText } from "@/lib/chair-options"

export type { ConfigOption }

export interface WorkstationOptions {
  /** Seater and layout, e.g. "Cluster Of 4" */
  layout: string
  /** Seating positions in one workstation unit, e.g. 4 for a cluster of 4 */
  seatsPerUnit: number
  dimensions: ConfigOption[]
  tableTopColours: ConfigOption[]
  legFrameColours: ConfigOption[]
}

export interface WorkstationConfig {
  dimensions?: string
  tableTop?: string
  legFrame?: string
}

export const WORKSTATION_COMPONENTS = [
  { key: "dimensions", label: "Dimensions in mm · L × W × H", optionsKey: "dimensions", specLabel: "Dimensions" },
  { key: "tableTop", label: "Table Top Color", optionsKey: "tableTopColours", specLabel: "Tabletop" },
  { key: "legFrame", label: "Leg Frame Color", optionsKey: "legFrameColours", specLabel: "Leg frame" },
] as const

/** Seats implied by a layout name when not given explicitly ("Cluster Of 6" → 6, "2 Seater Linear" → 2). */
export function seatsFromLayout(layout: string): number {
  const m =
    layout.match(/(\d+)\s*(?:seater|persons?|seats?)\b/i) ||
    layout.match(/\b(?:cluster|linear|group)\s+of\s+(\d+)/i)
  if (m) return Number(m[1])
  return /single/i.test(layout) ? 1 : 0
}

/** Normalises a plain dimension like "2400x1200x750mm" to "2400 × 1200 × 750"; other labels are kept as written. */
export const formatDimension = (value: string) =>
  /^\s*\d+\s*[x×X*]\s*\d+(\s*[x×X*]\s*\d+)?\s*(mm)?\s*$/.test(value)
    ? value.replace(/\s*mm\s*$/i, "").split(/\s*[x×X*]\s*/).map((s) => s.trim()).filter(Boolean).join(" × ")
    : value.trim()

/** Reads workstation options stored in a product's variantAttributes. */
export function getWorkstationOptions(variantAttributes: unknown, fallbackLayout = ""): WorkstationOptions {
  const attrs = (variantAttributes && typeof variantAttributes === "object" ? variantAttributes : {}) as Record<string, unknown>
  const layout = typeof attrs.layout === "string" && attrs.layout.trim() ? attrs.layout.trim() : fallbackLayout
  const seats = Number(attrs.seatsPerUnit)
  return {
    layout,
    seatsPerUnit: Number.isFinite(seats) && seats > 0 ? seats : seatsFromLayout(layout),
    dimensions: parseOptionList(attrs.dimensionOptions).map((o) => ({ ...o, name: formatDimension(o.name) })),
    tableTopColours: parseOptionList(attrs.tableTopColours),
    legFrameColours: parseOptionList(attrs.legFrameColours),
  }
}

/** Total customization charge for a configuration. */
export function workstationSurcharge(options: WorkstationOptions, config: WorkstationConfig): number {
  let total = 0
  for (const c of WORKSTATION_COMPONENTS) {
    const opt = options[c.optionsKey].find((o) => o.name === config[c.key])
    if (opt) total += opt.surcharge
  }
  return total
}

/** Specification bullets for a configured workstation: dimensions, tabletop, leg frame, seats per unit. */
export function workstationSpecItems(config: WorkstationConfig, seatsPerUnit?: number): SpecItem[] {
  const items: SpecItem[] = []
  if (config.dimensions) items.push({ label: "Dimensions", value: `${config.dimensions} mm` })
  if (config.tableTop) items.push({ label: "Tabletop", value: config.tableTop })
  if (config.legFrame) items.push({ label: "Leg frame", value: config.legFrame })
  if (seatsPerUnit && seatsPerUnit > 1) items.push({ label: "Seats per unit", value: String(seatsPerUnit) })
  return items
}

/** Builds the line's specifications as a bullet list (one per specification). */
export function buildWorkstationSpec(config: WorkstationConfig, seatsPerUnit?: number): string {
  return specListHtml(workstationSpecItems(config, seatsPerUnit))
}

/** Reads a saved specification (bullet list or older one-line text) back into a configuration. */
export function parseWorkstationSpec(spec?: string | null): WorkstationConfig {
  const config: WorkstationConfig = {}
  const text = specToText(spec)
  if (!text) return config
  const dims = text.match(/(?:^|\n)\s*Dimensions:\s*([^\n]+?)\s*mm\.?\s*(?:\n|$)/i)
  const top = text.match(/(?:^|\n)\s*Tabletop:\s*([^\n]+)/i)
  const leg = text.match(/(?:^|\n)\s*Leg frame:\s*([^\n]+)/i)
  if (dims) config.dimensions = dims[1].trim()
  if (top) config.tableTop = top[1].trim().replace(/\.$/, "")
  if (leg) config.legFrame = leg[1].trim().replace(/\.$/, "")
  return config
}
