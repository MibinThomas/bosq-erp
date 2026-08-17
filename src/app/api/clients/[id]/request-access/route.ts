import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"

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

    if (!["INTERIOR_DESIGN_CONSULTANT", "SALES_EXECUTIVE"].includes(dbSessionUser.role)) {
      return NextResponse.json(
        { error: "Only Interior Design Consultants and Sales Executives can request client access." },
        { status: 403 }
      )
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { assignments: true }
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // 1. Check if user is already assigned to this client
    const isPrimarySalesperson = client.salespersonId === dbSessionUser.id
    const secondaryAssignmentCount = await prisma.clientAssignment.count({
      where: {
        clientId: client.id,
        userId: dbSessionUser.id
      }
    })

    if (isPrimarySalesperson || secondaryAssignmentCount > 0) {
      return NextResponse.json(
        { error: "You already have access/assignment to this client." },
        { status: 400 }
      )
    }

    // Check for duplicate pending requests
    const existingRequest = await prisma.clientAccessRequest.findUnique({
      where: {
        clientId_userId: {
          clientId: client.id,
          userId: dbSessionUser.id
        }
      }
    })

    if (existingRequest && existingRequest.status === "Requested") {
      return NextResponse.json(
        { error: "A pending access request already exists for this client." },
        { status: 400 }
      )
    }

    // Parse request body for optional notes
    const body = await request.json().catch(() => ({}))
    const notes = body.notes || null

    // 2. Create or Update (upsert) the access request record
    const accessRequest = await prisma.clientAccessRequest.upsert({
      where: {
        clientId_userId: {
          clientId: client.id,
          userId: dbSessionUser.id
        }
      },
      create: {
        clientId: client.id,
        userId: dbSessionUser.id,
        userName: dbSessionUser.name || dbSessionUser.email || "Unknown User",
        status: "Requested",
        notes
      },
      update: {
        status: "Requested",
        notes,
        rejectionReason: null,
        updatedAt: new Date()
      }
    })

    // 3. Notify currently assigned Interior Design Consultants/Managers/Admins of that client
    // Also notify Admins/Super Admins for visibility.
    const notifyUserIds = new Set<string>()
    
    // Add primary salesperson if exists
    if (client.salespersonId) {
      notifyUserIds.add(client.salespersonId)
    }
    
    // Add secondary assigned users
    client.assignments.forEach(a => {
      notifyUserIds.add(a.userId)
    })

    // Fetch active Admins and Super Admins
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ["ADMIN", "SUPER_ADMIN"] },
        isActive: true,
        deletedAt: null
      }
    })
    admins.forEach(admin => {
      notifyUserIds.add(admin.id)
    })

    // Exclude the requester themselves from the notification list
    notifyUserIds.delete(dbSessionUser.id)

    if (notifyUserIds.size > 0) {
      await prisma.notification.createMany({
        data: Array.from(notifyUserIds).map(userId => ({
          userId,
          title: "Client Access Request",
          message: `${dbSessionUser.name || dbSessionUser.email} requested access to ${client.companyName}.`,
          type: "CLIENT_ACCESS_REQUEST",
          link: `/settings` // Redirects to settings console where requests tab resides
        }))
      })
    }

    // 4. Log Activity
    await prisma.activityLog.create({
      data: {
        userId: dbSessionUser.id,
        action: "REQUESTED_CLIENT_ACCESS",
        entityType: "CLIENT",
        entityId: client.id,
        details: `Requested assignment/access for client ${client.companyName} (${client.clientId})`,
      }
    })

    return NextResponse.json({ success: true, data: accessRequest })
  } catch (error) {
    console.error("Failed to request client access:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
