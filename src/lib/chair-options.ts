// Chair configuration helpers shared by the quotation chair configurator and the product importer.
// Safe for both client and server (no database access).

export interface ChairOption {
  name: string
  /** Approved customization charge in AED added to the unit price when this option is chosen */
  surcharge: number
}

export interface ChairOptions {
  typeCode: string
  headrestColours: ChairOption[]
  backrestColours: ChairOption[]
  seatColours: ChairOption[]
  baseTypes: ChairOption[]
}

export interface ChairConfig {
  headrest?: string
  backrest?: string
  seat?: string
  base?: string
}

export const CHAIR_COMPONENTS = [
  { key: "headrest", label: "Headrest colour", optionsKey: "headrestColours", specLabel: "Headrest" },
  { key: "backrest", label: "Backrest colour", optionsKey: "backrestColours", specLabel: "Backrest" },
  { key: "seat", label: "Seat colour", optionsKey: "seatColours", specLabel: "Seat" },
  { key: "base", label: "Base type", optionsKey: "baseTypes", specLabel: "Base" },
] as const

/** Headrest colour applies to High Back chairs only. */
export const isHighBack = (chairType?: string | null) => /high[\s-]?back/i.test(chairType || "")

/**
 * Parses an option list such as "Black, Grey (+108), Beige" into options with surcharges.
 * Accepts comma, semicolon or newline separators. Also accepts an already-parsed array.
 */
export function parseOptionList(value: unknown): ChairOption[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? parseOptionList(v)[0] : v))
      .filter((v): v is ChairOption => !!v && typeof v.name === "string" && v.name.trim() !== "")
      .map((v) => ({ name: v.name.trim(), surcharge: Number(v.surcharge) || 0 }))
  }
  if (typeof value !== "string") return []
  const seen = new Set<string>()
  return value
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^(.*?)\s*\(\s*\+?\s*(?:AED\s*)?([\d.]+)\s*\)\s*$/i)
      return m ? { name: m[1].trim(), surcharge: Number(m[2]) || 0 } : { name: part, surcharge: 0 }
    })
    .filter((o) => {
      const key = o.name.toLowerCase()
      if (!o.name || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

/** Formats options back to the spreadsheet form, e.g. "Black, Grey (+108)". */
export const formatOptionList = (options: ChairOption[]) =>
  options.map((o) => (o.surcharge ? `${o.name} (+${o.surcharge})` : o.name)).join(", ")

/** Reads chair options stored in a product's variantAttributes. */
export function getChairOptions(variantAttributes: unknown): ChairOptions {
  const attrs = (variantAttributes && typeof variantAttributes === "object" ? variantAttributes : {}) as Record<string, unknown>
  return {
    typeCode: typeof attrs.typeCode === "string" ? attrs.typeCode : "",
    headrestColours: parseOptionList(attrs.headrestColours),
    backrestColours: parseOptionList(attrs.backrestColours),
    seatColours: parseOptionList(attrs.seatColours),
    baseTypes: parseOptionList(attrs.baseTypes),
  }
}

/** True when a product carries any configurable chair component options. */
export const hasChairOptions = (o: ChairOptions) =>
  o.headrestColours.length + o.backrestColours.length + o.seatColours.length + o.baseTypes.length > 0

/** Total customization charge for a configuration. */
export function chairSurcharge(options: ChairOptions, config: ChairConfig, chairType?: string | null): number {
  let total = 0
  for (const c of CHAIR_COMPONENTS) {
    if (c.key === "headrest" && !isHighBack(chairType)) continue
    const chosen = config[c.key]
    const opt = options[c.optionsKey].find((o) => o.name === chosen)
    if (opt) total += opt.surcharge
  }
  return total
}

/** Builds the component line for the quotation, e.g. "Headrest: Black; Backrest: Black; Seat: Black; Base: Nylon." */
export function buildChairSpec(config: ChairConfig, chairType?: string | null): string {
  const parts: string[] = []
  for (const c of CHAIR_COMPONENTS) {
    if (c.key === "headrest" && !isHighBack(chairType)) continue
    const v = config[c.key]
    if (v) parts.push(`${c.specLabel}: ${v}`)
  }
  return parts.length ? parts.join("; ") + "." : ""
}

/** Reads a component line back into a configuration (used when re-opening a saved quotation line). */
export function parseChairSpec(spec?: string | null): ChairConfig {
  const config: ChairConfig = {}
  if (!spec) return config
  for (const c of CHAIR_COMPONENTS) {
    const m = spec.match(new RegExp(`${c.specLabel}:\\s*([^;\\n.]+)`, "i"))
    if (m) config[c.key] = m[1].trim()
  }
  return config
}
