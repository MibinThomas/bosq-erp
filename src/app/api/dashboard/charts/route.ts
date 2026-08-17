import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { format } from "date-fns"
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
    let ownershipRule = "ASSIGNED" // default to safest
    if (userRole === "SUPER_ADMIN" || userRole === "ADMIN") {
      ownershipRule = "ALL"
    } else {
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

    // Strict boundaries for Manager/Sales Manager and Consultant/Sales Executive
    if (["MANAGER", "SALES_MANAGER"].includes(userRole)) {
      if (ownershipRule === "ALL") {
        ownershipRule = "DEPARTMENT"
      }
    } else if (["INTERIOR_DESIGN_CONSULTANT", "SALES_EXECUTIVE"].includes(userRole)) {
      if (ownershipRule === "ALL" || ownershipRule === "DEPARTMENT") {
        ownershipRule = "ASSIGNED"
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
      deletedAt: null,
      status: { not: "REVISED" } // Exclude revised quotations from charts to prevent duplicate metrics
    }

    // Set ownership filter for Quotations
    if (ownershipRule === "ALL") {
      // Unrestricted
    } else if (ownershipRule === "DEPARTMENT") {
      whereClause.OR = [
        { preparedById: { in: departmentUserIds } },
        { salesAgentId: { in: departmentUserIds } },
        { assignments: { some: { userId: { in: departmentUserIds } } } },
        { client: {
            OR: [
              { salespersonId: { in: departmentUserIds } },
              { assignments: { some: { userId: { in: departmentUserIds } } } }
            ]
          }
        }
      ]
    } else if (ownershipRule === "OWN" || ownershipRule === "ASSIGNED") {
      whereClause.OR = [
        { preparedById: currentUserId },
        { salesAgentId: currentUserId },
        { assignments: { some: { userId: currentUserId } } },
        { client: { salespersonId: currentUserId } },
        { client: { assignments: { some: { userId: currentUserId } } } },
        { client: { accessRequests: { some: { userId: currentUserId, status: "Approved" } } } }
      ]
    } else {
      whereClause.id = "none"
    }

    // Apply userId filter dropdown parameter safely within boundaries
    if (userIdFilter && userIdFilter !== "all") {
      const targetUserFilter = [
        { preparedById: userIdFilter },
        { salesAgentId: userIdFilter },
        { assignments: { some: { userId: userIdFilter } } },
        { client: { salespersonId: userIdFilter } },
        { client: { assignments: { some: { userId: userIdFilter } } } }
      ]

      if (ownershipRule === "ALL") {
        whereClause.OR = targetUserFilter
      } else if (ownershipRule === "DEPARTMENT") {
        if (departmentUserIds.includes(userIdFilter)) {
          whereClause.OR = targetUserFilter
        } else {
          whereClause.id = "none"
          delete whereClause.OR
        }
      } else {
        if (userIdFilter === currentUserId) {
          whereClause.OR = targetUserFilter
        } else {
          whereClause.id = "none"
          delete whereClause.OR
        }
      }
    }

    // Date filtering
    let startD = new Date()
    startD.setDate(startD.getDate() - 30) // Default last 30 days
    let endD = new Date()

    if (startDate && startDate !== "null") startD = new Date(startDate)
    if (endDate && endDate !== "null") {
      endD = new Date(endDate)
      endD.setHours(23, 59, 59, 999)
    }

    whereClause.createdAt = {
      gte: startD,
      lte: endD
    }

    if (clientIdFilter && clientIdFilter !== "all") whereClause.clientId = clientIdFilter
    if (statusFilter && statusFilter !== "all") whereClause.status = statusFilter
    
    if (clientTypeFilter && clientTypeFilter !== "all") {
      whereClause.client = { ...whereClause.client, clientType: clientTypeFilter }
    }

    if (projectNameFilter) {
      whereClause.projectName = { contains: projectNameFilter, mode: "insensitive" }
    }

    const quotations = await prisma.quotation.findMany({
      where: whereClause,
      include: {
        client: true
      },
      orderBy: { createdAt: "asc" }
    })

    // Prepare Sales Chart Time-Series Data
    // Group by Date (YYYY-MM-DD)
    const timeSeriesMap = new Map<string, { date: string; convertedValue: number; pendingValue: number }>()

    // Generate all dates in range to ensure continuous chart
    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      const dateStr = format(d, "MMM dd")
      timeSeriesMap.set(dateStr, { date: dateStr, convertedValue: 0, pendingValue: 0 })
    }

    quotations.forEach(q => {
      const dateStr = format(q.createdAt, "MMM dd")
      if (!timeSeriesMap.has(dateStr)) return
      
      const record = timeSeriesMap.get(dateStr)!
      const value = q.grandTotal || 0
      
      const isConverted = [
        "CLIENT_APPROVED",
        "CLIENT_CONFIRMED",
        "PO_RECEIVED",
        "UNDER_PRODUCTION",
        "READY_FOR_DELIVERY",
        "DELIVERED",
        "COMPLETED"
      ].includes(q.status)

      const isPending = [
        "SUBMITTED",
        "UNDER_REVIEW",
        "SENT_TO_CLIENT",
        "CLIENT_REVIEWING"
      ].includes(q.status)
      
      if (isConverted) {
        record.convertedValue += value
      } else if (isPending) {
        record.pendingValue += value
      }
    })

    const salesData = Array.from(timeSeriesMap.values())

    // Prepare Segment Pie Chart Data
    const segmentMap = new Map<string, number>()
    segmentMap.set("Interior", 0)
    segmentMap.set("Dealer", 0)
    segmentMap.set("Project", 0)
    segmentMap.set("Special", 0)

    quotations.forEach(q => {
      const segment = q.customerSegment || q.client?.clientType || "Project"
      const val = q.grandTotal || 0
      if (segmentMap.has(segment)) {
        segmentMap.set(segment, segmentMap.get(segment)! + val)
      } else {
        segmentMap.set(segment, val)
      }
    })

    const segmentData = Array.from(segmentMap.entries())
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0) // Only return segments with data

    return NextResponse.json({
      salesData,
      segmentData
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
      }
    })
  } catch (error) {
    console.error("Dashboard charts error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
