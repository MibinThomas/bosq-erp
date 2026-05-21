import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || ((session.user as any).role !== "ADMIN" && (session.user as any).role !== "SALES_MANAGER")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }

    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: "Client IDs array is required" }, { status: 400 })
    }

    // Identify which clients can be deleted (no quotations attached)
    const clients = await prisma.client.findMany({
      where: { id: { in: ids } },
      include: {
        _count: {
          select: { quotations: true }
        }
      }
    })

    const deletableIds = clients
      .filter((client) => client._count.quotations === 0)
      .map((client) => client.id)

    const undeletableCount = clients.length - deletableIds.length

    if (deletableIds.length === 0) {
       return NextResponse.json(
        { error: "None of the selected clients can be deleted because they have associated quotations." },
        { status: 400 }
      )
    }

    const { count } = await prisma.client.deleteMany({
      where: { id: { in: deletableIds } },
    })

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any).id,
        action: "DELETED_CLIENTS",
        entityType: "CLIENT",
        entityId: "BULK",
        details: `Bulk deleted ${count} clients.`,
      },
    })

    if (undeletableCount > 0) {
       return NextResponse.json({
        success: true,
        count,
        warning: `${undeletableCount} client(s) were skipped because they have associated quotations.`
      })
    }

    return NextResponse.json({ success: true, count })
  } catch (error) {
    console.error("Failed to bulk delete clients:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
