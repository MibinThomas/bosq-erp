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
    if (!profile) return NextResponse.json({ error: "Access denied" }, { status: 403 })

    const dashboardAccess = profile.permissions.DASHBOARD?.ownership || "NONE"
    if (dashboardAccess === "NONE") return NextResponse.json({ error: "No dashboard access" }, { status: 403 })

    const qOwnershipRule = profile.permissions.QUOTATIONS?.ownership || "ASSIGNED"

    const url = new URL(request.url)
    const startDate = url.searchParams.get("startDate")
    const endDate = url.searchParams.get("endDate")
    const clientIdFilter = url.searchParams.get("clientId")
    const clientTypeFilter = url.searchParams.get("clientType")
    const statusFilter = url.searchParams.get("status")
    const projectNameFilter = url.searchParams.get("projectName")
    const minVal = url.searchParams.get("minVal")
    const maxVal = url.searchParams.get("maxVal")

    let qWhere: any = { deletedAt: null }
    let logWhere: any = { userId }
    if (dashboardAccess === "ALL") {
      logWhere = {} // Show all logs if full access
    }

    if (userRole === "DESIGN_CONSULTANT") {
      qWhere.client = {
        deletedAt: null,
        OR: [
          { salespersonId: userId },
          { assignments: { some: { userId } } }
        ]
      }

      const assignedClients = await prisma.client.findMany({
        where: {
          deletedAt: null,
          OR: [
            { salespersonId: userId },
            { assignments: { some: { userId } } }
          ]
        },
        select: { id: true }
      })
      const assignedClientIds = assignedClients.map(c => c.id)

      const [assignedQuotations, assignedBoqs] = await Promise.all([
        prisma.quotation.findMany({
          where: { clientId: { in: assignedClientIds }, deletedAt: null },
          select: { id: true }
        }),
        prisma.boq.findMany({
          where: { clientId: { in: assignedClientIds }, deletedAt: null },
          select: { id: true }
        })
      ])
      const assignedQuotationIds = assignedQuotations.map(q => q.id)
      const assignedBoqIds = assignedBoqs.map(b => b.id)

      logWhere = {
        OR: [
          { userId: userId },
          { AND: [{ entityType: "CLIENT" }, { entityId: { in: assignedClientIds } }] },
          { AND: [{ entityType: "QUOTATION" }, { entityId: { in: assignedQuotationIds } }] },
          { AND: [{ entityType: "BOQ" }, { entityId: { in: assignedBoqIds } }] }
        ]
      }
    } else {
      // Enforce Quotations Ownership
      if (qOwnershipRule === "OWN") {
        qWhere.OR = [
          { preparedById: userId },
          { client: { assignments: { some: { userId: userId, allowAllQuotations: true } } } },
          { assignments: { some: { userId: userId } } }
        ]
      } else if (qOwnershipRule === "ASSIGNED") {
        qWhere.OR = [
          { preparedById: userId },
          { salesAgentId: userId },
          { client: { assignments: { some: { userId: userId, allowAllQuotations: true } } } },
          { assignments: { some: { userId: userId } } }
        ]
      } else if (qOwnershipRule === "DEPARTMENT") {
        if (user?.department) {
          qWhere.OR = [
            { preparedBy: { department: user.department } },
            { client: { assignments: { some: { user: { department: user.department }, allowAllQuotations: true } } } },
            { assignments: { some: { user: { department: user.department } } } }
          ]
        } else {
          qWhere.OR = [
            { preparedById: userId },
            { client: { assignments: { some: { userId: userId, allowAllQuotations: true } } } },
            { assignments: { some: { userId: userId } } }
          ]
        }
      }
    }

    // Apply Filters
    if (startDate || endDate) {
      qWhere.createdAt = {}
      logWhere.createdAt = {}
      if (startDate && startDate !== "null") {
        qWhere.createdAt.gte = new Date(startDate)
        logWhere.createdAt.gte = new Date(startDate)
      }
      if (endDate && endDate !== "null") {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        qWhere.createdAt.lte = end
        logWhere.createdAt.lte = end
      }
    }

    if (clientIdFilter && clientIdFilter !== "all") {
      qWhere.clientId = clientIdFilter
    }

    // For follow-ups, we generally lock status to FOLLOW_UP unless statusFilter overrides
    if (statusFilter && statusFilter !== "all") {
      qWhere.status = statusFilter
    } else {
      qWhere.status = "FOLLOW_UP"
    }

    if (clientTypeFilter && clientTypeFilter !== "all") {
      qWhere.client = { ...qWhere.client, clientType: clientTypeFilter }
    }

    if (projectNameFilter) {
      qWhere.projectName = { contains: projectNameFilter, mode: "insensitive" }
    }

    if (minVal || maxVal) {
      qWhere.subtotal = {}
      if (minVal) qWhere.subtotal.gte = parseFloat(minVal)
      if (maxVal) qWhere.subtotal.lte = parseFloat(maxVal)
    }

    // 1. Pending Follow-ups (Quotations marked FOLLOW_UP)
    const followUps = await prisma.quotation.findMany({
      where: qWhere,
      include: {
        client: { select: { companyName: true, contactPerson: true, phone: true } }
      },
      orderBy: { updatedAt: "desc" }
    })

    // 2. Recent Activities (from ActivityLog)
    const activities = await prisma.activityLog.findMany({
      where: logWhere,
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: { select: { name: true, image: true } }
      }
    })

    return NextResponse.json({
      followUps,
      activities
    })
  } catch (error) {
    console.error("Consultant Activity API Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
