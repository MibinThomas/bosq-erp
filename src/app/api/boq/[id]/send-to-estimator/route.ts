import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { uploadBoqExcel } from "@/lib/sharepoint"
import ExcelJS from "exceljs"
import fs from "fs"
import path from "path"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { estimatorId, instructions } = body

    const boq = await prisma.boq.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        client: true,
        preparedBy: true
      }
    })

    if (!boq) {
      return NextResponse.json({ error: "BOQ not found" }, { status: 404 })
    }

    // 1. Generate Excel with ExcelJS
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet("BOQ", {
      pageSetup: { paperSize: 9, orientation: 'portrait' }
    })

    // Setup columns (matching the requested layout roughly)
    worksheet.columns = [
      { header: 'Item No.', key: 'itemNo', width: 8 },
      { header: 'Description', key: 'desc', width: 40 },
      { header: 'Picture', key: 'pic', width: 15 },
      { header: 'Unit Cost', key: 'unitCost', width: 15 },
      { header: 'Margin %', key: 'margin', width: 12 },
      { header: 'Unit Price', key: 'unitPrice', width: 15 },
      { header: 'Qty', key: 'qty', width: 8 },
      { header: 'Amount', key: 'amount', width: 15 },
    ]

    // Add company header
    worksheet.insertRow(1, ["BOSQ Ergonomic Living"])
    worksheet.getCell('A1').font = { size: 16, bold: true }
    worksheet.mergeCells('A1:H1')
    
    worksheet.insertRow(2, ["Quotation Title", boq.projectName || "Standard BOQ"])
    worksheet.insertRow(3, ["Date", new Date(boq.createdAt).toLocaleDateString()])
    worksheet.insertRow(4, ["BOQ ID", boq.boqNumber])
    worksheet.insertRow(5, ["Customer ID", boq.client.clientId])
    worksheet.insertRow(6, ["Prepared by", boq.preparedBy.name || ""])
    worksheet.insertRow(7, ["Client Details", boq.client.companyName])
    worksheet.insertRow(8, ["Sales Person", boq.preparedBy.name || ""])
    worksheet.insertRow(9, ["Comments", boq.notes || ""])
    worksheet.insertRow(10, []) // Spacer
    
    // Header Row is now at row 11 due to insertions, let's style it
    const headerRow = worksheet.getRow(11)
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    let currentRow = 12

    for (const item of boq.items) {
      const row = worksheet.getRow(currentRow)
      
      let fullDesc = item.description
      if (item.specifications) fullDesc += `\n${item.specifications}`
      
      row.values = {
        itemNo: item.itemNo,
        desc: fullDesc,
        pic: "", // Will embed image
        unitCost: item.unitCost,
        margin: item.marginPercentage,
        unitPrice: item.unitSellingPrice,
        qty: item.quantity,
        amount: item.totalSellingPrice
      }

      row.height = 60 // Make room for image
      row.getCell('desc').alignment = { wrapText: true, vertical: 'top' }

      // Try to embed image
      const imgPath = item.customImageUrl || item.product?.imageUrl
      if (imgPath) {
        try {
          let extension = "jpeg"
          if (imgPath.includes("png")) extension = "png"
          
          let imageId
          
          if (imgPath.startsWith("data:image")) {
            const base64Data = imgPath.split(',')[1]
            imageId = workbook.addImage({
              base64: base64Data,
              extension: extension as any,
            })
          } else {
            // Assume it's a relative path in public folder e.g. /uploads/xxx.jpg
            const localPath = path.join(process.cwd(), "public", imgPath)
            if (fs.existsSync(localPath)) {
              imageId = workbook.addImage({
                filename: localPath,
                extension: extension as any,
              })
            }
          }

          if (imageId) {
            worksheet.addImage(imageId, {
              tl: { col: 2, row: currentRow - 1 }, // col 2 is "Picture" (0-indexed)
              ext: { width: 80, height: 70 },
              editAs: 'oneCell'
            })
          }
        } catch (err) {
          console.error("Failed to embed image in Excel for item", item.id, err)
        }
      }

      currentRow++
    }

    // Totals
    currentRow++
    worksheet.getCell(`G${currentRow}`).value = "Subtotal"
    worksheet.getCell(`H${currentRow}`).value = boq.totalSellingPrice
    worksheet.getCell(`G${currentRow}`).font = { bold: true }

    currentRow++
    const vat = boq.totalSellingPrice * 0.05
    worksheet.getCell(`G${currentRow}`).value = "VAT (5%)"
    worksheet.getCell(`H${currentRow}`).value = vat
    worksheet.getCell(`G${currentRow}`).font = { bold: true }

    currentRow++
    worksheet.getCell(`G${currentRow}`).value = "Final Total"
    worksheet.getCell(`H${currentRow}`).value = boq.totalSellingPrice + vat
    worksheet.getCell(`G${currentRow}`).font = { bold: true }

    // T&C
    currentRow += 2
    worksheet.getCell(`A${currentRow}`).value = "Terms & Conditions"
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 }
    currentRow++
    worksheet.getCell(`A${currentRow}`).value = boq.termsConditions || "Standard Terms Apply"
    worksheet.mergeCells(`A${currentRow}:H${currentRow + 3}`)
    worksheet.getCell(`A${currentRow}`).alignment = { wrapText: true, vertical: 'top' }

    // Generate Buffer
    const buffer = await workbook.xlsx.writeBuffer()
    const excelBuffer = Buffer.from(buffer)

    // 2. Upload to SharePoint
    // We use boqNumber as the quotationGroupFolder to achieve: Clients/ClientName/Quotations/BOQ-1002/BOQ-1002_ClientName.xlsx
    const filenameBase = `${boq.boqNumber}_${boq.client.companyName}`
    
    let sharepointUrl = ""
    try {
      sharepointUrl = await uploadBoqExcel(
        boq.client.companyName,
        filenameBase,
        excelBuffer,
        boq.boqNumber
      )
    } catch (err) {
      console.error("SharePoint upload failed:", err)
      // Allow proceeding even if SP fails in dev, but in production we might want to throw
    }

    // 3. Update BOQ Status
    const updatedBoq = await prisma.boq.update({
      where: { id },
      data: {
        status: "SENT_TO_ESTIMATOR",
        estimatorId: estimatorId || null,
        sharepointUrl: sharepointUrl || null,
        notes: instructions ? `[Estimator Instructions]: ${instructions}\n\n${boq.notes || ""}` : boq.notes
      }
    })

    // 4. Activity Log
    await prisma.activityLog.create({
      data: {
        userId,
        action: "SENT_TO_ESTIMATOR",
        entityType: "BOQ",
        entityId: id,
        details: `BOQ ${boq.boqNumber} sent to estimator. ${sharepointUrl ? 'Excel generated and uploaded.' : ''}`
      }
    })

    return NextResponse.json({ success: true, boq: updatedBoq })
  } catch (error) {
    console.error("Failed to send BOQ to estimator:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
