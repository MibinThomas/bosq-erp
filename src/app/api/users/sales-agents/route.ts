import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch the logged-in user's role and department
    const dbSessionUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!dbSessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userRole = dbSessionUser.role

    let whereClause: any = {
      isActive: true,
      deletedAt: null
    }

    // Apply role-based query permissions
    if (userRole === "SUPER_ADMIN" || userRole === "ADMIN") {
      // Super Admin and Admin can view all active users across the organization
    } else if (["MANAGER", "SALES_MANAGER"].includes(userRole)) {
      // Managers can view users within their reporting department or team
      if (dbSessionUser.department) {
        whereClause.department = dbSessionUser.department
      }
    } else {
      // Standard users are locked to their own account
      whereClause.id = dbSessionUser.id
    }

    const salesAgents = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        department: true
      },
      orderBy: {
        name: "asc"
      }
    })

    return NextResponse.json(salesAgents)
  } catch (error) {
    console.error("Failed to fetch sales agents:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
