import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { hasPermission } from "@/lib/rbac"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }
    const userId = (session.user as any).id
    const role = (session.user as any).role || ""

    const canDelete = await hasPermission(userId, "CLIENTS", "delete")
    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to delete clients" }, { status: 403 })
    }

    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: "Client IDs array is required" }, { status: 400 })
    }

    const isUnrestricted = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_MANAGER"].includes(role)
    if (!isUnrestricted) {
      const accessibleClients = await prisma.client.findMany({
        where: {
          id: { in: ids },
          deletedAt: null,
          OR: [
            { salespersonId: userId },
            { assignments: { some: { userId } } },
            { accessRequests: { some: { userId, status: "Approved" } } }
          ]
        },
        select: { id: true }
      })
      const accessibleIds = accessibleClients.map(c => c.id)
      const unauthorizedIds = ids.filter(id => !accessibleIds.includes(id))
      if (unauthorizedIds.length > 0) {
        return NextResponse.json(
          { error: "Forbidden: You do not have permission to delete one or more of the selected clients" },
          { status: 403 }
        )
      }
    }

    // Identify which clients can be deleted
    const clients = await prisma.client.findMany({
      where: { id: { in: ids } },
      include: {
        _count: {
          select: { quotations: true }
        }
      }
    })

    let deletableIds: string[] = []
    let undeletableCount = 0

    if (role === "SUPER_ADMIN") {
      // Soft delete associated quotations and BOQs first
      await prisma.quotation.updateMany({
        where: { clientId: { in: ids } },
        data: { deletedAt: new Date() }
      })
      await prisma.boq.updateMany({
        where: { clientId: { in: ids } },
        data: { deletedAt: new Date() }
      })
      deletableIds = ids
    } else {
      deletableIds = clients
        .filter((client) => client._count.quotations === 0)
        .map((client) => client.id)
      undeletableCount = clients.length - deletableIds.length
    }

    if (deletableIds.length === 0) {
       return NextResponse.json(
        { error: "None of the selected clients can be deleted because they have associated quotations." },
        { status: 400 }
      )
    }

    const { count } = await prisma.client.updateMany({
      where: { id: { in: deletableIds } },
      data: { deletedAt: new Date() }
    })

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any).id,
        action: "DELETED_CLIENTS",
        entityType: "CLIENT",
        entityId: "BULK",
        details: role === "SUPER_ADMIN" 
          ? `Bulk deleted ${count} clients, their quotations, and BOQs (Super Admin override).`
          : `Bulk deleted ${count} clients.`,
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
