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

    const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
    if (userRole !== "ADMIN" && userRole !== "SALES_MANAGER") {
      return NextResponse.json({ error: "Forbidden: Admin or Sales Manager access required" }, { status: 403 })
    }

    const pendingClients = await prisma.client.findMany({
      where: { status: "Pending Approval", deletedAt: null },
      orderBy: { createdAt: "desc" },
    })

    const salespersonIds = pendingClients.map(c => c.salespersonId).filter(Boolean) as string[]
    
    let userMap = new Map<string, string>()
    if (salespersonIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: salespersonIds } },
        select: { id: true, name: true }
      })
      userMap = new Map(users.map(u => [u.id, u.name || ""]))
    }

    const result = pendingClients.map(c => ({
      ...c,
      salespersonName: c.salespersonId ? userMap.get(c.salespersonId) || "Unknown" : "Unknown"
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error("Failed to fetch pending clients:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
