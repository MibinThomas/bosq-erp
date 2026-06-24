import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"
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
    const minVal = url.searchParams.get("minVal")
    const maxVal = url.searchParams.get("maxVal")

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

    const isUnrestricted = ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(userRole)

    // Apply role-based dashboard filters
    if (!isUnrestricted) {
      whereClause.OR = [
        { preparedById: currentUserId },
        { salesAgentId: currentUserId },
        { client: { assignments: { some: { userId: currentUserId, allowAllQuotations: true } } } },
        { assignments: { some: { userId: currentUserId } } }
      ]
    } else {
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
    }

    // Role-based filtering overrides
    const isExcludedFromOwnershipLimit = ownershipRule === "ALL"
    if (isExcludedFromOwnershipLimit && userIdFilter && userIdFilter !== "all") {
      whereClause.preparedById = userIdFilter
      delete whereClause.OR
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

    if (minVal || maxVal) {
      whereClause.subtotal = {}
      if (minVal) whereClause.subtotal.gte = parseFloat(minVal)
      if (maxVal) whereClause.subtotal.lte = parseFloat(maxVal)
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
      const value = q.subtotal || 0
      
      const isConverted = q.poStatus === "RECEIVED" || q.status === "PO_RECEIVED" || q.status === "CLIENT_CONFIRMED" || q.status === "CLIENT_APPROVED" || q.status === "APPROVED" || q.status === "PO_CONVERTED" || q.status === "UNDER_PRODUCTION"
      
      if (isConverted) {
        record.convertedValue += value
      } else {
        record.pendingValue += value
      }
    })

    const salesData = Array.from(timeSeriesMap.values())

    // Prepare Segment Pie Chart Data
    const segmentMap = new Map<string, number>()
    segmentMap.set("Interior", 0)
    segmentMap.set("Dealer", 0)
    segmentMap.set("Direct", 0)
    segmentMap.set("Online", 0)

    quotations.forEach(q => {
      const segment = q.customerSegment || q.client?.clientType || "Direct"
      const val = q.subtotal || 0
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
    })
  } catch (error) {
    console.error("Dashboard charts error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
