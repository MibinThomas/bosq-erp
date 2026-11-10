// Reads an updated costing workbook (exported from the Costing Workspace) into an import preview.
// Pure function (no database access) so it can be tested against real exported files.
import type ExcelJS from "exceljs"
import {
  COSTING_HEADER_LABELS,
  COSTING_META_SHEET,
  COSTING_REQUIRED_HEADERS,
  COSTING_SHEET,
  COSTING_TEMPLATE_ID,
  type CostingField,
  type CostingImportPreview,
  type CostingImportRow,
} from "./costing-template"

export interface CostingImportQuotation {
  id: string
  quotationNumber: string
  items: { id: string; itemNo: number; description: string; quantity: number; productCode?: string | null }[]
}

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9%]/g, "")

const cellText = (v: ExcelJS.CellValue): string => {
  if (v === null || v === undefined) return ""
  if (typeof v === "object") {
    if ("richText" in v && Array.isArray(v.richText)) return v.richText.map((r) => r.text).join("")
    if ("result" in v) return cellText(v.result as ExcelJS.CellValue)
    if ("text" in v) return String(v.text)
    if (v instanceof Date) return v.toISOString()
    return ""
  }
  return String(v)
}

/** Number from a cell (plain, formula result or text like "1,250.50"); null when empty or not a number. */
const cellNumber = (v: ExcelJS.CellValue): number | null => {
  if (v === null || v === undefined) return null
  if (typeof v === "number") return v
  if (typeof v === "object" && v && "result" in v) return cellNumber(v.result as ExcelJS.CellValue)
  const t = cellText(v).replace(/[,\s]|AED/gi, "").replace(/%$/, "")
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/** Percent from a cell: 0.35 (Excel % format) or 35 / "35%" all mean 35. */
const cellPercent = (v: ExcelJS.CellValue): number | null => {
  const raw = (typeof v === "object" && v && "result" in v ? v.result : v) as ExcelJS.CellValue
  const n = cellNumber(raw)
  if (n === null) return null
  if (/%\s*$/.test(cellText(raw))) return n
  return Math.abs(n) < 1 ? Math.round(n * 100 * 1000) / 1000 : n
}

export function parseCostingWorkbook(workbook: ExcelJS.Workbook, quotation: CostingImportQuotation): CostingImportPreview | { error: string } {
  const fileErrors: string[] = []

  // Template marker written by the export
  const meta = workbook.getWorksheet(COSTING_META_SHEET)
  const metaValues: Record<string, string> = {}
  meta?.eachRow((row) => {
    metaValues[cellText(row.getCell(1).value)] = cellText(row.getCell(2).value)
  })
  const templateRecognised = metaValues.template === COSTING_TEMPLATE_ID
  const fileQuotationNumber = metaValues.quotationNumber || null
  if (templateRecognised && metaValues.quotationId && metaValues.quotationId !== quotation.id) {
    fileErrors.push(
      `This file was exported for quotation ${fileQuotationNumber || metaValues.quotationId}, not ${quotation.quotationNumber}. Export the costing from this quotation and update that file.`
    )
  }

  const ws = workbook.getWorksheet(COSTING_SHEET) || workbook.worksheets.find((w) => w.name !== COSTING_META_SHEET)
  if (!ws) return { error: "The workbook has no costing sheet." }

  // Find the header row by its column names (tolerates moved columns and older exports)
  let headerRow = 0
  const columnOf: Partial<Record<keyof typeof COSTING_HEADER_LABELS, number>> = {}
  for (let r = 1; r <= Math.min(25, ws.rowCount) && !headerRow; r++) {
    const row = ws.getRow(r)
    const labels = new Map<string, number>()
    row.eachCell((cell, col) => labels.set(norm(cellText(cell.value)), col))
    if (labels.has(norm(COSTING_HEADER_LABELS.factoryCost))) {
      headerRow = r
      for (const [key, label] of Object.entries(COSTING_HEADER_LABELS)) {
        const col = labels.get(norm(label)) ?? (key === "lineItemId" ? labels.get(norm("Line Item ID")) : undefined)
        if (col) columnOf[key as keyof typeof COSTING_HEADER_LABELS] = col
      }
    }
  }
  if (!headerRow) {
    return {
      error:
        "This doesn't look like a costing export: the header row with \"Factory Cost\" was not found. Export the costing breakdown first and edit that file.",
    }
  }
  const missingHeaders = COSTING_REQUIRED_HEADERS.filter((k) => !columnOf[k]).map((k) => COSTING_HEADER_LABELS[k])
  if (missingHeaders.length) return { error: `Required column(s) missing: ${missingHeaders.join(", ")}.` }
  if (!columnOf.lineItemId && !columnOf.itemCode) {
    fileErrors.push("The file has no Line Item ID or Item Code column — rows are matched by Sl No only. Re-export to get the full template.")
  }

  const items = quotation.items
  const byId = new Map(items.map((i) => [i.id, i]))
  const byCode = new Map<string, typeof items>()
  for (const i of items) {
    const code = (i.productCode || "").trim().toLowerCase()
    if (!code) continue
    byCode.set(code, [...(byCode.get(code) || []), i])
  }
  const byItemNo = new Map(items.map((i) => [String(i.itemNo), i]))

  const rows: CostingImportRow[] = []
  const matchedRowFor = new Map<string, number>()
  const get = (row: ExcelJS.Row, key: keyof typeof COSTING_HEADER_LABELS) => (columnOf[key] ? row.getCell(columnOf[key]!).value : null)

  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r)
    const slNo = cellText(get(row, "slNo")).trim()
    if (/^grand totals/i.test(slNo)) break
    // Section heading rows are one merged cell across the table — skip them
    const slCell = row.getCell(columnOf.slNo!)
    if (/section:/i.test(slNo) || (slCell.isMerged && columnOf.factoryCost && row.getCell(columnOf.factoryCost).isMerged)) continue
    const lineItemId = cellText(get(row, "lineItemId")).trim()
    const itemCode = cellText(get(row, "itemCode")).trim()
    const factory = get(row, "factoryCost")
    const accessories = get(row, "accessoriesCost")
    const margin = get(row, "marginPct")
    const negotiation = get(row, "negotiationPct")
    const notes = cellText(get(row, "estimatorNotes")).trim()

    // Skip section headings and blank rows
    const hasValues = [factory, accessories, margin, negotiation].some((v) => cellText(v).trim() !== "")
    if (!lineItemId && !itemCode && (!/^\d+$/.test(slNo) || !hasValues)) continue

    const out: CostingImportRow = {
      row: r,
      slNo,
      itemCode,
      description: cellText(get(row, "specifications")).split("\n").find((l) => l.trim())?.replace(/^Model Code:\s*/i, "").trim() || "",
      itemId: null,
      matchedBy: null,
      values: {},
      changes: [],
      errors: [],
      warnings: [],
    }

    // Match: Line Item ID → Item Code (when unique in this quotation) → Sl No
    let match = lineItemId ? byId.get(lineItemId) : undefined
    if (match) out.matchedBy = "lineItemId"
    else if (lineItemId) out.warnings.push("Line Item ID not found in this quotation.")
    if (!match && itemCode) {
      const candidates = byCode.get(itemCode.toLowerCase()) || []
      const pick = candidates.length === 1 ? candidates[0] : candidates.find((c) => String(c.itemNo) === slNo)
      if (pick) {
        match = pick
        out.matchedBy = "itemCode"
      } else if (candidates.length > 1) out.warnings.push(`Item Code ${itemCode} appears on several lines.`)
    }
    if (!match && slNo && byItemNo.has(slNo)) {
      match = byItemNo.get(slNo)
      out.matchedBy = "slNo"
      out.warnings.push("Matched by Sl No only — check it is the right product.")
    }
    if (!match) {
      out.errors.push("No matching line in this quotation (Line Item ID, Item Code and Sl No did not match).")
      rows.push(out)
      continue
    }
    if (matchedRowFor.has(match.id)) {
      out.description = match.description || out.description
      out.errors.push(`Duplicate: line #${match.itemNo} was already matched on row ${matchedRowFor.get(match.id)}.`)
      rows.push(out)
      continue
    }
    matchedRowFor.set(match.id, r)
    out.itemId = match.id
    out.description = match.description || out.description

    // Values (empty cell = leave unchanged)
    const setMoney = (field: CostingField, v: ExcelJS.CellValue, label: string) => {
      if (cellText(v).trim() === "") return
      const n = cellNumber(v)
      if (n === null) out.errors.push(`${label} is not a number.`)
      else if (n < 0) out.errors.push(`${label} cannot be negative.`)
      else out.values[field] = Math.round(n * 100) / 100
    }
    const setPct = (field: CostingField, v: ExcelJS.CellValue, label: string) => {
      if (cellText(v).trim() === "") return
      const p = cellPercent(v)
      if (p === null) out.errors.push(`${label} is not a number.`)
      else if (p < 0 || p >= 100) out.errors.push(`${label} must be between 0% and 99.9% (found ${p}%).`)
      else out.values[field] = Math.round(p * 100) / 100
    }
    setMoney("factoryCost", factory, "Factory Cost")
    setMoney("accessoriesCost", accessories, "Accessories Cost")
    setPct("marginPct", margin, "Margin %")
    setPct("negotiationPct", negotiation, "Negotiation %")
    if (columnOf.estimatorNotes) out.values.estimatorNotes = notes

    const qtyInFile = cellNumber(get(row, "quantity"))
    if (qtyInFile !== null && qtyInFile !== match.quantity) {
      out.warnings.push(`Quantity in the file (${qtyInFile}) differs from the quotation (${match.quantity}); quantity is not imported.`)
    }
    rows.push(out)
  }

  const missingItems = items
    .filter((i) => !matchedRowFor.has(i.id))
    .map((i) => ({ itemId: i.id, itemNo: i.itemNo, description: i.description }))

  return {
    quotationNumber: quotation.quotationNumber,
    fileQuotationNumber,
    templateRecognised,
    rows,
    missingItems,
    summary: {
      totalRows: rows.length,
      matched: rows.filter((r) => r.itemId && r.errors.length === 0).length,
      changed: 0, // computed in the workspace against its current (possibly unsaved) values
      unchanged: 0,
      // invalid = matched to a line but with bad values or a duplicate; unmatched = no line found
      invalid: rows.filter((r) => r.matchedBy && r.errors.length > 0).length,
      unmatched: rows.filter((r) => !r.matchedBy).length,
    },
    fileErrors,
  }
}
