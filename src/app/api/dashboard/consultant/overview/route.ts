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

    let qWhere: any = { deletedAt: null, status: { not: "REVISED" } } // Exclude revised from listings
    let cWhere: any = { deletedAt: null }
    let boqWhere: any = { deletedAt: null }

    // Enforce strict personal performance boundaries for Design Consultants and Sales Executives
    cWhere.OR = [
      { salespersonId: userId },
      { assignments: { some: { userId } } }
    ]
    qWhere.OR = [
      { preparedById: userId },
      { salesAgentId: userId },
      { assignments: { some: { userId } } },
      { client: {
          OR: [
            { salespersonId: userId },
            { assignments: { some: { userId, allowAllQuotations: true } } }
          ]
        }
      }
    ]
    boqWhere.OR = [
      { preparedById: userId },
      { estimatorId: userId },
      { client: {
          OR: [
            { salespersonId: userId },
            { assignments: { some: { userId } } }
          ]
        }
      }
    ]

    // Apply Filters
    if (startDate || endDate) {
      qWhere.createdAt = {}
      cWhere.createdAt = {}
      boqWhere.createdAt = {}
      if (startDate && startDate !== "null") {
        qWhere.createdAt.gte = new Date(startDate)
        cWhere.createdAt.gte = new Date(startDate)
        boqWhere.createdAt.gte = new Date(startDate)
      }
      if (endDate && endDate !== "null") {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        qWhere.createdAt.lte = end
        cWhere.createdAt.lte = end
        boqWhere.createdAt.lte = end
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
      cWhere.clientType = clientTypeFilter
      boqWhere.client = { ...boqWhere.client, clientType: clientTypeFilter }
    }

    if (projectNameFilter) {
      qWhere.projectName = { contains: projectNameFilter, mode: "insensitive" }
    }

    if (minVal || maxVal) {
      qWhere.subtotal = {}
      if (minVal) qWhere.subtotal.gte = parseFloat(minVal)
      if (maxVal) qWhere.subtotal.lte = parseFloat(maxVal)
    }

    const [quotations, clients, boqs] = await Promise.all([
      prisma.quotation.findMany({
        where: qWhere,
        orderBy: { updatedAt: "desc" },
        take: 20, // Limited to 20 for overview
        include: {
          client: {
            select: { companyName: true }
          }
        }
      }),
      prisma.client.findMany({
        where: cWhere,
        orderBy: { updatedAt: "desc" },
        take: 20,
      }),
      prisma.boq.findMany({
        where: { ...boqWhere, status: { in: ["DRAFT", "SENT_TO_ESTIMATOR", "COSTING_COMPLETED"] } },
        orderBy: { updatedAt: "desc" },
        take: 20,
        include: {
          client: {
            select: { companyName: true }
          }
        }
      })
    ])

    return NextResponse.json({ quotations, clients, boqs }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
      }
    })
  } catch (error) {
    console.error("Consultant Overview API Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
