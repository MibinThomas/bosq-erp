import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { uploadBoqExcel } from "@/lib/sharepoint"
import { buildBoqExcelWorkbook } from "@/lib/boq-excel-builder"

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
    const userId = (session.user as any).id

    const body = await request.json().catch(() => ({}))
    const { estimatorId, instructions } = body

    const boq = await prisma.boq.findUnique({
      where: { id },
      include: {
        client: true,
        preparedBy: true,
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

    // 1. Generate Excel with buildBoqExcelWorkbook matching template design
    const workbook = await buildBoqExcelWorkbook(boq as any, true)
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
