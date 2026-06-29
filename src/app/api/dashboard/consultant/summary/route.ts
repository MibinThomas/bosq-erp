import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getPermissionsProfile } from "@/lib/rbac"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id
    const user = await prisma.user.findUnique({ where: { id: userId } })
    const userRole = user?.role || "SALES_EXECUTIVE"

    const profile = await getPermissionsProfile(userId)
    if (!profile) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const dashboardAccess = profile.permissions.DASHBOARD?.ownership || "NONE"
    if (dashboardAccess === "NONE") {
      return NextResponse.json({ error: "No dashboard access" }, { status: 403 })
    }

    const qOwnershipRule = profile.permissions.QUOTATIONS?.ownership || "ASSIGNED"
    const cOwnershipRule = profile.permissions.CLIENTS?.ownership || "ASSIGNED"

    const url = new URL(request.url)
    const startDate = url.searchParams.get("startDate")
    const endDate = url.searchParams.get("endDate")
    const clientIdFilter = url.searchParams.get("clientId")
    const clientTypeFilter = url.searchParams.get("clientType")
    const statusFilter = url.searchParams.get("status")
    const projectNameFilter = url.searchParams.get("projectName")
    let qWhere: any = { deletedAt: null }
    let cWhere: any = { deletedAt: null }
    let boqWhere: any = { deletedAt: null }

    // Enforce strict personal performance boundaries for Design Consultants and Sales Executives
    cWhere.OR = [
      { salespersonId: userId },
      { assignments: { some: { userId } } },
      { accessRequests: { some: { userId, status: "Approved" } } }
    ]
    qWhere.OR = [
      { preparedById: userId },
      { salesAgentId: userId },
      { assignments: { some: { userId } } },
      { client: { salespersonId: userId } },
      { client: { assignments: { some: { userId } } } },
      { client: { accessRequests: { some: { userId, status: "Approved" } } } }
    ]
    boqWhere.OR = [
      { preparedById: userId },
      { estimatorId: userId },
      { client: {
          OR: [
            { salespersonId: userId },
            { assignments: { some: { userId } } }
          ]
        }
      }
    ]

    // Apply Filters
    if (startDate || endDate) {
      qWhere.createdAt = {}
      cWhere.createdAt = {}
      boqWhere.createdAt = {}
      if (startDate && startDate !== "null") {
        qWhere.createdAt.gte = new Date(startDate)
        cWhere.createdAt.gte = new Date(startDate)
        boqWhere.createdAt.gte = new Date(startDate)
      }
      if (endDate && endDate !== "null") {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        qWhere.createdAt.lte = end
        cWhere.createdAt.lte = end
        boqWhere.createdAt.lte = end
      }
    }

    if (clientIdFilter && clientIdFilter !== "all") {
      qWhere.clientId = clientIdFilter
    }

    if (statusFilter && statusFilter !== "all") {
      qWhere.status = statusFilter
    }

    if (clientTypeFilter && clientTypeFilter !== "all") {
      qWhere.client = { ...qWhere.client, clientType: clientTypeFilter }
      cWhere.clientType = clientTypeFilter
      boqWhere.client = { ...boqWhere.client, clientType: clientTypeFilter }
    }

    if (projectNameFilter) {
      qWhere.projectName = { contains: projectNameFilter, mode: "insensitive" }
    }



    // Optimized Aggregation Queries
    const [
      totalStats,
      approvedCount,
      pendingCount,
      rejectedStats,
      convertedCount,
      followUpsCount,
      activeClientsCount,
      pendingClientApprovalsCount,
      activeQuotesCount,
      draftQuotesCount,
      pendingBoqsCount,
      convertedStats,
      activeQuotesStats,
      underProductionStats
    ] = await Promise.all([
      prisma.quotation.aggregate({
        where: { ...qWhere, status: { not: "REVISED" } },
        _count: true,
        _sum: { grandTotal: true }
      }),
      prisma.quotation.count({
        where: { ...qWhere, status: { in: ["CLIENT_APPROVED", "CLIENT_CONFIRMED", "PO_RECEIVED", "UNDER_PRODUCTION", "READY_FOR_DELIVERY", "DELIVERED", "COMPLETED"] } }
      }),
      prisma.quotation.count({
        where: { ...qWhere, status: "SUBMITTED" }
      }),
      prisma.quotation.aggregate({
        where: { ...qWhere, status: { in: ["LOST", "CANCELLED"] } },
        _count: true,
        _sum: { grandTotal: true }
      }),
      prisma.quotation.count({
        where: { ...qWhere, status: { in: ["CLIENT_APPROVED", "CLIENT_CONFIRMED", "PO_RECEIVED", "UNDER_PRODUCTION", "READY_FOR_DELIVERY", "DELIVERED", "COMPLETED"] } }
      }),
      prisma.quotation.count({
        where: { ...qWhere, status: { in: ["DRAFT", "UNDER_REVIEW", "REVISED", "SENT_TO_CLIENT", "CLIENT_REVIEWING"] } }
      }),
      prisma.client.count({
        where: cWhere
      }),
      prisma.client.count({
        where: { ...cWhere, status: "Pending Approval" }
      }),
      prisma.quotation.count({
        where: { ...qWhere, status: { notIn: ["REVISED", "COMPLETED", "CANCELLED", "LOST"] } }
      }),
      prisma.quotation.count({
        where: { ...qWhere, status: "DRAFT" }
      }),
      prisma.boq.count({
        where: { ...boqWhere, status: { in: ["DRAFT", "SENT_TO_ESTIMATOR", "COSTING_COMPLETED"] } }
      }),
      prisma.quotation.aggregate({
        where: { ...qWhere, status: { in: ["CLIENT_APPROVED", "CLIENT_CONFIRMED", "PO_RECEIVED", "UNDER_PRODUCTION", "READY_FOR_DELIVERY", "DELIVERED", "COMPLETED"] } },
        _sum: { grandTotal: true }
      }),
      prisma.quotation.aggregate({
        where: { ...qWhere, status: { notIn: ["REVISED", "COMPLETED", "CANCELLED", "LOST"] } },
        _sum: { grandTotal: true }
      }),
      prisma.quotation.aggregate({
        where: {
          AND: [
            qWhere,
            { status: "UNDER_PRODUCTION" }
          ]
        },
        _count: true,
        _sum: { grandTotal: true }
      })
    ])

    const totalQuotes = totalStats._count || 0
    const totalValue = totalStats._sum.grandTotal || 0
    const convertedValue = convertedStats._sum.grandTotal || 0
    const totalRevenuePipeline = activeQuotesStats._sum.grandTotal || 0
    
    const rejectedCount = rejectedStats._count || 0
    const rejectedValue = rejectedStats._sum.grandTotal || 0

    const underProductionCount = underProductionStats._count || 0
    const underProductionValue = underProductionStats._sum.grandTotal || 0

    return NextResponse.json({
      totalQuotes,
      totalValue,
      approvedCount,
      pendingCount,
      rejectedCount,
      rejectedValue,
      convertedCount,
      pendingClientApprovalsCount,
      followUpsCount,
      activeClientsCount,
      activeQuotesCount,
      draftQuotesCount,
      pendingBoqsCount,
      convertedValue,
      totalRevenuePipeline,
      underProductionCount,
      underProductionValue
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
      }
    })
  } catch (error) {
    console.error("Consultant Summary API Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
