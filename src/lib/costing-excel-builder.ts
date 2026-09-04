import ExcelJS from "exceljs"
import path from "path"
import fs from "fs"

export interface CostingExportItem {
  id: string
  itemNo: number
  batchHeading?: string | null
  description: string
  specifications?: string | null
  modelCode?: string | null
  productType?: string | null
  upholsteryMaterial?: string | null
  baseType?: string | null
  finishColor?: string | null
  recommendedUsage?: string | null
  quantity: number
  factoryCost: number
  accessoriesCost: number
  totalCostUnit: number
  marginPct: number
  negotiationPct: number
  estimatorPriceUnit: number
  costingDone: boolean
  costingStatusText: string
  discountByIDC: string | number
  finalPriceUnit: number
  customImageUrl?: string | null
  imageUrl?: string | null
  product?: {
    imageUrl?: string | null
    sku?: string | null
  } | null
}

export interface CostingExportData {
  quotationNumber: string
  projectName?: string | null
  date?: string | Date | null
  client?: {
    companyName?: string | null
    contactPerson?: string | null
    phone?: string | null
    email?: string | null
  } | null
  preparedBy?: {
    name?: string | null
    email?: string | null
  } | null
  assignedEstimator?: {
    name?: string | null
    email?: string | null
  } | null
  items: CostingExportItem[]
}

/**
 * Clean HTML markup and format text for Excel cells.
 */
function cleanText(raw?: string | null): string {
  if (!raw) return ""
  let text = String(raw)
  text = text.replace(/<br\s*[\/]?>/gi, "\n")
  text = text.replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6|tr)>/gi, "\n")
  text = text.replace(/<li[^>]*>/gi, "• ")
  text = text.replace(/<[^>]*>/g, "")
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")

  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l, idx, arr) => l.length > 0 || (idx > 0 && arr[idx - 1].length > 0))
    .join("\n")
    .trim()
}

/**
 * Retrieve image Buffer and extension from URL, Base64, or local path.
 */
async function getImageBufferAndExt(imgUrl: string): Promise<{ buffer: Buffer; extension: string } | null> {
  if (!imgUrl) return null
  try {
    let extension = "jpeg"
    let buffer: Buffer | null = null

    if (imgUrl.toLowerCase().includes(".png") || imgUrl.toLowerCase().includes(".webp")) {
      extension = "png"
    }

    if (imgUrl.startsWith("data:image")) {
      const parts = imgUrl.split(",")
      if (parts[1]) {
        const mimeMatch = imgUrl.match(/data:image\/([a-zA-Z0-9]+);/)
        if (mimeMatch && mimeMatch[1]) {
          const mime = mimeMatch[1].toLowerCase()
          extension = mime === "jpeg" || mime === "jpg" ? "jpeg" : "png"
        }
        buffer = Buffer.from(parts[1], "base64")
      }
    } else if (imgUrl.startsWith("http://") || imgUrl.startsWith("https://")) {
      const res = await fetch(imgUrl)
      if (res.ok) {
        const arrBuf = await res.arrayBuffer()
        buffer = Buffer.from(arrBuf)
      }
    } else {
      const cleanPath = imgUrl.startsWith("/") ? imgUrl.substring(1) : imgUrl
      const localPath = path.join(process.cwd(), "public", cleanPath)
      if (fs.existsSync(localPath)) {
        buffer = fs.readFileSync(localPath)
      }
    }

    if (buffer && buffer.length > 0) {
      return { buffer, extension }
    }
  } catch (err) {
    console.error(`Failed to load image for costing export (${imgUrl}):`, err)
  }
  return null
}

/**
 * Apply borders to a row cell range.
 */
function applyBorders(ws: ExcelJS.Worksheet, rowNum: number, startCol: number, endCol: number) {
  for (let c = startCol; c <= endCol; c++) {
    const cell = ws.getRow(rowNum).getCell(c)
    cell.border = {
      top: { style: "thin", color: { argb: "CBD5E1" } },
      left: { style: "thin", color: { argb: "CBD5E1" } },
      bottom: { style: "thin", color: { argb: "CBD5E1" } },
      right: { style: "thin", color: { argb: "CBD5E1" } },
    }
  }
}

/**
 * Builds a professional Excel workbook for Quotation Costing Breakdown & Managerial Audit.
 */
export async function buildCostingExcelWorkbook(data: CostingExportData): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "BOSQ ERP System"
  workbook.lastModifiedBy = data.preparedBy?.name || "BOSQ ERP"
  workbook.created = new Date()

  const ws = workbook.addWorksheet("Costing Breakdown", {
    views: [{ showGridLines: true }]
  })

  // Set column widths matching 13-column audit table
  ws.columns = [
    { key: "colA", width: 2.5 },   // A: Left margin
    { key: "colB", width: 8.5 },   // B: Sl No
    { key: "colC", width: 22.0 },  // C: Product Image
    { key: "colD", width: 48.0 },  // D: Specifications
    { key: "colE", width: 9.5 },   // E: QTY
    { key: "colF", width: 16.0 },  // F: Factory Cost
    { key: "colG", width: 16.0 },  // G: Accessories Cost
    { key: "colH", width: 16.5 },  // H: Total Unit Cost
    { key: "colI", width: 12.0 },  // I: Margin %
    { key: "colJ", width: 14.0 },  // J: Negotiation %
    { key: "colK", width: 22.0 },  // K: Final Estimated Price (Unit)
    { key: "colL", width: 24.0 },  // L: Costing Done/ Not
    { key: "colM", width: 28.0 },  // M: Discount added By IDC
    { key: "colN", width: 18.0 },  // N: Final Price
    { key: "colO", width: 2.5 },   // O: Right margin
  ]

  // Embed logo if available
  try {
    const logoPaths = [
      path.join(process.cwd(), "public/assets/logo/BOSQ.png"),
      path.join(process.cwd(), "public/assets/logo/AYN Musk_PNG.png"),
      path.join(process.cwd(), "public/assets/logo/logo.png")
    ]
    const logoPath = logoPaths.find(p => fs.existsSync(p))
    if (logoPath) {
      const extension = logoPath.endsWith(".png") ? "png" : "jpeg"
      const logoId = workbook.addImage({
        filename: logoPath,
        extension: extension as any,
      })
      ws.addImage(logoId, {
        tl: { col: 1.2, row: 1.2 },
        ext: { width: 160, height: 50 },
        editAs: "oneCell"
      })
    }
  } catch (err) {
    console.error("Could not embed company logo in Costing Excel header:", err)
  }

  // Row 2: Top Banner Title
  ws.getRow(2).height = 32
  ws.mergeCells("B2:N2")
  const titleCell = ws.getCell("B2")
  titleCell.value = "BOSQ ERP — QUOTATION COSTING BREAKDOWN & MANAGERIAL AUDIT"
  titleCell.font = { name: "Arial", size: 15, bold: true, color: { argb: "FFFFFFFF" } }
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }
  titleCell.alignment = { horizontal: "center", vertical: "middle" }

  // Row 4: Metadata Headers
  ws.getRow(4).height = 20
  ws.getCell("B4").value = "Quotation #:"
  ws.getCell("B4").font = { name: "Arial", size: 10, bold: true, color: { argb: "FF475569" } }
  ws.getCell("C4").value = data.quotationNumber
  ws.getCell("C4").font = { name: "Arial", size: 11, bold: true }

  ws.getCell("F4").value = "Client Name:"
  ws.getCell("F4").font = { name: "Arial", size: 10, bold: true, color: { argb: "FF475569" } }
  ws.mergeCells("G4:I4")
  ws.getCell("G4").value = data.client?.companyName || "N/A"
  ws.getCell("G4").font = { name: "Arial", size: 11, bold: true }

  ws.getCell("K4").value = "Prepared By (IDC):"
  ws.getCell("K4").font = { name: "Arial", size: 10, bold: true, color: { argb: "FF475569" } }
  ws.mergeCells("L4:N4")
  ws.getCell("L4").value = data.preparedBy?.name || data.preparedBy?.email || "Sales Consultant"
  ws.getCell("L4").font = { name: "Arial", size: 11 }

  // Row 5: Metadata Row 2
  ws.getRow(5).height = 20
  ws.getCell("B5").value = "Export Date:"
  ws.getCell("B5").font = { name: "Arial", size: 10, bold: true, color: { argb: "FF475569" } }
  ws.getCell("C5").value = new Date()
  ws.getCell("C5").font = { name: "Arial", size: 10 }
  ws.getCell("C5").numFmt = "yyyy-mm-dd hh:mm"

  ws.getCell("F5").value = "Project Name:"
  ws.getCell("F5").font = { name: "Arial", size: 10, bold: true, color: { argb: "FF475569" } }
  ws.mergeCells("G5:I5")
  ws.getCell("G5").value = data.projectName || "Standard Project"
  ws.getCell("G5").font = { name: "Arial", size: 10 }

  ws.getCell("K5").value = "Cost Estimator:"
  ws.getCell("K5").font = { name: "Arial", size: 10, bold: true, color: { argb: "FF475569" } }
  ws.mergeCells("L5:N5")
  ws.getCell("L5").value = data.assignedEstimator?.name || "Cost Estimator"
  ws.getCell("L5").font = { name: "Arial", size: 11 }

  // Row 7: Table Headers Row
  const headerRowIndex = 7
  const hRow = ws.getRow(headerRowIndex)
  hRow.height = 36.0

  const tableHeaders = [
    { col: 2, label: "Sl No", fill: "FF000000", color: "FFFFFFFF" },
    { col: 3, label: "Product Image", fill: "FF000000", color: "FFFFFFFF" },
    { col: 4, label: "Product Specifications", fill: "FF000000", color: "FFFFFFFF" },
    { col: 5, label: "QTY", fill: "FF000000", color: "FFFFFFFF" },
    { col: 6, label: "Factory Cost", fill: "FF000000", color: "FFFFFFFF" },
    { col: 7, label: "Accessories Cost", fill: "FF000000", color: "FFFFFFFF" },
    { col: 8, label: "Total Unit Cost", fill: "FF000000", color: "FFFFFFFF" },
    { col: 9, label: "Margin %", fill: "FF000000", color: "FFFFFFFF" },
    { col: 10, label: "Negotiation %", fill: "FF000000", color: "FFFFFFFF" },
    { col: 11, label: "Final Estimated Price (Unit)", fill: "FF000000", color: "FFFFFFFF" },
    { col: 12, label: "Costing Done/ Not", fill: "FF000000", color: "FFFFFFFF" },
    { col: 13, label: "Discount added By Interior Design Consultant", fill: "FF020617", color: "FF34D399" }, // Highlighted IDC column
    { col: 14, label: "Final Price", fill: "FF000000", color: "FFFFFFFF" },
  ]

  tableHeaders.forEach((h) => {
    const cell = hRow.getCell(h.col)
    cell.value = h.label
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: h.color } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: h.fill } }
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
    cell.border = {
      top: { style: "thin", color: { argb: "000000" } },
      left: { style: "thin", color: { argb: "000000" } },
      bottom: { style: "thin", color: { argb: "000000" } },
      right: { style: "thin", color: { argb: "000000" } },
    }
  })

  // Row 8+: Populate Item Rows
  let currentRow = 8
  const itemStartRow = currentRow

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]
    const currentBatch = item.batchHeading ? item.batchHeading.trim() : ""
    const prevBatch = i > 0 && data.items[i - 1].batchHeading ? data.items[i - 1].batchHeading!.trim() : ""

    // Batch / Section Header Row
    if (currentBatch && currentBatch !== prevBatch && currentBatch !== "General Items") {
      const sRow = ws.getRow(currentRow)
      sRow.height = 24
      ws.mergeCells(`B${currentRow}:N${currentRow}`)
      const sCell = ws.getCell(`B${currentRow}`)
      sCell.value = `📁 SECTION: ${currentBatch.toUpperCase()}`
      sCell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } }
      sCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
      sCell.alignment = { horizontal: "left", vertical: "middle" }
      applyBorders(ws, currentRow, 2, 14)
      currentRow++
    }

    const row = ws.getRow(currentRow)
    row.height = 110 // Height for embedding product thumbnail

    // B: Sl No
    const bCell = ws.getCell(`B${currentRow}`)
    bCell.value = item.itemNo || i + 1
    bCell.font = { name: "Arial", size: 11, bold: true }
    bCell.alignment = { horizontal: "center", vertical: "middle" }

    // C: Product Image
    const cCell = ws.getCell(`C${currentRow}`)
    cCell.alignment = { horizontal: "center", vertical: "middle" }

    const imgUrl = item.imageUrl || item.customImageUrl || item.product?.imageUrl
    if (imgUrl) {
      try {
        const imgData = await getImageBufferAndExt(imgUrl)
        if (imgData) {
          const imgId = workbook.addImage({
            buffer: imgData.buffer as any,
            extension: imgData.extension as any,
          })
          ws.addImage(imgId, {
            tl: { col: 2.1, row: currentRow - 0.9 },
            ext: { width: 120, height: 100 },
            editAs: "oneCell",
          })
        }
      } catch (err) {
        console.error(`Failed to embed image for item ${item.itemNo}:`, err)
      }
    }

    // D: Specifications
    const dCell = ws.getCell(`D${currentRow}`)
    const specLines: string[] = []

    specLines.push(`Model Code: ${item.modelCode || item.description || "N/A"}`)
    if (item.productType) specLines.push(`Product Type: ${item.productType}`)
    if (item.upholsteryMaterial) specLines.push(`Upholstery Material: ${item.upholsteryMaterial}`)
    if (item.baseType) specLines.push(`Base Type: ${item.baseType}`)
    if (item.finishColor) specLines.push(`Finish/Color: ${item.finishColor}`)
    if (item.recommendedUsage) specLines.push(`Recommended Usage: ${item.recommendedUsage}`)

    const extraSpecs = cleanText(item.specifications)
    if (extraSpecs) specLines.push(extraSpecs)

    dCell.value = specLines.join("\n")
    dCell.font = { name: "Arial", size: 9.5 }
    dCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true }

    // E: QTY
    const eCell = ws.getCell(`E${currentRow}`)
    eCell.value = item.quantity || 1
    eCell.font = { name: "Arial", size: 11 }
    eCell.alignment = { horizontal: "center", vertical: "middle" }
    eCell.numFmt = "#,##0"

    // F: Factory Cost
    const fCell = ws.getCell(`F${currentRow}`)
    fCell.value = Math.round(item.factoryCost || 0)
    fCell.font = { name: "Arial", size: 10.5 }
    fCell.alignment = { horizontal: "right", vertical: "middle" }
    fCell.numFmt = "#,##0.00"

    // G: Accessories Cost
    const gCell = ws.getCell(`G${currentRow}`)
    gCell.value = Math.round(item.accessoriesCost || 0)
    gCell.font = { name: "Arial", size: 10.5 }
    gCell.alignment = { horizontal: "right", vertical: "middle" }
    gCell.numFmt = "#,##0.00"

    // H: Total Unit Cost
    const hCell = ws.getCell(`H${currentRow}`)
    hCell.value = {
      formula: `F${currentRow}+G${currentRow}`,
      result: item.totalCostUnit || (item.factoryCost + item.accessoriesCost)
    }
    hCell.font = { name: "Arial", size: 10.5, bold: true }
    hCell.alignment = { horizontal: "right", vertical: "middle" }
    hCell.numFmt = "#,##0.00"

    // I: Margin %
    const iCell = ws.getCell(`I${currentRow}`)
    iCell.value = (item.marginPct || 0) / 100
    iCell.font = { name: "Arial", size: 10.5 }
    iCell.alignment = { horizontal: "center", vertical: "middle" }
    iCell.numFmt = "0%"

    // J: Negotiation %
    const jCell = ws.getCell(`J${currentRow}`)
    jCell.value = (item.negotiationPct || 0) / 100
    jCell.font = { name: "Arial", size: 10.5 }
    jCell.alignment = { horizontal: "center", vertical: "middle" }
    jCell.numFmt = "0%"

    // K: Final Estimated Price (Unit)
    const kCell = ws.getCell(`K${currentRow}`)
    kCell.value = item.estimatorPriceUnit || 0
    kCell.font = { name: "Arial", size: 10.5, bold: true }
    kCell.alignment = { horizontal: "right", vertical: "middle" }
    kCell.numFmt = "#,##0.00"

    // L: Costing Done/ Not
    const lCell = ws.getCell(`L${currentRow}`)
    lCell.value = item.costingStatusText || (item.costingDone ? "Costing Completed" : "Pending Costing")
    lCell.font = { name: "Arial", size: 10, bold: true, color: { argb: item.costingDone ? "FF047857" : "FFD97706" } }
    lCell.alignment = { horizontal: "center", vertical: "middle" }

    // M: Discount added By IDC (Highlighted)
    const mCell = ws.getCell(`M${currentRow}`)
    mCell.value = typeof item.discountByIDC === "number" ? `${item.discountByIDC}%` : String(item.discountByIDC || "0%")
    mCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF065F46" } }
    mCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } }
    mCell.alignment = { horizontal: "center", vertical: "middle" }

    // N: Final Price
    const nCell = ws.getCell(`N${currentRow}`)
    nCell.value = Math.round(item.finalPriceUnit || 0)
    nCell.font = { name: "Arial", size: 11, bold: true }
    nCell.alignment = { horizontal: "right", vertical: "middle" }
    nCell.numFmt = "#,##0.00"

    applyBorders(ws, currentRow, 2, 14)
    currentRow++
  }

  const lastItemRow = currentRow - 1

  // ---------------------------------------------------------
  // Totals & Summary Block at Bottom
  // ---------------------------------------------------------
  ws.getRow(currentRow).height = 12 // Spacer

  currentRow++
  const totRow = ws.getRow(currentRow)
  totRow.height = 28

  ws.mergeCells(`B${currentRow}:E${currentRow}`)
  const labelCell = ws.getCell(`B${currentRow}`)
  labelCell.value = "GRAND TOTALS (ALL LINE ITEMS)"
  labelCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } }
  labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }
  labelCell.alignment = { horizontal: "center", vertical: "middle" }

  // F: Total Factory Cost
  const fTot = ws.getCell(`F${currentRow}`)
  fTot.value = { formula: `SUMPRODUCT(E${itemStartRow}:E${lastItemRow}, F${itemStartRow}:F${lastItemRow})` }
  fTot.font = { name: "Arial", size: 11, bold: true }
  fTot.alignment = { horizontal: "right", vertical: "middle" }
  fTot.numFmt = "#,##0.00"
  fTot.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }

  // G: Total Accessories Cost
  const gTot = ws.getCell(`G${currentRow}`)
  gTot.value = { formula: `SUMPRODUCT(E${itemStartRow}:E${lastItemRow}, G${itemStartRow}:G${lastItemRow})` }
  gTot.font = { name: "Arial", size: 11, bold: true }
  gTot.alignment = { horizontal: "right", vertical: "middle" }
  gTot.numFmt = "#,##0.00"
  gTot.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }

  // H: Total Cost
  const hTot = ws.getCell(`H${currentRow}`)
  hTot.value = { formula: `SUMPRODUCT(E${itemStartRow}:E${lastItemRow}, H${itemStartRow}:H${lastItemRow})` }
  hTot.font = { name: "Arial", size: 11, bold: true }
  hTot.alignment = { horizontal: "right", vertical: "middle" }
  hTot.numFmt = "#,##0.00"
  hTot.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } }

  ws.mergeCells(`I${currentRow}:J${currentRow}`)

  // K: Estimator Revenue Total
  const kTot = ws.getCell(`K${currentRow}`)
  kTot.value = { formula: `SUMPRODUCT(E${itemStartRow}:E${lastItemRow}, K${itemStartRow}:K${lastItemRow})` }
  kTot.font = { name: "Arial", size: 11, bold: true }
  kTot.alignment = { horizontal: "right", vertical: "middle" }
  kTot.numFmt = "#,##0.00"
  kTot.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }

  ws.mergeCells(`L${currentRow}:M${currentRow}`)
  const lTotLabel = ws.getCell(`L${currentRow}`)
  lTotLabel.value = "Consultant Final Selling Total:"
  lTotLabel.font = { name: "Arial", size: 10, bold: true }
  lTotLabel.alignment = { horizontal: "right", vertical: "middle" }

  // N: Consultant Final Total
  const nTot = ws.getCell(`N${currentRow}`)
  nTot.value = { formula: `SUMPRODUCT(E${itemStartRow}:E${lastItemRow}, N${itemStartRow}:N${lastItemRow})` }
  nTot.font = { name: "Arial", size: 12, bold: true, color: { argb: "FF0F172A" } }
  nTot.alignment = { horizontal: "right", vertical: "middle" }
  nTot.numFmt = "#,##0.00"
  nTot.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF08A" } } // Yellow highlight

  applyBorders(ws, currentRow, 2, 14)

  return workbook
}
