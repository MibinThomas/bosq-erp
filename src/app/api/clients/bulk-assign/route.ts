import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { hasPermission } from "@/lib/rbac"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbSessionUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!dbSessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check manage assignments permission (typically requires 'manage' or 'edit' on CLIENTS)
    // We'll enforce that the user must be ADMIN, SUPER_ADMIN, or SALES_MANAGER to bulk assign
    const isManagerOrAdmin = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "MANAGER"].includes(dbSessionUser.role)
    if (!isManagerOrAdmin) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to bulk assign clients" }, { status: 403 })
    }

    const body = await request.json()
    const { clientIds, targetUserId } = body

    if (!Array.isArray(clientIds) || clientIds.length === 0 || !targetUserId) {
      return NextResponse.json(
        { error: "clientIds (array) and targetUserId are required" },
        { status: 400 }
      )
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true }
    })

    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 })
    }

    // Process assignments in a transaction
    await prisma.$transaction(async (tx) => {
      for (const clientId of clientIds) {
        // 1. Update the client's salespersonId
        await tx.client.update({
          where: { id: clientId },
          data: { salespersonId: targetUserId }
        })

        // 2. Delete existing assignments
        await tx.clientAssignment.deleteMany({
          where: { clientId }
        })

        // 3. Create the new primary assignment
        await tx.clientAssignment.create({
          data: {
            clientId,
            userId: targetUserId,
            isPrimary: true,
            allowAllQuotations: true,
            allowQuotationEdit: true,
            allowRevisionApproval: true,
            allowBoqAccess: true,
            allowPricingVisibility: false
          }
        })

        // 4. Quotation assignments logic: give access to existing quotations for this client
        const existingQuotes = await tx.quotation.findMany({
          where: { clientId },
          select: { id: true }
        })

        if (existingQuotes.length > 0) {
          await tx.quotationAssignment.deleteMany({
            where: { quotationId: { in: existingQuotes.map((q) => q.id) } }
          })

          const quotationAssignmentsToCreate = existingQuotes.map((q) => ({
            quotationId: q.id,
            userId: targetUserId,
            allowEdit: true,
            allowRevisionApproval: true,
            allowPricingVisibility: false
          }))

          await tx.quotationAssignment.createMany({
            data: quotationAssignmentsToCreate
          })
        }

        // 5. Log the activity
        await tx.activityLog.create({
          data: {
            userId: dbSessionUser.id,
            action: "BULK_ASSIGN_CLIENT",
            entityType: "CLIENT",
            entityId: clientId,
            details: `Bulk assigned client to ${targetUser.name || targetUserId}`
          }
        })
      }
    })

    return NextResponse.json({ success: true, message: `Successfully assigned ${clientIds.length} clients.` })
  } catch (error: any) {
    console.error("Failed to bulk assign clients:", error)
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    )
  }
}
