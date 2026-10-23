// Shared definition of the costing Excel template, used by the export (costing-excel-builder) and the
// import (/api/quotations/[id]/import-costing), so an exported file can always be read back.

export const COSTING_TEMPLATE_ID = "BOSQ_COSTING_TEMPLATE_V2"
export const COSTING_META_SHEET = "_template"
export const COSTING_SHEET = "Costing Breakdown"

/** 1-based worksheet columns of the costing table. */
export const COSTING_COLUMNS = {
  slNo: 2, // B
  image: 3, // C
  specifications: 4, // D
  quantity: 5, // E
  factoryCost: 6, // F  — editable
  accessoriesCost: 7, // G  — editable
  totalUnitCost: 8, // H  (formula)
  marginPct: 9, // I  — editable
  negotiationPct: 10, // J  — editable
  estimatedPrice: 11, // K  (formula)
  costingStatus: 12, // L
  idcDiscount: 13, // M
  finalPrice: 14, // N
  estimatorNotes: 15, // O  — editable
  itemCode: 16, // P  — matching key
  lineItemId: 17, // Q  — matching key (do not edit)
} as const

export const COSTING_EDITABLE_COLUMNS = ["factoryCost", "accessoriesCost", "marginPct", "negotiationPct", "estimatorNotes"] as const

/** Header labels, used to find the header row and validate the structure on import. */
export const COSTING_HEADER_LABELS: Record<keyof typeof COSTING_COLUMNS, string> = {
  slNo: "Sl No",
  image: "Product Image",
  specifications: "Product Specifications",
  quantity: "QTY",
  factoryCost: "Factory Cost",
  accessoriesCost: "Accessories Cost",
  totalUnitCost: "Total Unit Cost",
  marginPct: "Margin %",
  negotiationPct: "Negotiation %",
  estimatedPrice: "Final Estimated Price (Unit)",
  costingStatus: "Costing Done/ Not",
  idcDiscount: "Discount added By Interior Design Consultant",
  finalPrice: "Final Price",
  estimatorNotes: "Estimator Notes",
  itemCode: "Item Code",
  lineItemId: "Line Item ID (do not edit)",
}

/** Columns that must be present for an import to be accepted. */
export const COSTING_REQUIRED_HEADERS = ["slNo", "factoryCost", "accessoriesCost", "marginPct", "negotiationPct"] as const

export type CostingField = "factoryCost" | "accessoriesCost" | "marginPct" | "negotiationPct" | "estimatorNotes"

export interface CostingImportRow {
  /** Worksheet row number */
  row: number
  slNo: string
  itemCode: string
  description: string
  /** Matched quotation line, if any */
  itemId: string | null
  matchedBy: "lineItemId" | "itemCode" | "slNo" | null
  /** New values read from the file (only fields present and valid) */
  values: Partial<Record<CostingField, number | string>>
  /** Field-level changes against the current saved values */
  changes: { field: CostingField; label: string; from: number | string; to: number | string }[]
  errors: string[]
  warnings: string[]
}

export interface CostingImportPreview {
  quotationNumber: string
  fileQuotationNumber: string | null
  templateRecognised: boolean
  rows: CostingImportRow[]
  /** Quotation lines not present in the file (left unchanged) */
  missingItems: { itemId: string; itemNo: number; description: string }[]
  summary: { totalRows: number; matched: number; changed: number; unchanged: number; invalid: number; unmatched: number }
  fileErrors: string[]
}

export const COSTING_FIELD_LABELS: Record<CostingField, string> = {
  factoryCost: "Factory Cost",
  accessoriesCost: "Accessories Cost",
  marginPct: "Margin %",
  negotiationPct: "Negotiation %",
  estimatorNotes: "Estimator Notes",
}
