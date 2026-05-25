import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { uploadBoqExcel } from "@/lib/sharepoint"
import * as XLSX from "xlsx"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { quotationNumber, quotationGroupFolder } = body

    const boq = await prisma.boq.findUnique({
      where: { id },
      include: {
        items: true,
        client: true,
        preparedBy: true
      }
    })

    if (!boq) {
      return NextResponse.json({ error: "BOQ not found" }, { status: 404 })
    }

    // Prepare data for Excel
    const rows = boq.items.map(item => ({
      "Item No": item.itemNo,
      "Description": item.description,
      "Specifications": item.specifications || "",
      "Qty": item.quantity,
      "Unit": item.unit,
      "Material Cost": item.materialCost,
      "Labor Cost": item.laborCost,
      "Install Cost": item.installationCost,
      "Transport Cost": item.transportCost,
      "Overhead Cost": item.overheadCost,
      "Unit Cost": item.unitCost,
      "Total Cost": item.totalCost,
      "Margin %": item.marginPercentage,
      "Unit Selling Price": item.unitSellingPrice,
      "Total Selling Price": item.totalSellingPrice
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)

    // Add summary rows at the bottom
    const summaryStartRow = rows.length + 3
    XLSX.utils.sheet_add_aoa(ws, [
      ["BOQ Summary"],
      ["Total Material Cost", boq.totalMaterialCost],
      ["Total Labor Cost", boq.totalLaborCost],
      ["Total Install Cost", boq.totalInstallation],
      ["Total Transport Cost", boq.totalTransport],
      ["Total Overhead Cost", boq.totalOverhead],
      ["Total Gross Cost", boq.totalCost],
      ["Total Margin", boq.marginAmount],
      ["Final Selling Price", boq.totalSellingPrice]
    ], { origin: `A${summaryStartRow}` })

    XLSX.utils.book_append_sheet(wb, ws, "BOQ Costing")

    // Generate buffer
    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

    // Generate filename
    let filenameBase = boq.boqNumber
    if (quotationNumber) {
      filenameBase = `BOQ_${quotationNumber}`
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
