import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"

import { isManagerOrAdminRole } from "@/lib/utils"

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
    const canViewActivityLogs = isManagerOrAdminRole(logUserRole)

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
    if (["SALES_EXECUTIVE", "INTERIOR_DESIGN_CONSULTANT"].includes(logUserRole)) {
      const rootId = quotation.parentId || quotation.id
      const rootQuotation = quotation.parentId
        ? await prisma.quotation.findUnique({ where: { id: rootId } })
        : quotation

      const isOwnerOrCreator = 
        quotation.preparedById === logUserId ||
        quotation.salesAgentId === logUserId ||
        rootQuotation?.preparedById === logUserId ||
        rootQuotation?.salesAgentId === logUserId

      const assignmentCount = await prisma.clientAssignment.count({
        where: { clientId: quotation.clientId, userId: logUserId }
      })
      const hasApprovedRequest = await prisma.clientAccessRequest.findFirst({
        where: { clientId: quotation.clientId, userId: logUserId, status: "Approved" }
      })

      const hasAccess = isOwnerOrCreator || assignmentCount > 0 || !!hasApprovedRequest
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
        ],
        deletedAt: null
      },
      select: { id: true, quotationNumber: true }
    })

    const quotationIds = allRelatedQuotations.map(q => q.id)
    const boqId = quotation.boqId

    // 3. Fetch Activity Logs (only for Super Admin, Admin, and Managerial roles)
    let logs: any[] = []
    if (canViewActivityLogs) {
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

      logs = await prisma.activityLog.findMany({
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
    }

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
        ],
        deletedAt: null
      },
      orderBy: [
        { revisionNumber: "asc" },
        { createdAt: "asc" }
      ],
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
