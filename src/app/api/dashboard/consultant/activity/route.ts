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
    if (!profile) return NextResponse.json({ error: "Access denied" }, { status: 403 })

    const ownershipRule = profile.permissions.DASHBOARD?.ownership || "NONE"
    if (ownershipRule === "NONE") return NextResponse.json({ error: "No dashboard access" }, { status: 403 })

    let qWhere: any = {}

    // Enforce Ownership Rules
    if (ownershipRule === "OWN") {
      qWhere.preparedById = userId
    } else if (ownershipRule === "ASSIGNED") {
      qWhere.OR = [ { preparedById: userId }, { salesAgentId: userId } ]
    } else if (ownershipRule === "DEPARTMENT") {
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (user?.department) qWhere.preparedBy = { department: user.department }
      else qWhere.preparedById = userId
    }

    // 1. Pending Follow-ups (Quotations marked FOLLOW_UP)
    const followUps = await prisma.quotation.findMany({
      where: {
        ...qWhere,
        status: "FOLLOW_UP"
      },
      include: {
        client: { select: { companyName: true, contactPerson: true, phone: true } }
      },
      orderBy: { updatedAt: "desc" }
    })

    // 2. Recent Activities (from ActivityLog)
    let logWhere: any = { userId }
    if (ownershipRule === "ALL") {
      logWhere = {} // Show all logs if full access
    }

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
