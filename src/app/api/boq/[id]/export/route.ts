import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { uploadBoqExcel } from "@/lib/sharepoint"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { hasPermission } from "@/lib/rbac"
import ExcelJS from "exceljs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { permissionOverrides: { where: { module: "BOQS" } } }
    })

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Role-based access control for Admin/Manager BOQ Export
    const userRole = (dbUser.role || "").toUpperCase()
    const isAuthorizedRole = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_MANAGER", "ESTIMATOR", "COST_ESTIMATOR"].includes(userRole)
    const canExportPermission = await hasPermission(dbUser.id, "BOQS", "export")

    if (!isAuthorizedRole && !canExportPermission) {
      return NextResponse.json(
        { error: "Forbidden: You do not have management-level permission to export detailed BOQ costing breakdowns." },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { quotationNumber, quotationGroupFolder, isDownloadFormat } = body

    const boq = await prisma.boq.findUnique({
      where: { id },
      include: {
        client: true,
        preparedBy: true,
        estimator: true,
        items: {
          include: {
            product: true
          },
          orderBy: { itemNo: "asc" }
        }
      }
    })

    if (!boq) {
      return NextResponse.json({ error: "BOQ not found" }, { status: 404 })
    }

    // Build rich Excel workbook using ExcelJS
    const workbook = new ExcelJS.Workbook()
    workbook.creator = "BOSQ ERP System"
    workbook.lastModifiedBy = dbUser.name || "BOSQ ERP"
    workbook.created = new Date()

    const worksheet = workbook.addWorksheet("BOQ Complete Costing Breakdown")

    // Title & Header Info
    worksheet.mergeCells("A1:N1")
    const titleCell = worksheet.getCell("A1")
    titleCell.value = `BOQ COST ESTIMATION & NEGOTIATION BREAKDOWN - ${boq.boqNumber}`
    titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFFFF" } }
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEA580C" } }
    titleCell.alignment = { horizontal: "center", vertical: "middle" }
    worksheet.getRow(1).height = 35

    worksheet.getCell("A3").value = "Client Name:"
    worksheet.getCell("B3").value = boq.client.companyName
    worksheet.getCell("A3").font = { bold: true }

    worksheet.getCell("A4").value = "Project Name:"
    worksheet.getCell("B4").value = boq.projectName || "N/A"
    worksheet.getCell("A4").font = { bold: true }

    worksheet.getCell("A5").value = "Segment:"
    worksheet.getCell("B5").value = boq.customerSegment || "Project"
    worksheet.getCell("A5").font = { bold: true }

    worksheet.getCell("E3").value = "Prepared By:"
    worksheet.getCell("F3").value = boq.preparedBy.name
    worksheet.getCell("E3").font = { bold: true }

    worksheet.getCell("E4").value = "Estimator:"
    worksheet.getCell("F4").value = boq.estimator?.name || "N/A"
    worksheet.getCell("E4").font = { bold: true }

    worksheet.getCell("E5").value = "Date:"
    worksheet.getCell("F5").value = new Date(boq.createdAt).toLocaleDateString()
    worksheet.getCell("E5").font = { bold: true }

    // Table Header Row
    const headerRowIndex = 7
    const headers = [
      "Item No",
      "Image",
      "Description",
      "Specifications",
      "Qty",
      "Unit",
      "Factory Cost (AED)",
      "Accessories Cost (AED)",
      "Base Price (AED)",
      "Margin %",
      "Pre-Neg Price (AED)",
      "Negotiation Adj (%)",
      "Negotiation Adj (AED)",
      "Final Unit Price (AED)",
      "Line Total (AED)"
    ]

    const headerRow = worksheet.getRow(headerRowIndex)
    headerRow.values = headers
    headerRow.height = 25
    headerRow.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } }
    
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "medium" },
        right: { style: "thin" }
      }
    })

    let currentRow = headerRowIndex + 1

    for (let i = 0; i < boq.items.map(item => item).length; i++) {
      const item = boq.items[i]
      const qty = item.quantity || 1
      const factory = item.factoryCost || 0
      const accessories = item.accessoriesCost || 0
      const basePrice = item.unitCost > 0 ? item.unitCost : (factory + accessories)
      const marginPct = item.marginPercentage || 0
      const preNegPrice = basePrice > 0 ? Number((baseCost(basePrice, marginPct)).toFixed(2)) : 0
      const negPct = item.negotiationPercentage || 0
      const negAmt = item.negotiationAmount || (preNegPrice > 0 && negPct > 0 ? Number((preNegPrice * (negPct / 100)).toFixed(2)) : 0)
      const unitSell = item.unitSellingPrice || Math.max(0, preNegPrice - negAmt)
      const lineTotal = item.totalSellingPrice || (unitSell * qty)

      const row = worksheet.getRow(currentRow)
      row.values = [
        item.itemNo,
        "", // Image cell
        item.description,
        item.specifications || "",
        qty,
        item.unit || "Nos",
        factory,
        accessories,
        basePrice,
        marginPct,
        preNegPrice,
        negPct,
        negAmt,
        unitSell,
        lineTotal
      ]
      row.height = 55

      // Alignments & Number formatting
      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" }
      row.getCell(3).alignment = { vertical: "middle", wrapText: true }
      row.getCell(4).alignment = { vertical: "middle", wrapText: true }
      row.getCell(5).alignment = { horizontal: "center", vertical: "middle" }
      row.getCell(6).alignment = { horizontal: "center", vertical: "middle" }

      for (let c = 7; c <= 15; c++) {
        const cell = row.getCell(c)
        cell.alignment = { horizontal: "right", vertical: "middle" }
        if (c === 10 || c === 12) {
          cell.numFmt = "0.00'%'"
        } else {
          cell.numFmt = "#,##0.00"
        }
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } }
        }
      })

      // Embed product image if present
      const imgUrl = item.customImageUrl || item.product?.imageUrl
      if (imgUrl) {
        try {
          const imgRes = await fetch(imgUrl)
          if (imgRes.ok) {
            const arrayBuffer = await imgRes.arrayBuffer()
            const imageId = workbook.addImage({
              buffer: Buffer.from(arrayBuffer) as any,
              extension: imgUrl.toLowerCase().endsWith(".png") ? "png" : "jpeg"
            })
            worksheet.addImage(imageId, {
              tl: { col: 1, row: currentRow - 1 },
              ext: { width: 50, height: 50 }
            })
          }
        } catch (err) {
          console.error("Failed to embed image for item", item.id, err)
        }
      }

      currentRow++
    }

    // Grand Summary Section
    currentRow += 2
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`)
    const summaryHeader = worksheet.getCell(`A${currentRow}`)
    summaryHeader.value = "MANAGEMENT COST & MARGIN SUMMARY BREAKDOWN"
    summaryHeader.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } }
    summaryHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } }
    summaryHeader.alignment = { horizontal: "left", vertical: "middle" }

    const summaryItems = [
      ["Total Factory Cost", boq.totalFactoryCost],
      ["Total Accessories Cost", boq.totalAccessoriesCost],
      ["Total Gross Base Cost", boq.totalCost],
      ["Total Margin Amount", boq.marginAmount],
      ["Total Negotiation Adjustments", boq.totalNegotiationAmount],
      ["Grand Total Selling Price", boq.totalSellingPrice]
    ]

    summaryItems.forEach(([label, val]) => {
      currentRow++
      worksheet.getCell(`A${currentRow}`).value = label
      worksheet.getCell(`A${currentRow}`).font = { bold: true }
      worksheet.getCell(`D${currentRow}`).value = val
      worksheet.getCell(`D${currentRow}`).font = { bold: true }
      worksheet.getCell(`D${currentRow}`).numFmt = "AED #,##0.00"
      worksheet.getCell(`D${currentRow}`).alignment = { horizontal: "right" }
    })

    // Column widths
    worksheet.getColumn(1).width = 10
    worksheet.getColumn(2).width = 12
    worksheet.getColumn(3).width = 28
    worksheet.getColumn(4).width = 32
    worksheet.getColumn(5).width = 8
    worksheet.getColumn(6).width = 8
    worksheet.getColumn(7).width = 16
    worksheet.getColumn(8).width = 16
    worksheet.getColumn(9).width = 16
    worksheet.getColumn(10).width = 12
    worksheet.getColumn(11).width = 18
    worksheet.getColumn(12).width = 16
    worksheet.getColumn(13).width = 18
    worksheet.getColumn(14).width = 18
    worksheet.getColumn(15).width = 20

    // Write workbook buffer
    const buffer = await workbook.xlsx.writeBuffer()
    const excelBuffer = Buffer.from(buffer as any)

    let filenameBase = boq.boqNumber
    if (quotationNumber) {
      filenameBase = `BOQ_${quotationNumber}`
    }

    if (isDownloadFormat) {
      return new Response(excelBuffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filenameBase}_Costing_Breakdown.xlsx"`
        }
      })
    }

    // Upload to SharePoint
    const sharepointUrl = await uploadBoqExcel(
      boq.client.companyName, 
      filenameBase, 
      excelBuffer, 
      quotationGroupFolder
    )

    return NextResponse.json({ success: true, sharepointUrl })
  } catch (error) {
    console.error("Failed to export BOQ to Excel:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

function baseCost(base: number, marginPct: number): number {
  if (marginPct >= 100) return base * 2
  return base / (1 - marginPct / 100)
}

