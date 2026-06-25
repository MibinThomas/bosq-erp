import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

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
      role: {
        in: ["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_MANAGER", "SALES_EXECUTIVE", "DESIGN_CONSULTANT"]
      },
      isActive: true,
      deletedAt: null
    }

    // Managers/Sales Managers can only view/filter agents in their own department
    if (["MANAGER", "SALES_MANAGER"].includes(userRole)) {
      whereClause.department = dbSessionUser.department || "N/A"
    } else if (["DESIGN_CONSULTANT", "SALES_EXECUTIVE"].includes(userRole)) {
      // Consultants can only see themselves
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
