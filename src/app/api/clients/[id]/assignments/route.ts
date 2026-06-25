import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { hasPermission } from "@/lib/rbac"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currentUserId = (session.user as any).id
    const userRole = (session.user as any).role || ""
    const isUnrestricted = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_MANAGER"].includes(userRole)
    if (!isUnrestricted) {
      const client = await prisma.client.findUnique({
        where: { id: params.id, deletedAt: null },
        include: { assignments: true }
      })
      if (!client) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 })
      }
      const hasApprovedRequest = await prisma.clientAccessRequest.findFirst({
        where: { clientId: params.id, userId: currentUserId, status: "Approved" }
      })
      const isAssigned = client.salespersonId === currentUserId ||
                         client.assignments.some(a => a.userId === currentUserId) ||
                         !!hasApprovedRequest
      if (!isAssigned) {
        return NextResponse.json({ error: "Forbidden: You do not have access to this client" }, { status: 403 })
      }
    }

    const canView = await hasPermission(currentUserId, "CLIENTS", "view")
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view clients" }, { status: 403 })
    }

    const assignments = await prisma.clientAssignment.findMany({
      where: { clientId: params.id },
      include: {
        user: { select: { id: true, name: true, role: true } }
      }
    })

    const quotationAssignments = await prisma.quotationAssignment.findMany({
      where: { quotation: { clientId: params.id } }
    })

    return NextResponse.json({ assignments, quotationAssignments })
  } catch (error) {
    console.error("Failed to fetch assignments:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
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

    // Only SUPER_ADMIN or those with specific permission can reassign clients
    const isSuperAdmin = dbSessionUser.role === "SUPER_ADMIN"
    const canManageAssignments = isSuperAdmin || await hasPermission(dbSessionUser.id, "CLIENTS", "manage")

    if (!canManageAssignments) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to manage assignments" }, { status: 403 })
    }

    const body = await request.json()
    const { primaryUserId, secondaries } = body

    if (!primaryUserId) {
      return NextResponse.json({ error: "Primary Assigned Consultant is required" }, { status: 400 })
    }

    // Transaction to replace all assignments for this client
    await prisma.$transaction(async (tx) => {
      // 1. Delete all existing client assignments
      await tx.clientAssignment.deleteMany({
        where: { clientId: params.id }
      })

      // 2. Delete all existing quotation assignments for this client's quotations
      await tx.quotationAssignment.deleteMany({
        where: { quotation: { clientId: params.id } }
      })

      // 3. Create Primary Assignment
      await tx.clientAssignment.create({
        data: {
          clientId: params.id,
          userId: primaryUserId,
          isPrimary: true,
          allowAllQuotations: true,
          allowQuotationEdit: true,
          allowRevisionApproval: true,
          allowBoqAccess: true,
          allowPricingVisibility: true,
        }
      })

      // 4. Update salespersonId on the Client for backward compatibility
      await tx.client.update({
        where: { id: params.id },
        data: { salespersonId: primaryUserId }
      })

      // 5. Create Secondary Assignments
      if (secondaries && Array.isArray(secondaries)) {
        for (const sec of secondaries) {
          if (sec.userId === primaryUserId) continue // Skip if someone accidentally added primary as secondary

          await tx.clientAssignment.create({
            data: {
              clientId: params.id,
              userId: sec.userId,
              isPrimary: false,
              allowAllQuotations: sec.allowAllQuotations ?? true,
              allowQuotationEdit: sec.allowQuotationEdit ?? false,
              allowRevisionApproval: sec.allowRevisionApproval ?? false,
              allowBoqAccess: sec.allowBoqAccess ?? false,
              allowPricingVisibility: sec.allowPricingVisibility ?? false,
            }
          })

          // Create specific quotation assignments if they don't have "all" access
          if (sec.allowAllQuotations === false && sec.quotationIds && Array.isArray(sec.quotationIds)) {
            for (const qId of sec.quotationIds) {
              await tx.quotationAssignment.create({
                data: {
                  quotationId: qId,
                  userId: sec.userId,
                  allowEdit: sec.allowQuotationEdit ?? false,
                  allowRevisionApproval: sec.allowRevisionApproval ?? false,
                  allowPricingVisibility: sec.allowPricingVisibility ?? false,
                }
              })
            }
          }
        }
      }
      
      // Log activity
      await tx.activityLog.create({
        data: {
          userId: dbSessionUser.id,
          action: "UPDATED_CLIENT_ASSIGNMENTS",
          entityType: "CLIENT",
          entityId: params.id,
          details: `Updated client assignments. Primary: ${primaryUserId}`,
        }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to update assignments:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
