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
    const userIdFilter = url.searchParams.get("userId")
    const limit = parseInt(url.searchParams.get("limit") || "10")

    const startDate = url.searchParams.get("startDate")
    const endDate = url.searchParams.get("endDate")
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

    let whereClause: any = {}
    let followUpWhere: any = {
      deletedAt: null
    }

    const isUnrestricted = ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(userRole)

    // Apply role-based dashboard filters for Activities
    if (!isUnrestricted) {
      whereClause.userId = currentUserId
    } else {
      if (ownershipRule === "OWN" || ownershipRule === "ASSIGNED") {
        whereClause.userId = currentUserId
      } else if (ownershipRule === "DEPARTMENT") {
        whereClause.userId = { in: departmentUserIds }
      } else if (ownershipRule === "NONE") {
        whereClause.id = "none"
      }
    }

    // Apply role-based dashboard filters for follow-ups
    if (!isUnrestricted) {
      followUpWhere.OR = [
        { preparedById: currentUserId },
        { salesAgentId: currentUserId },
        { client: { assignments: { some: { userId: currentUserId, allowAllQuotations: true } } } },
        { assignments: { some: { userId: currentUserId } } }
      ]
    } else {
      if (ownershipRule === "OWN" || ownershipRule === "ASSIGNED") {
        followUpWhere.OR = [
          { preparedById: currentUserId },
          { salesAgentId: currentUserId },
          { client: { assignments: { some: { userId: currentUserId, allowAllQuotations: true } } } },
          { assignments: { some: { userId: currentUserId } } }
        ]
      } else if (ownershipRule === "DEPARTMENT") {
        followUpWhere.OR = [
          { preparedById: { in: departmentUserIds } },
          { salesAgentId: { in: departmentUserIds } },
          { client: { assignments: { some: { userId: { in: departmentUserIds }, allowAllQuotations: true } } } },
          { assignments: { some: { userId: { in: departmentUserIds } } } }
        ]
      } else if (ownershipRule === "NONE") {
        followUpWhere.id = "none"
      }
    }

    // Role-based filtering overrides
    const isExcludedFromOwnershipLimit = ownershipRule === "ALL"
    if (isExcludedFromOwnershipLimit && userIdFilter && userIdFilter !== "all") {
      whereClause.userId = userIdFilter
      followUpWhere.preparedById = userIdFilter
      delete followUpWhere.OR
    }

    // Date filtering
    if (startDate || endDate) {
      whereClause.createdAt = {}
      followUpWhere.createdAt = {}
      if (startDate && startDate !== "null") {
        whereClause.createdAt.gte = new Date(startDate)
        followUpWhere.createdAt.gte = new Date(startDate)
      }
      if (endDate && endDate !== "null") {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        whereClause.createdAt.lte = end
        followUpWhere.createdAt.lte = end
      }
    }

    if (clientIdFilter && clientIdFilter !== "all") followUpWhere.clientId = clientIdFilter
    
    // Status Filter
    if (statusFilter && statusFilter !== "all") {
      followUpWhere.status = statusFilter
    } else {
      followUpWhere.status = "FOLLOW_UP"
    }
    
    if (clientTypeFilter && clientTypeFilter !== "all") {
      followUpWhere.client = { ...followUpWhere.client, clientType: clientTypeFilter }
    }

    if (projectNameFilter) {
      followUpWhere.projectName = { contains: projectNameFilter, mode: "insensitive" }
    }

    if (minVal || maxVal) {
      followUpWhere.subtotal = {}
      if (minVal) followUpWhere.subtotal.gte = parseFloat(minVal)
      if (maxVal) followUpWhere.subtotal.lte = parseFloat(maxVal)
    }

    // Fetch Recent Activity Logs
    const activities = await prisma.activityLog.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, image: true, role: true } }
      },
      orderBy: { createdAt: "desc" },
      take: limit
    })

    const followUps = await prisma.quotation.findMany({
      where: followUpWhere,
      include: {
        client: { select: { companyName: true } },
        preparedBy: { select: { name: true, image: true } }
      },
      orderBy: { followUpDate: "asc" },
      take: limit
    })

    return NextResponse.json({
      activities,
      followUps
    })
  } catch (error) {
    console.error("Dashboard activities error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
