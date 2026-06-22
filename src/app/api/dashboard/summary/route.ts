import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"
import { hasPermission } from "@/lib/rbac"

export const dynamic = "force-dynamic"

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

    const currentUserId = (session.user as any).id

    const canView = await hasPermission(currentUserId, "DASHBOARD", "view")
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view dashboard" }, { status: 403 })
    }

    // Fetch user details to determine role and department
    const dbSessionUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      include: { permissionOverrides: { where: { module: "DASHBOARD" } } }
    })

    if (!dbSessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userRole = dbSessionUser.role

    // Resolve ownership rule
    let ownershipRule = "ALL"
    if (userRole !== "SUPER_ADMIN") {
      const override = dbSessionUser.permissionOverrides.find(o => o.action === "ownership")
      if (override?.ownership) {
        ownershipRule = override.ownership
      } else {
        const roleObj = await prisma.role.findFirst({
          where: { name: userRole },
          include: { permissions: { where: { module: "DASHBOARD" } } }
        })
        const rolePerm = roleObj?.permissions[0]
        if (rolePerm?.ownership) {
          ownershipRule = rolePerm.ownership
        }
      }
    }

    // Locate department users if rule is DEPARTMENT
    let departmentUserIds: string[] = []
    if (ownershipRule === "DEPARTMENT") {
      const deptUsers = await prisma.user.findMany({
        where: { department: dbSessionUser.department || "N/A", deletedAt: null },
        select: { id: true }
      })
      departmentUserIds = deptUsers.map(u => u.id)
    }

    let whereClause: any = {
      deletedAt: null
    }

    // Apply role-based dashboard filters
    if (ownershipRule === "OWN" || ownershipRule === "ASSIGNED") {
      whereClause.OR = [
        { preparedById: currentUserId },
        { salesAgentId: currentUserId },
        { client: { assignments: { some: { userId: currentUserId, allowAllQuotations: true } } } },
        { assignments: { some: { userId: currentUserId } } }
      ]
    } else if (ownershipRule === "DEPARTMENT") {
      whereClause.OR = [
        { preparedById: { in: departmentUserIds } },
        { salesAgentId: { in: departmentUserIds } },
        { client: { assignments: { some: { userId: { in: departmentUserIds }, allowAllQuotations: true } } } },
        { assignments: { some: { userId: { in: departmentUserIds } } } }
      ]
    } else if (ownershipRule === "NONE") {
      whereClause.id = "none"
    }

    // Role-based filtering overrides
    const isExcludedFromOwnershipLimit = ownershipRule === "ALL"
    if (isExcludedFromOwnershipLimit && userIdFilter && userIdFilter !== "all") {
      whereClause.preparedById = userIdFilter
      delete whereClause.OR
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
      whereClause.client = { ...whereClause.client, clientType: clientTypeFilter }
    }

    if (projectNameFilter) {
      whereClause.projectName = { contains: projectNameFilter, mode: "insensitive" }
    }

    if (minVal || maxVal) {
      whereClause.subtotal = {}
      if (minVal) whereClause.subtotal.gte = parseFloat(minVal)
      if (maxVal) whereClause.subtotal.lte = parseFloat(maxVal)
    }

    // Construct BOQ ownership whereClause
    let boqWhereClause: any = {
      deletedAt: null
    }

    if (ownershipRule === "OWN" || ownershipRule === "ASSIGNED") {
      boqWhereClause.OR = [
        { preparedById: currentUserId },
        { estimatorId: currentUserId },
        { client: { assignments: { some: { userId: currentUserId } } } }
      ]
    } else if (ownershipRule === "DEPARTMENT") {
      boqWhereClause.OR = [
        { preparedById: { in: departmentUserIds } },
        { estimatorId: { in: departmentUserIds } },
        { client: { assignments: { some: { userId: { in: departmentUserIds } } } } }
      ]
    } else if (ownershipRule === "NONE") {
      boqWhereClause.id = "none"
    }

    if (isExcludedFromOwnershipLimit && userIdFilter && userIdFilter !== "all") {
      boqWhereClause.preparedById = userIdFilter
      delete boqWhereClause.OR
    }

    if (clientIdFilter && clientIdFilter !== "all") boqWhereClause.clientId = clientIdFilter
    if (startDate || endDate) {
      boqWhereClause.createdAt = {}
      if (startDate && startDate !== "null") boqWhereClause.createdAt.gte = new Date(startDate)
      if (endDate && endDate !== "null") {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        boqWhereClause.createdAt.lte = end
      }
    }

    // Optimized Aggregation Queries
    const [
      totalStats,
      convertedStats,
      pendingApprovalsCount,
      pendingFollowUpsCount,
      consultantStats,
      clientStats,
      statusStats
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
      }),
      prisma.quotation.groupBy({
        by: ["status"],
        where: whereClause,
        _count: {
          id: true
        },
        _sum: {
          subtotal: true
        }
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
        where: { id: { in: consultantIds }, deletedAt: null },
        select: { id: true, name: true, image: true, role: true }
      }),
      prisma.client.findMany({
        where: { id: { in: clientIds }, deletedAt: null },
        select: { id: true, companyName: true, clientType: true }
      })
    ])

    // Calculate the 10 required Team Overview KPIs
    // 1. totalDesignConsultants
    const activeConsultantsWhere: any = {
      role: { in: ["DESIGN_CONSULTANT", "SALES_EXECUTIVE"] },
      isActive: true,
      deletedAt: null
    }
    if (ownershipRule === "DEPARTMENT") {
      activeConsultantsWhere.department = dbSessionUser.department || "N/A"
    } else if (ownershipRule === "OWN" || ownershipRule === "ASSIGNED") {
      activeConsultantsWhere.id = currentUserId
    }
    const totalDesignConsultants = await prisma.user.count({ where: activeConsultantsWhere })

    // 2. totalAssignedClients
    const clientWhere: any = { deletedAt: null }
    if (ownershipRule === "DEPARTMENT") {
      clientWhere.OR = [
        { salespersonId: { in: departmentUserIds } },
        { assignments: { some: { userId: { in: departmentUserIds } } } }
      ]
    } else if (ownershipRule === "OWN" || ownershipRule === "ASSIGNED") {
      clientWhere.OR = [
        { salespersonId: currentUserId },
        { assignments: { some: { userId: currentUserId } } }
      ]
    }
    const totalAssignedClients = await prisma.client.count({ where: clientWhere })

    // 3. totalQuotes = totalQuotes
    // 4. totalActiveQuotations (in-progress)
    const activeQuotesStats = await prisma.quotation.aggregate({
      where: {
        ...whereClause,
        status: {
          notIn: ["REJECTED", "CANCELLED", "PO_RECEIVED", "CLIENT_CONFIRMED", "CLIENT_APPROVED", "APPROVED", "PO_CONVERTED", "UNDER_PRODUCTION"]
        },
        OR: [
          { poStatus: { not: "RECEIVED" } },
          { poStatus: null }
        ]
      },
      _count: true,
      _sum: { subtotal: true }
    })
    const totalActiveQuotations = activeQuotesStats._count || 0

    // 5. totalDraftQuotations
    const totalDraftQuotations = await prisma.quotation.count({
      where: { ...whereClause, status: "DRAFT" }
    })

    // 6. totalRevisedQuotations
    const totalRevisedQuotations = await prisma.quotation.count({
      where: { ...whereClause, status: "REVISED" }
    })

    // 7. totalClientConfirmedQuotations (won)
    const totalClientConfirmedQuotations = convertedCount

    // 8. totalBOQs
    const totalBOQs = await prisma.boq.count({
      where: boqWhereClause
    })

    // 9. totalPendingBOQs
    const totalPendingBOQs = await prisma.boq.count({
      where: {
        ...boqWhereClause,
        status: { in: ["DRAFT", "SENT_TO_ESTIMATOR", "COSTING_COMPLETED"] }
      }
    })

    // 10. totalRevenuePipeline (sum of subtotal for active quotations)
    const totalRevenuePipeline = activeQuotesStats._sum.subtotal || 0

    // Enrich topConsultants leaderboard
    const consultantIdsForClients = consultants.map(c => c.id)
    const [clientAssignedCounts, conversionRates] = await Promise.all([
      Promise.all(
        consultantIdsForClients.map(async (cid) => {
          const count = await prisma.client.count({
            where: {
              deletedAt: null,
              OR: [
                { salespersonId: cid },
                { assignments: { some: { userId: cid } } }
              ]
            }
          })
          return { userId: cid, count }
        })
      ),
      Promise.all(
        consultantIdsForClients.map(async (cid) => {
          const [total, won] = await Promise.all([
            prisma.quotation.count({
              where: { preparedById: cid, deletedAt: null }
            }),
            prisma.quotation.count({
              where: {
                preparedById: cid,
                deletedAt: null,
                OR: [
                  { poStatus: "RECEIVED" },
                  { status: "PO_RECEIVED" },
                  { status: "CLIENT_CONFIRMED" },
                  { status: "CLIENT_APPROVED" },
                  { status: "APPROVED" },
                  { status: "PO_CONVERTED" },
                  { status: "UNDER_PRODUCTION" }
                ]
              }
            })
          ])
          return {
            userId: cid,
            conversionRate: total > 0 ? (won / total) * 100 : 0
          }
        })
      )
    ])

    const topConsultants = consultantStats.map(stat => {
      const user = consultants.find(u => u.id === stat.preparedById)
      const clientsAssigned = clientAssignedCounts.find(c => c.userId === stat.preparedById)?.count || 0
      const convRate = conversionRates.find(c => c.userId === stat.preparedById)?.conversionRate || 0
      return {
        id: stat.preparedById,
        name: user?.name || "Unknown",
        image: user?.image || null,
        role: user?.role || "SALES_EXECUTIVE",
        count: stat._count.id,
        value: stat._sum.subtotal || 0,
        clientCount: clientsAssigned,
        conversionRate: Math.round(convRate * 100) / 100
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
      topClients,
      statusStats: statusStats.map(s => ({
        status: s.status,
        count: s._count.id,
        value: s._sum.subtotal || 0
      })),
      // 10 Team Overview KPIs
      totalDesignConsultants,
      totalAssignedClients,
      totalActiveQuotations,
      totalDraftQuotations,
      totalRevisedQuotations,
      totalClientConfirmedQuotations,
      totalBOQs,
      totalPendingBOQs,
      totalRevenuePipeline
    })
  } catch (error) {
    console.error("Dashboard summary error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
