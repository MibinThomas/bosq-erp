import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const salesAgents = await prisma.user.findMany({
      where: {
        role: {
          in: ["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_MANAGER", "SALES_EXECUTIVE", "DESIGN_CONSULTANT"]
        },
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true
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
