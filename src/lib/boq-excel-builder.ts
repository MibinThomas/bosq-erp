import ExcelJS from "exceljs"
import path from "path"
import fs from "fs"

export interface BoqExportData {
  boqNumber: string
  projectName?: string | null
  customerSegment?: string | null
  deliveryDate?: string | Date | null
  paymentTerms?: string | null
  notes?: string | null
  createdAt: string | Date
  totalSellingPrice: number
  client: {
    clientId: string
    companyName: string
    contactPersonName?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
  }
  preparedBy: {
    name?: string | null
    email?: string | null
    phone?: string | null
  }
  estimator?: {
    name?: string | null
  } | null
  items: Array<{
    id: string
    itemNo: number
    description: string
    specifications?: string | null
    quantity: number
    factoryCost?: number | null
    accessoriesCost?: number | null
    unitCost?: number | null
    marginPercentage?: number | null
    negotiationPercentage?: number | null
    negotiationAmount?: number | null
    unitSellingPrice: number
    totalSellingPrice: number
    customImageUrl?: string | null
    product?: {
      imageUrl?: string | null
    } | null
  }>
}

/**
 * Builds a highly styled, professional BOQ Excel Workbook matching the template design of 
 * public/BOQ/I2671-1_Age Group DMCC.xlsx with exact row heights, column widths, image scaling,
 * formulas, styles, and disclaimers.
 */
export async function buildBoqExcelWorkbook(boq: BoqExportData, includeCostingSheet: boolean = true): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "BOSQ ERP System"
  workbook.lastModifiedBy = boq.preparedBy?.name || "BOSQ ERP"
  workbook.created = new Date()

  // ---------------------------------------------------------
  // SHEET 1: "BOQ" (Customer Presentation Format)
  // ---------------------------------------------------------
  const ws = workbook.addWorksheet("BOQ", {
    views: [{ showGridLines: true }]
  })

  // Set exact column widths matching template
  ws.columns = [
    { key: "colA", width: 2.625 },  // A: Left margin padding
    { key: "colB", width: 16.625 }, // B: Item No / Metadata label
    { key: "colC", width: 46.25 },  // C: Description & Specifications
    { key: "colD", width: 41.25 },  // D: Picture / Image
    { key: "colE", width: 9.25 },   // E: Qty
    { key: "colF", width: 11.50 },  // F: Unit Price / Labels
    { key: "colG", width: 19.125 }, // G: Amount / Totals
    { key: "colH", width: 2.625 },  // H: Right margin padding
  ]

  // Try embedding logo in header
  try {
    const logoPaths = [
      path.join(process.cwd(), "public/assets/logo/BOSQ.png"),
      path.join(process.cwd(), "public/assets/logo/AYN Musk_PNG.png"),
      path.join(process.cwd(), "public/assets/logo/logo.png")
    ]
    let logoPath = logoPaths.find(p => fs.existsSync(p))
    if (logoPath) {
      const extension = logoPath.endsWith(".png") ? "png" : "jpeg"
      const logoId = workbook.addImage({
        filename: logoPath,
        extension: extension as any,
      })
      ws.addImage(logoId, {
        tl: { col: 1.2, row: 1.2 }, // Cell B2 area
        ext: { width: 180, height: 60 },
        editAs: "oneCell"
      })
    }
  } catch (err) {
    console.error("Could not embed company logo in Excel header:", err)
  }

  // Row 2: Top spacing
  ws.getRow(2).height = 30.95

  // Row 4: Company Title & Quotation Label
  ws.getRow(4).height = 28.5
  ws.mergeCells("B4:E4")
  const compCell = ws.getCell("B4")
  compCell.value = "BOSQ OFFICE FURNITURE TRADING L.L.C"
  compCell.font = { name: "Arial", size: 18, bold: true, color: { argb: "FF1E293B" } }

  ws.mergeCells("G4:H4")
  const qCell = ws.getCell("G4")
  qCell.value = "Quotation"
  qCell.font = { name: "Arial", size: 24, bold: false, color: { argb: "FF64748B" } }
  qCell.alignment = { horizontal: "right", vertical: "middle" }

  // Row 5: Address Line 1 & Date
  ws.getRow(5).height = 15
  ws.mergeCells("B5:E5")
  ws.getCell("B5").value = "OFFICE NO 133, KML Business Centre, Al Quoz 1"
  ws.getCell("B5").font = { name: "Arial", size: 11, color: { argb: "FF475569" } }

  ws.getCell("F5").value = "Date :"
  ws.getCell("F5").font = { name: "Arial", size: 11, bold: true }
  ws.getCell("F5").alignment = { horizontal: "right", vertical: "middle" }

  const formattedDate = new Date(boq.createdAt)
  ws.getCell("G5").value = formattedDate
  ws.getCell("G5").font = { name: "Arial", size: 11 }
  ws.getCell("G5").numFmt = "d mmm yyyy"

  // Row 6: Address Line 2 & Quotation #
  ws.getRow(6).height = 15
  ws.mergeCells("B6:E6")
  ws.getCell("B6").value = "Meydan Road, Dubai, UAE"
  ws.getCell("B6").font = { name: "Arial", size: 11, color: { argb: "FF475569" } }

  ws.getCell("F6").value = "Quotation # :"
  ws.getCell("F6").font = { name: "Arial", size: 11, bold: true }
  ws.getCell("F6").alignment = { horizontal: "right", vertical: "middle" }

  ws.getCell("G6").value = boq.boqNumber
  ws.getCell("G6").font = { name: "Arial", size: 11, bold: true, color: { argb: "FF000000" } }
  ws.getCell("G6").alignment = { horizontal: "left", vertical: "middle" }

  // Row 7: Address Line 3 & Customer ID
  ws.getRow(7).height = 15
  ws.mergeCells("B7:E7")
  ws.getCell("B7").value = "Dubai, PO BOX 294568"
  ws.getCell("B7").font = { name: "Arial", size: 11, color: { argb: "FF475569" } }

  ws.getCell("F7").value = "Customer ID :"
  ws.getCell("F7").font = { name: "Arial", size: 11, bold: true }
  ws.getCell("F7").alignment = { horizontal: "right", vertical: "middle" }

  ws.getCell("G7").value = boq.client.clientId || "N/A"
  ws.getCell("G7").font = { name: "Arial", size: 11 }
  ws.getCell("G7").alignment = { horizontal: "left", vertical: "middle" }

  // Row 8: Contact Phone Block
  ws.getRow(8).height = 22.5
  ws.mergeCells("B8:E8")
  ws.getCell("B8").value = "Phone: +971 4 529 9697   Mob No: +971 50 427 2128"
  ws.getCell("B8").font = { name: "Arial", size: 11, color: { argb: "FF475569" } }

  // Row 9: Customer Info Title & Validity
  ws.getRow(9).height = 15
  ws.getCell("B9").value = "Quotation For:"
  ws.getCell("B9").font = { name: "Arial", size: 11, bold: true }

  ws.getCell("F9").value = "Quotation valid until:"
  ws.getCell("F9").font = { name: "Arial", size: 11, italic: true }
  ws.getCell("F9").alignment = { horizontal: "right", vertical: "middle" }

  const validityDate = new Date(formattedDate.getTime() + 30 * 24 * 60 * 60 * 1000)
  ws.getCell("G9").value = validityDate
  ws.getCell("G9").font = { name: "Arial", size: 11 }
  ws.getCell("G9").numFmt = "d mmm yyyy"

  // Rows 10-15: Customer Details Table
  ws.getRow(10).height = 15.75
  ws.getCell("B10").value = "Name"
  ws.getCell("B10").font = { name: "Arial", size: 11, color: { argb: "FF64748B" } }
  ws.getCell("C10").value = boq.client.contactPersonName || boq.client.companyName
  ws.getCell("C10").font = { name: "Arial", size: 11 }

  ws.getCell("F10").value = "Prepared by:"
  ws.getCell("F10").font = { name: "Arial", size: 11, italic: true }
  ws.getCell("F10").alignment = { horizontal: "right", vertical: "middle" }
  ws.getCell("G10").value = boq.preparedBy.name || "Sales Team"
  ws.getCell("G10").font = { name: "Arial", size: 11, bold: true }

  ws.getRow(11).height = 15
  ws.getCell("B11").value = "Company Name"
  ws.getCell("B11").font = { name: "Arial", size: 11, color: { argb: "FF64748B" } }
  ws.getCell("C11").value = boq.client.companyName
  ws.getCell("C11").font = { name: "Arial", size: 11, bold: true }

  ws.getRow(12).height = 15
  ws.getCell("B12").value = "Street Address"
  ws.getCell("B12").font = { name: "Arial", size: 11, color: { argb: "FF64748B" } }
  ws.getCell("C12").value = boq.client.address || "Dubai, UAE"
  ws.getCell("C12").font = { name: "Arial", size: 11 }

  ws.getRow(13).height = 15
  ws.getCell("B13").value = "City, ST ZIP Code"
  ws.getCell("B13").font = { name: "Arial", size: 11, color: { argb: "FF64748B" } }
  ws.getCell("C13").value = "Dubai, UAE"
  ws.getCell("C13").font = { name: "Arial", size: 11 }

  ws.getRow(14).height = 15.75
  ws.getCell("B14").value = "Phone"
  ws.getCell("B14").font = { name: "Arial", size: 11, color: { argb: "FF64748B" } }
  ws.getCell("C14").value = boq.client.phone || "N/A"
  ws.getCell("C14").font = { name: "Arial", size: 11 }

  ws.getRow(15).height = 15.75
  ws.getCell("B15").value = "Email"
  ws.getCell("B15").font = { name: "Arial", size: 11, color: { argb: "FF64748B" } }
  ws.getCell("C15").value = boq.client.email || "N/A"
  ws.getCell("C15").font = { name: "Arial", size: 11 }

  // Row 16: Special Notes / Comments
  ws.getRow(16).height = 35
  ws.mergeCells("B16:D16")
  ws.getCell("B16").value = `Comments or Special Instructions: ${boq.notes || "Standard Supply & Installation as per design requirements."}`
  ws.getCell("B16").font = { name: "Arial", size: 10, italic: true, color: { argb: "FF475569" } }
  ws.getCell("B16").alignment = { vertical: "top", wrapText: true }

  // Row 17: Metadata Header Bar
  ws.getRow(17).height = 24.95
  ws.mergeCells("B17:C17")
  ws.getCell("B17").value = "SALES PERSON"
  ws.getCell("B17").font = { name: "Arial", size: 11, bold: true }
  ws.getCell("B17").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }
  ws.getCell("B17").alignment = { horizontal: "center", vertical: "middle" }

  ws.getCell("D17").value = "PROJECT / DELIVERY DATE"
  ws.getCell("D17").font = { name: "Arial", size: 11, bold: true }
  ws.getCell("D17").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }
  ws.getCell("D17").alignment = { horizontal: "center", vertical: "middle" }

  ws.mergeCells("E17:G17")
  ws.getCell("E17").value = "PAYMENT TERMS"
  ws.getCell("E17").font = { name: "Arial", size: 11, bold: true }
  ws.getCell("E17").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }
  ws.getCell("E17").alignment = { horizontal: "center", vertical: "middle" }

  applyRowBorders(ws, 17, 2, 7)

  // Row 18: Metadata Values Bar
  ws.getRow(18).height = 24.95
  ws.mergeCells("B18:C18")
  ws.getCell("B18").value = boq.preparedBy.name || "Sales Team"
  ws.getCell("B18").font = { name: "Arial", size: 11 }
  ws.getCell("B18").alignment = { horizontal: "center", vertical: "middle" }

  ws.getCell("D18").value = boq.projectName || "Standard Project"
  ws.getCell("D18").font = { name: "Arial", size: 11 }
  ws.getCell("D18").alignment = { horizontal: "center", vertical: "middle" }

  ws.mergeCells("E18:G18")
  ws.getCell("E18").value = boq.paymentTerms || "50% Advance & Balance Against Delivery"
  ws.getCell("E18").font = { name: "Arial", size: 11 }
  ws.getCell("E18").alignment = { horizontal: "center", vertical: "middle", wrapText: true }

  applyRowBorders(ws, 18, 2, 7)

  // Row 19: Spacer
  ws.getRow(19).height = 13.5

  // Row 20: Table Header Row
  const tableHeaderRowIndex = 20
  const headerRow = ws.getRow(tableHeaderRowIndex)
  headerRow.height = 30.0

  const tableHeaders = [
    { col: 2, key: "B", label: "ITEM NO." },
    { col: 3, key: "C", label: "DESCRIPTION" },
    { col: 4, key: "D", label: "PICTURE" },
    { col: 5, key: "E", label: "QTY" },
    { col: 6, key: "F", label: "UNIT PRICE" },
    { col: 7, key: "G", label: "AMOUNT" },
  ]

  tableHeaders.forEach(h => {
    const cell = ws.getCell(`${h.key}${tableHeaderRowIndex}`)
    cell.value = h.label
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF0F172A" } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }
    cell.alignment = { horizontal: "center", vertical: "middle" }
    cell.border = {
      top: { style: "thin", color: { argb: "CBD5E1" } },
      left: { style: "thin", color: { argb: "CBD5E1" } },
      bottom: { style: "thin", color: { argb: "CBD5E1" } },
      right: { style: "thin", color: { argb: "CBD5E1" } }
    }
  })

  // ---------------------------------------------------------
  // Populate Item Rows (Row 21+)
  // ---------------------------------------------------------
  let itemStartRow = 21
  let currentRow = itemStartRow

  for (let i = 0; i < boq.items.length; i++) {
    const item = boq.items[i]
    const row = ws.getRow(currentRow)
    row.height = 231.75 // Exact height matching reference template for clear picture display

    // B: Item Number
    const bCell = ws.getCell(`B${currentRow}`)
    bCell.value = item.itemNo || (i + 1)
    bCell.font = { name: "Arial", size: 12 }
    bCell.alignment = { horizontal: "center", vertical: "middle" }
    bCell.numFmt = "#,##0"

    // C: Description & Specifications
    const cCell = ws.getCell(`C${currentRow}`)
    let fullDesc = (item.description || "").trim()
    if (item.specifications && item.specifications.trim()) {
      fullDesc += `\n${item.specifications.trim()}`
    }
    cCell.value = fullDesc
    cCell.font = { name: "Arial", size: 11 }
    cCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true }

    // D: Picture Column - Border applied
    const dCell = ws.getCell(`D${currentRow}`)
    dCell.alignment = { horizontal: "center", vertical: "middle" }

    // Embed Product Image cleanly in Column D
    const imgUrl = item.customImageUrl || item.product?.imageUrl
    if (imgUrl) {
      try {
        let extension = "jpeg"
        if (imgUrl.toLowerCase().includes("png")) extension = "png"

        let imageId: number | null = null

        if (imgUrl.startsWith("data:image")) {
          const base64Data = imgUrl.split(",")[1]
          imageId = workbook.addImage({
            base64: base64Data,
            extension: extension as any,
          })
        } else {
          // Check local file in public folder
          const cleanPath = imgUrl.startsWith("/") ? imgUrl.substring(1) : imgUrl
          const localPath = path.join(process.cwd(), "public", cleanPath)
          if (fs.existsSync(localPath)) {
            imageId = workbook.addImage({
              filename: localPath,
              extension: extension as any,
            })
          }
        }

        if (imageId !== null) {
          ws.addImage(imageId, {
            tl: { col: 3.15, row: currentRow - 0.92 }, // Centered nicely inside D cell
            ext: { width: 260, height: 260 },
            editAs: "oneCell",
          })
        }
      } catch (err) {
        console.error(`Failed to embed image for BOQ item ${item.itemNo}:`, err)
      }
    }

    // E: Quantity
    const eCell = ws.getCell(`E${currentRow}`)
    eCell.value = item.quantity || 0
    eCell.font = { name: "Arial", size: 12 }
    eCell.alignment = { horizontal: "center", vertical: "middle" }
    eCell.numFmt = "#,##0"

    // F: Unit Price
    const fCell = ws.getCell(`F${currentRow}`)
    fCell.value = item.unitSellingPrice || 0
    fCell.font = { name: "Arial", size: 12 }
    fCell.alignment = { horizontal: "right", vertical: "middle" }
    fCell.numFmt = "#,##0.00"

    // G: Amount (Line Total) with Excel Formula
    const gCell = ws.getCell(`G${currentRow}`)
    gCell.value = {
      formula: `IFERROR(IF(E${currentRow}, E${currentRow}*F${currentRow}, ""), "")`,
      result: (item.quantity || 0) * (item.unitSellingPrice || 0)
    }
    gCell.font = { name: "Arial", size: 12 }
    gCell.alignment = { horizontal: "right", vertical: "middle" }
    gCell.numFmt = "#,##0.00"

    // Apply borders across columns B-G
    ;["B", "C", "D", "E", "F", "G"].forEach((colKey: string) => {
      const cell = ws.getCell(`${colKey}${currentRow}`)
      cell.border = {
        top: { style: "thin", color: { argb: "CBD5E1" } },
        left: { style: "thin", color: { argb: "CBD5E1" } },
        bottom: { style: "thin", color: { argb: "CBD5E1" } },
        right: { style: "thin", color: { argb: "CBD5E1" } }
      }
    })

    currentRow++
  }

  const lastItemRow = currentRow - 1

  // ---------------------------------------------------------
  // Totals Section
  // ---------------------------------------------------------

  // Subtotal Row
  const subtotalRow = currentRow
  ws.getRow(subtotalRow).height = 30
  ws.getCell(`F${subtotalRow}`).value = "SUBTOTAL (AED)"
  ws.getCell(`F${subtotalRow}`).font = { name: "Arial", size: 11, bold: true }
  ws.getCell(`F${subtotalRow}`).alignment = { horizontal: "right", vertical: "middle" }

  ws.getCell(`G${subtotalRow}`).value = {
    formula: `SUM(G${itemStartRow}:G${lastItemRow})`,
    result: boq.totalSellingPrice
  }
  ws.getCell(`G${subtotalRow}`).font = { name: "Arial", size: 11, bold: true }
  ws.getCell(`G${subtotalRow}`).alignment = { horizontal: "right", vertical: "middle" }
  ws.getCell(`G${subtotalRow}`).numFmt = "#,##0.00"
  ws.getCell(`G${subtotalRow}`).border = {
    top: { style: "thin", color: { argb: "CBD5E1" } },
    left: { style: "thin", color: { argb: "CBD5E1" } },
    bottom: { style: "thin", color: { argb: "CBD5E1" } },
    right: { style: "thin", color: { argb: "CBD5E1" } }
  }

  // Other Charges Row
  currentRow++
  const otherRow = currentRow
  ws.getRow(otherRow).height = 30
  ws.getCell(`F${otherRow}`).value = "OTHER (AED)"
  ws.getCell(`F${otherRow}`).font = { name: "Arial", size: 11 }
  ws.getCell(`F${otherRow}`).alignment = { horizontal: "right", vertical: "middle" }

  ws.getCell(`G${otherRow}`).value = 0
  ws.getCell(`G${otherRow}`).font = { name: "Arial", size: 11 }
  ws.getCell(`G${otherRow}`).alignment = { horizontal: "right", vertical: "middle" }
  ws.getCell(`G${otherRow}`).numFmt = "#,##0.00"
  ws.getCell(`G${otherRow}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }
  ws.getCell(`G${otherRow}`).border = {
    top: { style: "thin", color: { argb: "CBD5E1" } },
    left: { style: "thin", color: { argb: "CBD5E1" } },
    bottom: { style: "thin", color: { argb: "CBD5E1" } },
    right: { style: "thin", color: { argb: "CBD5E1" } }
  }

  // VAT Row (5%)
  currentRow++
  const vatRow = currentRow
  ws.getRow(vatRow).height = 30
  ws.getCell(`F${vatRow}`).value = "VAT (5%) (AED)"
  ws.getCell(`F${vatRow}`).font = { name: "Arial", size: 11 }
  ws.getCell(`F${vatRow}`).alignment = { horizontal: "right", vertical: "middle" }

  ws.getCell(`G${vatRow}`).value = {
    formula: `(G${subtotalRow}+G${otherRow})*0.05`,
    result: boq.totalSellingPrice * 0.05
  }
  ws.getCell(`G${vatRow}`).font = { name: "Arial", size: 11 }
  ws.getCell(`G${vatRow}`).alignment = { horizontal: "right", vertical: "middle" }
  ws.getCell(`G${vatRow}`).numFmt = "#,##0.00"
  ws.getCell(`G${vatRow}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }
  ws.getCell(`G${vatRow}`).border = {
    top: { style: "thin", color: { argb: "CBD5E1" } },
    left: { style: "thin", color: { argb: "CBD5E1" } },
    bottom: { style: "thin", color: { argb: "CBD5E1" } },
    right: { style: "thin", color: { argb: "CBD5E1" } }
  }

  // Delivery & Installation Row
  currentRow++
  const deliveryRow = currentRow
  ws.getRow(deliveryRow).height = 30
  ws.getCell(`F${deliveryRow}`).value = "DELIVERY AND INSTALLATION"
  ws.getCell(`F${deliveryRow}`).font = { name: "Arial", size: 11 }
  ws.getCell(`F${deliveryRow}`).alignment = { horizontal: "right", vertical: "middle" }

  ws.getCell(`G${deliveryRow}`).value = 0
  ws.getCell(`G${deliveryRow}`).font = { name: "Arial", size: 11 }
  ws.getCell(`G${deliveryRow}`).alignment = { horizontal: "right", vertical: "middle" }
  ws.getCell(`G${deliveryRow}`).numFmt = "#,##0.00"
  ws.getCell(`G${deliveryRow}`).border = {
    top: { style: "thin", color: { argb: "CBD5E1" } },
    left: { style: "thin", color: { argb: "CBD5E1" } },
    bottom: { style: "thin", color: { argb: "CBD5E1" } },
    right: { style: "thin", color: { argb: "CBD5E1" } }
  }

  // Grand Total Row
  currentRow++
  const grandTotalRow = currentRow
  ws.getRow(grandTotalRow).height = 30
  ws.getCell(`F${grandTotalRow}`).value = "TOTAL (AED)"
  ws.getCell(`F${grandTotalRow}`).font = { name: "Arial", size: 12, bold: true }
  ws.getCell(`F${grandTotalRow}`).alignment = { horizontal: "right", vertical: "middle" }

  ws.getCell(`G${grandTotalRow}`).value = {
    formula: `G${subtotalRow}+G${otherRow}+G${vatRow}+G${deliveryRow}`,
    result: boq.totalSellingPrice * 1.05
  }
  ws.getCell(`G${grandTotalRow}`).font = { name: "Arial", size: 12, bold: true }
  ws.getCell(`G${grandTotalRow}`).alignment = { horizontal: "right", vertical: "middle" }
  ws.getCell(`G${grandTotalRow}`).numFmt = "#,##0.00"
  ws.getCell(`G${grandTotalRow}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }
  ws.getCell(`G${grandTotalRow}`).border = {
    top: { style: "thin", color: { argb: "000000" } },
    left: { style: "thin", color: { argb: "000000" } },
    bottom: { style: "double", color: { argb: "000000" } },
    right: { style: "thin", color: { argb: "000000" } }
  }

  // Spacer
  currentRow++
  ws.getRow(currentRow).height = 15

  // ---------------------------------------------------------
  // Disclaimers & Terms Blocks
  // ---------------------------------------------------------

  // Item Special Note Banner Row
  currentRow++
  ws.getRow(currentRow).height = 25
  ws.mergeCells(`B${currentRow}:G${currentRow}`)
  const noteCell = ws.getCell(`B${currentRow}`)
  noteCell.value = "Note : All items custom-manufactured as per approved finishes, colors, and dimensions."
  noteCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFDC2626" } }
  noteCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF9C3" } } // Light yellow tint
  noteCell.alignment = { horizontal: "center", vertical: "middle" }
  applyRowBorders(ws, currentRow, 2, 7)

  // Design Approval Box
  currentRow++
  const boxStartRow = currentRow
  ws.getRow(currentRow).height = 145
  ws.mergeCells(`B${currentRow}:G${currentRow}`)

  const disclaimerText =
`Design Approval & Client Responsibility

All final design approvals—including but not limited to dimensions, materials, colors, layouts, and product specifications—are the sole responsibility of the client. BOSQ provides detailed quotations and design documentation for client review and confirmation prior to production.
We strongly advise clients to carefully review all details before providing written or signed approval. Once approved, BOSQ will proceed with production based on the confirmed specifications, and any changes or errors identified thereafter may result in additional costs and timeline delays, which will be borne by the client.
BOSQ will not be held liable for discrepancies in dimensions or specifications that were approved by the client.`

  const discCell = ws.getCell(`B${currentRow}`)
  discCell.value = disclaimerText
  discCell.font = { name: "Arial", size: 10, color: { argb: "FFB91C1C" } }
  discCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFEBEE" } } // Light pink tint
  discCell.alignment = { horizontal: "left", vertical: "top", wrapText: true }
  applyRowBorders(ws, currentRow, 2, 7)

  // Terms & Conditions Block
  currentRow++
  ws.getRow(currentRow).height = 390
  ws.mergeCells(`B${currentRow}:G${currentRow}`)

  const termsText =
`TERMS & CONDITIONS GOVERNING OUR OFFER:

1. Validity: The offer is valid for a period of 30 days from the date of the quotation unless previously withdrawn.
2. The above quote is prepared based on the Furniture selection done by Customer as per the specifications mentioned OR discussed.
3. For the Furniture endorsed with powder coated metals, the cost of any such material would be applicable based on the selection done from the brand Catalogues available with us.
4. Payment Terms: 50% Advance on order confirmation, 50% Balance prior to dispatch/delivery.
5. In case material dispatched are not accepted at site due to non-readiness of site or non-availability of space, demurrage or additional transport charges shall be borne by the customer.
6. Lead time: Standard designs require 30-45 days lead time for delivery from date of order confirmation and advance payment.
7. Transportation, Delivery and Unloading charges inside premises are included as specified in the quotation.
8. In the event of unforeseen price fluctuations in raw material cost, the company reserves the right to revise quoted values after appropriate intimation.
9. Once goods are ready for delivery, holding up to maximum 3 days is permissible beyond which warehouse charges will apply.
10. Material procurement commences after 50% advance payment; no cancellation or refund is possible after advance payment.
11. Arrangement of manpower or space readiness at site is the customer's responsibility.

We look forward to receiving your Valuable Purchase Order. Thanking you & assuming of our best attention always.

For BOSQ OFFICE FURNITURE TRADING L.L.C
Thank you`

  const termsCell = ws.getCell(`B${currentRow}`)
  termsCell.value = termsText
  termsCell.font = { name: "Arial", size: 10, color: { argb: "FF334155" } }
  termsCell.alignment = { horizontal: "left", vertical: "top", wrapText: true }

  // ---------------------------------------------------------
  // SHEET 2: "EG Cost" (Estimator Detailed Costing Sheet)
  // ---------------------------------------------------------
  if (includeCostingSheet) {
    const wsCost = workbook.addWorksheet("EG Cost", {
      views: [{ showGridLines: true }]
    })

    wsCost.columns = [
      { key: "cA", width: 2.625 },
      { key: "cB", width: 10 },    // Item No
      { key: "cC", width: 40 },    // Description
      { key: "cD", width: 25 },    // Picture
      { key: "cE", width: 8 },     // Qty
      { key: "cF", width: 14 },    // Factory Cost
      { key: "cG", width: 14 },    // Accessories
      { key: "cH", width: 14 },    // Base Price
      { key: "cI", width: 12 },    // Margin %
      { key: "cJ", width: 16 },    // Final Unit Price
      { key: "cK", width: 18 },    // Amount
    ]

    // Title
    wsCost.mergeCells("B2:K2")
    const cTitle = wsCost.getCell("B2")
    cTitle.value = `BOQ ESTIMATOR & COSTING BREAKDOWN - ${boq.boqNumber}`
    cTitle.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } }
    cTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
    cTitle.alignment = { horizontal: "center", vertical: "middle" }
    wsCost.getRow(2).height = 30

    // Header row
    const costHeaderRow = wsCost.getRow(4)
    costHeaderRow.height = 25
    const costHeaders = [
      "ITEM NO.", "DESCRIPTION", "PICTURE", "QTY", 
      "FACTORY COST", "ACCESSORIES", "BASE COST", "MARGIN %", "UNIT PRICE", "TOTAL AMOUNT"
    ]
    costHeaders.forEach((h, idx) => {
      const cell = costHeaderRow.getCell(idx + 2)
      cell.value = h
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEA580C" } }
      cell.alignment = { horizontal: "center", vertical: "middle" }
    })

    let cRow = 5
    for (let i = 0; i < boq.items.length; i++) {
      const item = boq.items[i]
      const r = wsCost.getRow(cRow)
      r.height = 100

      wsCost.getCell(`B${cRow}`).value = item.itemNo || (i + 1)
      wsCost.getCell(`B${cRow}`).alignment = { horizontal: "center", vertical: "middle" }

      wsCost.getCell(`C${cRow}`).value = `${item.description}\n${item.specifications || ""}`
      wsCost.getCell(`C${cRow}`).alignment = { wrapText: true, vertical: "middle" }

      wsCost.getCell(`E${cRow}`).value = item.quantity || 1
      wsCost.getCell(`E${cRow}`).alignment = { horizontal: "center", vertical: "middle" }

      wsCost.getCell(`F${cRow}`).value = item.factoryCost || 0
      wsCost.getCell(`F${cRow}`).numFmt = "#,##0.00"

      wsCost.getCell(`G${cRow}`).value = item.accessoriesCost || 0
      wsCost.getCell(`G${cRow}`).numFmt = "#,##0.00"

      wsCost.getCell(`H${cRow}`).value = { formula: `F${cRow}+G${cRow}`, result: (item.factoryCost || 0) + (item.accessoriesCost || 0) }
      wsCost.getCell(`H${cRow}`).numFmt = "#,##0.00"

      wsCost.getCell(`I${cRow}`).value = (item.marginPercentage || 0) / 100
      wsCost.getCell(`I${cRow}`).numFmt = "0.0%"

      wsCost.getCell(`J${cRow}`).value = item.unitSellingPrice || 0
      wsCost.getCell(`J${cRow}`).numFmt = "#,##0.00"

      wsCost.getCell(`K${cRow}`).value = { formula: `E${cRow}*J${cRow}`, result: item.totalSellingPrice }
      wsCost.getCell(`K${cRow}`).numFmt = "#,##0.00"

      cRow++
    }
  }

  return workbook
}

/**
 * Helper to apply thin borders across a range of columns in a given row
 */
function applyRowBorders(ws: ExcelJS.Worksheet, rowNumber: number, startCol: number, endCol: number) {
  for (let c = startCol; c <= endCol; c++) {
    const cell = ws.getRow(rowNumber).getCell(c)
    cell.border = {
      top: { style: "thin", color: { argb: "CBD5E1" } },
      left: { style: "thin", color: { argb: "CBD5E1" } },
      bottom: { style: "thin", color: { argb: "CBD5E1" } },
      right: { style: "thin", color: { argb: "CBD5E1" } }
    }
  }
}
