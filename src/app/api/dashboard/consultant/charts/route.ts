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

    if (userRole === "DESIGN_CONSULTANT") {
      qWhere.client = {
        assignments: {
          some: {
            userId: userId
          }
        }
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
      if (startDate && startDate !== "null") {
        qWhere.createdAt.gte = new Date(startDate)
      }
      if (endDate && endDate !== "null") {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        qWhere.createdAt.lte = end
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
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true
              }
            }
          }
        }
      }
    })

    // 1. Monthly Value
    const monthlyValueMap = new Map<string, number>()
    quotations.forEach(q => {
      const d = new Date(q.createdAt)
      const month = d.toLocaleString("default", { month: "short", year: "2-digit" })
      monthlyValueMap.set(month, (monthlyValueMap.get(month) || 0) + (q.subtotal || 0))
    })
    const monthlyValue = Array.from(monthlyValueMap, ([name, value]) => ({ name, value }))

    // 2. Status Breakdown
    const statusMap = new Map<string, number>()
    quotations.forEach(q => {
      statusMap.set(q.status, (statusMap.get(q.status) || 0) + 1)
    })
    const statusBreakdown = Array.from(statusMap, ([name, value]) => ({ name, value }))

    // 3. Client Segment Breakdown
    const segmentMap = new Map<string, number>()
    quotations.forEach(q => {
      const segment = q.customerSegment || "Unknown"
      segmentMap.set(segment, (segmentMap.get(segment) || 0) + 1)
    })
    const segmentBreakdown = Array.from(segmentMap, ([name, value]) => ({ name, value }))

    // 4. Product Category
    const categoryMap = new Map<string, number>()
    quotations.forEach(q => {
      q.items.forEach(item => {
        const cat = item.product?.category?.name || "Custom/Uncategorized"
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + item.quantity)
      })
    })
    const categoryBreakdown = Array.from(categoryMap, ([name, value]) => ({ name, value }))

    return NextResponse.json({
      monthlyValue,
      statusBreakdown,
      segmentBreakdown,
      categoryBreakdown
    })
  } catch (error) {
    console.error("Consultant Charts API Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
