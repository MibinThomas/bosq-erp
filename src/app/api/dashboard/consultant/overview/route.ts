import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getPermissionsProfile } from "@/lib/rbac"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id
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
    const minVal = url.searchParams.get("minVal")
    const maxVal = url.searchParams.get("maxVal")

    let qWhere: any = {}
    let cWhere: any = {}

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
      const user = await prisma.user.findUnique({ where: { id: userId } })
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

    // Enforce Clients Ownership
    if (cOwnershipRule === "OWN" || cOwnershipRule === "ASSIGNED") {
      cWhere.OR = [
        { salespersonId: userId },
        { assignments: { some: { userId: userId } } }
      ]
    } else if (cOwnershipRule === "DEPARTMENT") {
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (user?.department) {
        cWhere.OR = [
          { salesperson: { department: user.department } },
          { assignments: { some: { user: { department: user.department } } } }
        ]
      } else {
        cWhere.OR = [
          { salespersonId: userId },
          { assignments: { some: { userId: userId } } }
        ]
      }
    }
    // End of ownership logic

    // Apply Filters
    if (startDate || endDate) {
      qWhere.createdAt = {}
      cWhere.createdAt = {}
      if (startDate && startDate !== "null") {
        qWhere.createdAt.gte = new Date(startDate)
        cWhere.createdAt.gte = new Date(startDate)
      }
      if (endDate && endDate !== "null") {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        qWhere.createdAt.lte = end
        cWhere.createdAt.lte = end
      }
    }

    if (clientIdFilter && clientIdFilter !== "all") {
      qWhere.clientId = clientIdFilter
    }

    if (statusFilter && statusFilter !== "all") {
      qWhere.status = statusFilter
    }

    if (clientTypeFilter && clientTypeFilter !== "all") {
      qWhere.client = { clientType: clientTypeFilter }
      cWhere.clientType = clientTypeFilter
    }

    if (projectNameFilter) {
      qWhere.projectName = { contains: projectNameFilter, mode: "insensitive" }
    }

    if (minVal || maxVal) {
      qWhere.subtotal = {}
      if (minVal) qWhere.subtotal.gte = parseFloat(minVal)
      if (maxVal) qWhere.subtotal.lte = parseFloat(maxVal)
    }

    const quotations = await prisma.quotation.findMany({
      where: qWhere,
      orderBy: { updatedAt: "desc" },
      take: 20, // Limited to 20 for overview
      include: {
        client: {
          select: { companyName: true }
        }
      }
    })

    const clients = await prisma.client.findMany({
      where: cWhere,
      orderBy: { updatedAt: "desc" },
      take: 20,
    })

    return NextResponse.json({ quotations, clients })
  } catch (error) {
    console.error("Consultant Overview API Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
