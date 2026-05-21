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

    const userRole = (session.user as any).role || "SALES_EXECUTIVE"
    const currentUserId = (session.user as any).id

    let whereClause: any = {}

    // Role-based filtering
    if (userRole === "SALES_EXECUTIVE") {
      whereClause.userId = currentUserId
    } else if (userIdFilter && userIdFilter !== "all") {
      whereClause.userId = userIdFilter
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

    // Fetch Pending Follow-ups (Quotations needing follow-up)
    let followUpWhere: any = { status: "FOLLOW_UP" }
    if (userRole === "SALES_EXECUTIVE") {
      followUpWhere.preparedById = currentUserId
    } else if (userIdFilter && userIdFilter !== "all") {
      followUpWhere.preparedById = userIdFilter
    }

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
