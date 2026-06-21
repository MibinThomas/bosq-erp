import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"
import { hasPermission } from "@/lib/rbac"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currentUserId = (session.user as any).id

    const canView = await hasPermission(currentUserId, "REPORTS", "view")
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view reports" }, { status: 403 })
    }

    // Fetch user details to determine role and department
    const dbSessionUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      include: { permissionOverrides: { where: { module: "REPORTS" } } }
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
          include: { permissions: { where: { module: "REPORTS" } } }
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

    // Apply role-based reports filters
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

    const quotations = await prisma.quotation.findMany({
      where: whereClause,
      include: {
        client: true
      }
    })

    const totalCreated = quotations.length
    const totalRevisions = quotations.filter(q => q.parentId !== null || q.revisionNumber > 0).length
    const clientConfirmed = quotations.filter(q => ["CLIENT_APPROVED", "CLIENT_CONFIRMED", "APPROVED", "PO_CONVERTED", "PO_RECEIVED", "UNDER_PRODUCTION", "COMPLETED", "CLOSED"].includes(q.status)).length

    // Lost/rejected revisions: status is REJECTED or CANCELLED, OR it has been superseded by a confirmed quote in its series
    // To find superseded: we can group quotations by their root series ID (which is parentId || id)
    const seriesMap = new Map<string, any[]>()
    quotations.forEach(q => {
      const rootId = q.parentId || q.id
      if (!seriesMap.has(rootId)) {
        seriesMap.set(rootId, [])
      }
      seriesMap.get(rootId)!.push(q)
    })

    let lostOrRejected = 0
    quotations.forEach(q => {
      if (q.status === "REJECTED" || q.status === "CANCELLED") {
        lostOrRejected++
      } else {
        const rootId = q.parentId || q.id
        const seriesQuotes = seriesMap.get(rootId) || []
        const hasConfirmedInSeries = seriesQuotes.some(sq => 
          ["CLIENT_APPROVED", "CLIENT_CONFIRMED", "APPROVED", "PO_CONVERTED", "PO_RECEIVED", "UNDER_PRODUCTION", "COMPLETED", "CLOSED"].includes(sq.status)
        )
        const isThisQuoteConfirmed = ["CLIENT_APPROVED", "CLIENT_CONFIRMED", "APPROVED", "PO_CONVERTED", "PO_RECEIVED", "UNDER_PRODUCTION", "COMPLETED", "CLOSED"].includes(q.status)
        // If the series has a confirmed quote, but this specific one is not confirmed, it is "Not Selected" / "Superseded" / "Lost"
        if (hasConfirmedInSeries && !isThisQuoteConfirmed) {
          lostOrRejected++
        }
      }
    })

    // Prepare time series sales details for chart
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const monthlySeriesMap = new Map<string, { month: string; confirmed: number; total: number }>()

    // Initialize last 6 months
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substr(-2)}`
      monthlySeriesMap.set(label, { month: label, confirmed: 0, total: 0 })
    }

    quotations.forEach(q => {
      const d = new Date(q.createdAt)
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substr(-2)}`
      if (monthlySeriesMap.has(label)) {
        const data = monthlySeriesMap.get(label)!
        data.total += q.grandTotal
        if (["CLIENT_APPROVED", "CLIENT_CONFIRMED", "APPROVED", "PO_CONVERTED", "PO_RECEIVED", "UNDER_PRODUCTION", "COMPLETED", "CLOSED"].includes(q.status)) {
          data.confirmed += q.grandTotal
        }
      }
    })

    const chartData = Array.from(monthlySeriesMap.values())

    return NextResponse.json({
      totalCreated,
      totalRevisions,
      clientConfirmed,
      lostOrRejected,
      chartData
    })
  } catch (error) {
    console.error("Reports API error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
