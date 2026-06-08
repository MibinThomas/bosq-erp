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

    const ownershipRule = profile.permissions.DASHBOARD?.ownership || "NONE"
    if (ownershipRule === "NONE") {
      return NextResponse.json({ error: "No dashboard access" }, { status: 403 })
    }

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

    // Enforce Ownership Rules
    if (ownershipRule === "OWN") {
      qWhere.OR = [
        { preparedById: userId },
        { client: { assignments: { some: { userId: userId, allowAllQuotations: true } } } },
        { assignments: { some: { userId: userId } } }
      ]
      cWhere.OR = [
        { salespersonId: userId },
        { assignments: { some: { userId: userId } } }
      ]
    } else if (ownershipRule === "ASSIGNED") {
      qWhere.OR = [
        { preparedById: userId },
        { salesAgentId: userId },
        { client: { assignments: { some: { userId: userId, allowAllQuotations: true } } } },
        { assignments: { some: { userId: userId } } }
      ]
      cWhere.OR = [
        { salespersonId: userId },
        { assignments: { some: { userId: userId } } }
      ]
    } else if (ownershipRule === "DEPARTMENT") {
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (user?.department) {
        qWhere.OR = [
          { preparedBy: { department: user.department } },
          { client: { assignments: { some: { user: { department: user.department }, allowAllQuotations: true } } } },
          { assignments: { some: { user: { department: user.department } } } }
        ]
        cWhere.OR = [
          { salesperson: { department: user.department } },
          { assignments: { some: { user: { department: user.department } } } }
        ]
      } else {
        qWhere.OR = [
          { preparedById: userId },
          { client: { assignments: { some: { userId: userId, allowAllQuotations: true } } } },
          { assignments: { some: { userId: userId } } }
        ]
        cWhere.OR = [
          { salespersonId: userId },
          { assignments: { some: { userId: userId } } }
        ]
      }
    }

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

    // Fetch Quotations Data
    const quotations = await prisma.quotation.findMany({
      where: qWhere,
    })

    const totalQuotes = quotations.length
    const totalValue = quotations.reduce((acc, q) => acc + (q.subtotal || 0), 0)

    const approvedQuotes = quotations.filter(q => q.status === "CLIENT_CONFIRMED")
    const approvedCount = approvedQuotes.length

    const pendingQuotes = quotations.filter(q => q.status === "SENT" || q.status === "PENDING_APPROVAL" || q.status === "REVISED" || q.status === "APPROVED")
    const pendingCount = pendingQuotes.length

    const rejectedQuotes = quotations.filter(q => q.status === "REJECTED")
    const rejectedCount = rejectedQuotes.length

    const convertedQuotes = quotations.filter(q => q.status === "PO_RECEIVED" || q.status === "CLIENT_CONFIRMED" || q.poStatus === "RECEIVED" || q.status === "UNDER_PRODUCTION")
    const convertedCount = convertedQuotes.length

    const followUpsCount = quotations.filter(q => q.status === "FOLLOW_UP").length

    // Fetch Clients Data
    const clients = await prisma.client.findMany({
      where: cWhere,
    })

    const activeClientsCount = clients.length
    const pendingClientApprovalsCount = clients.filter(c => c.status === "Pending Approval").length

    return NextResponse.json({
      totalQuotes,
      totalValue,
      approvedCount,
      pendingCount,
      rejectedCount,
      convertedCount,
      pendingClientApprovalsCount,
      followUpsCount,
      activeClientsCount,
    })
  } catch (error) {
    console.error("Consultant Summary API Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
