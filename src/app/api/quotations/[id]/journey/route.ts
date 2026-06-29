import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const logUserRole = (session.user as any)?.role || "SALES_EXECUTIVE"
    const logUserId = (session.user as any)?.id
 
    // 1. Fetch the Quotation to resolve its root ID and BOQ ID
    const quotation = await prisma.quotation.findFirst({
      where: {
        OR: [
          { id: id },
          { quotationNumber: id }
        ]
      }
    })
 
    if (!quotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      )
    }

    // Authorization checks
    if (logUserRole === "SALES_EXECUTIVE") {
      const hasAccess = quotation.preparedById === logUserId || quotation.salesAgentId === logUserId
      if (!hasAccess) {
        return NextResponse.json(
          { error: "Forbidden: You do not have access to view this quotation" },
          { status: 403 }
        )
      }
    }
 
    const rootId = quotation.parentId || quotation.id

    // 2. Find all related quotation copies (root + all revisions)
    const allRelatedQuotations = await prisma.quotation.findMany({
      where: {
        OR: [
          { id: rootId },
          { parentId: rootId }
        ]
      },
      select: { id: true, quotationNumber: true }
    })

    const quotationIds = allRelatedQuotations.map(q => q.id)
    const boqId = quotation.boqId

    // 3. Fetch Activity Logs
    const whereConditions: any[] = [
      {
        entityType: "QUOTATION",
        entityId: { in: quotationIds }
      }
    ]

    if (boqId) {
      whereConditions.push({
        entityType: "BOQ",
        entityId: boqId
      })
    }

    const logs = await prisma.activityLog.findMany({
      where: {
        OR: whereConditions
      },
      include: {
        user: {
          select: { name: true, role: true, email: true, image: true }
        }
      },
      orderBy: { createdAt: "asc" }
    })

    // 4. Fetch the BOQ for basic info if exists
    let boqData = null
    if (boqId) {
      boqData = await prisma.boq.findUnique({
        where: { id: boqId },
        select: { boqNumber: true, sharepointUrl: true }
      })
    }

    // 5. Fetch Revisions and Series Quotations list
    const revisions = await prisma.quotationRevision.findMany({
      where: { quotationId: rootId },
      orderBy: { revisionNumber: "desc" }
    })

    const seriesQuotations = await prisma.quotation.findMany({
      where: {
        OR: [
          { id: rootId },
          { parentId: rootId }
        ]
      },
      orderBy: { revisionNumber: "asc" },
      include: {
        preparedBy: {
          select: { name: true }
        }
      }
    })

    // Return the compiled journey data
    return NextResponse.json({
      quotation: {
        id: quotation.id,
        quotationNumber: quotation.quotationNumber,
        status: quotation.status,
        sharepointUrl: quotation.sharepointUrl,
      },
      boq: boqData,
      logs,
      revisions,
      seriesQuotations
    })

  } catch (error) {
    console.error("Failed to fetch Quotation Journey:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
