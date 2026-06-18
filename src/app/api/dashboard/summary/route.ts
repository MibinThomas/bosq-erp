import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const startDate = url.searchParams.get("startDate")
    const endDate = url.searchParams.get("endDate")
    const userIdFilter = url.searchParams.get("userId")
    const clientIdFilter = url.searchParams.get("clientId")
    const clientTypeFilter = url.searchParams.get("clientType")
    const statusFilter = url.searchParams.get("status")
    const minVal = url.searchParams.get("minVal")
    const maxVal = url.searchParams.get("maxVal")

    const projectNameFilter = url.searchParams.get("projectName")

    const userRole = (session.user as any).role || "SALES_EXECUTIVE"
    const currentUserId = (session.user as any).id

    let whereClause: any = {}

    // Role-based filtering
    const isExcludedFromOwnershipLimit = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(userRole)
    
    if (!isExcludedFromOwnershipLimit) {
      whereClause.OR = [
        { preparedById: currentUserId },
        { salesAgentId: currentUserId },
        { client: { assignments: { some: { userId: currentUserId, allowAllQuotations: true } } } },
        { assignments: { some: { userId: currentUserId } } }
      ]
    } else if (userIdFilter && userIdFilter !== "all") {
      whereClause.preparedById = userIdFilter
    }

    // Date filtering
    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate && startDate !== "null") whereClause.createdAt.gte = new Date(startDate)
      if (endDate && endDate !== "null") {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        whereClause.createdAt.lte = end
      }
    }

    if (clientIdFilter && clientIdFilter !== "all") whereClause.clientId = clientIdFilter
    if (statusFilter && statusFilter !== "all") whereClause.status = statusFilter
    
    if (clientTypeFilter && clientTypeFilter !== "all") {
      whereClause.client = { clientType: clientTypeFilter }
    }

    if (projectNameFilter) {
      whereClause.projectName = { contains: projectNameFilter, mode: "insensitive" }
    }

    if (minVal || maxVal) {
      whereClause.subtotal = {}
      if (minVal) whereClause.subtotal.gte = parseFloat(minVal)
      if (maxVal) whereClause.subtotal.lte = parseFloat(maxVal)
    }

    // Optimized Aggregation Queries
    const [
      totalStats,
      convertedStats,
      pendingApprovalsCount,
      pendingFollowUpsCount,
      consultantStats,
      clientStats
    ] = await Promise.all([
      prisma.quotation.aggregate({
        where: whereClause,
        _count: true,
        _sum: { subtotal: true }
      }),
      prisma.quotation.aggregate({
        where: {
          ...whereClause,
          OR: [
            { poStatus: "RECEIVED" },
            { status: "PO_RECEIVED" },
            { status: "CLIENT_CONFIRMED" },
            { status: "CLIENT_APPROVED" },
            { status: "APPROVED" },
            { status: "PO_CONVERTED" },
            { status: "UNDER_PRODUCTION" }
          ]
        },
        _count: true,
        _sum: { subtotal: true }
      }),
      prisma.quotation.count({
        where: { ...whereClause, status: "QUOTE_CREATED" }
      }),
      prisma.quotation.count({
        where: { ...whereClause, status: { in: ["DRAFT", "REVISED"] } }
      }),
      prisma.quotation.groupBy({
        by: ["preparedById"],
        where: whereClause,
        _count: {
          id: true
        },
        _sum: {
          subtotal: true
        },
        orderBy: {
          _sum: {
            subtotal: "desc"
          }
        },
        take: 5
      }),
      prisma.quotation.groupBy({
        by: ["clientId"],
        where: whereClause,
        _count: {
          id: true
        },
        _sum: {
          subtotal: true
        },
        orderBy: {
          _sum: {
            subtotal: "desc"
          }
        },
        take: 5
      })
    ])

    const totalQuotes = totalStats._count || 0
    const totalValue = totalStats._sum.subtotal || 0
    
    const convertedCount = convertedStats._count || 0
    const convertedValue = convertedStats._sum.subtotal || 0

    // Fetch user and client details in parallel
    const consultantIds = consultantStats.map(stat => stat.preparedById)
    const clientIds = clientStats.map(stat => stat.clientId)

    const [consultants, clients] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: consultantIds } },
        select: { id: true, name: true, image: true, role: true }
      }),
      prisma.client.findMany({
        where: { id: { in: clientIds } },
        select: { id: true, companyName: true, clientType: true }
      })
    ])

    const topConsultants = consultantStats.map(stat => {
      const user = consultants.find(u => u.id === stat.preparedById)
      return {
        id: stat.preparedById,
        name: user?.name || "Unknown",
        image: user?.image || null,
        role: user?.role || "SALES_EXECUTIVE",
        count: stat._count.id,
        value: stat._sum.subtotal || 0
      }
    })

    const topClients = clientStats.map(stat => {
      const client = clients.find(c => c.id === stat.clientId)
      return {
        id: stat.clientId,
        companyName: client?.companyName || "Unknown Client",
        clientType: client?.clientType || "Direct",
        count: stat._count.id,
        value: stat._sum.subtotal || 0
      }
    })

    return NextResponse.json({
      totalQuotes,
      totalValue,
      convertedCount,
      convertedValue,
      winRate: totalQuotes > 0 ? (convertedCount / totalQuotes) * 100 : 0,
      pendingApprovalsCount,
      pendingFollowUpsCount,
      topConsultants,
      topClients
    })
  } catch (error) {
    console.error("Dashboard summary error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
