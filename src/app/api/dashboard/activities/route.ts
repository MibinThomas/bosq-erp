import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"

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

    const userRole = (session.user as any).role || "SALES_EXECUTIVE"
    const currentUserId = (session.user as any).id

    let whereClause: any = {}
    let followUpWhere: any = {}

    // Role-based filtering
    if (userRole === "SALES_EXECUTIVE") {
      whereClause.userId = currentUserId
      followUpWhere.preparedById = currentUserId
    } else if (userIdFilter && userIdFilter !== "all") {
      whereClause.userId = userIdFilter
      followUpWhere.preparedById = userIdFilter
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
    
    // Status Filter - Activity usually doesn't have status, but Followups do
    if (statusFilter && statusFilter !== "all") {
      followUpWhere.status = statusFilter
    } else {
      followUpWhere.status = "FOLLOW_UP" // Default to follow up if not specific
    }
    
    if (clientTypeFilter && clientTypeFilter !== "all") {
      followUpWhere.client = { clientType: clientTypeFilter }
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
