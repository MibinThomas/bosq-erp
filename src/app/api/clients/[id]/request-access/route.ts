import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const clientId = params.id

    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbSessionUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!dbSessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId }
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // Fetch all Admin and Super Admin users to notify them
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ["ADMIN", "SUPER_ADMIN"] },
        isActive: true,
        deletedAt: null
      }
    })

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          title: "Client Access Request",
          message: `${dbSessionUser.name || dbSessionUser.email} has requested access to client "${client.companyName}" (${client.clientId}).`,
          type: "CLIENT_ACCESS_REQUEST",
          link: `/clients/${client.id}`
        }))
      })
    }

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: dbSessionUser.id,
        action: "REQUESTED_CLIENT_ACCESS",
        entityType: "CLIENT",
        entityId: client.id,
        details: `Requested assignment/access for client ${client.companyName} (${client.clientId})`,
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to request client access:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
