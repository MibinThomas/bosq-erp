import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getSetting } from "@/lib/settings"
import { hasPermission } from "@/lib/rbac"

export async function GET(request: Request) {
  try {
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

    const canManage = await hasPermission(dbSessionUser.id, "CLIENTS", "edit")
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const requests = await prisma.clientAccessRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            clientId: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true
          }
        }
      }
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error("Failed to fetch access requests:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
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

    const canManage = await hasPermission(dbSessionUser.id, "CLIENTS", "edit")
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { requestId, action, rejectionReason, assignmentType } = body

    if (!requestId || !action || !["Approve", "Reject"].includes(action)) {
      return NextResponse.json(
        { error: "Request ID and a valid action (Approve or Reject) are required." },
        { status: 400 }
      )
    }

    // Fetch the access request details
    const accessRequest = await prisma.clientAccessRequest.findUnique({
      where: { id: requestId },
      include: { client: true, user: true }
    })

    if (!accessRequest) {
      return NextResponse.json({ error: "Access request not found" }, { status: 404 })
    }

    if (accessRequest.status !== "Requested") {
      return NextResponse.json(
        { error: `This request has already been processed (current status: ${accessRequest.status}).` },
        { status: 400 }
      )
    }

    const clientName = accessRequest.client.companyName
    const userName = accessRequest.user.name || accessRequest.user.email || "Consultant"

    if (action === "Approve") {
      // 1. Resolve assignment type (primary vs secondary)
      // Defaults to setting value ("secondary" by default) unless Admin explicitly passed a value in override
      const defaultAssignmentType = await getSetting("client_access_request_default_assignment")
      const resolvedAssignmentType = assignmentType || defaultAssignmentType || "secondary"

      await prisma.$transaction(async (tx) => {
        // Update request record
        await tx.clientAccessRequest.update({
          where: { id: requestId },
          data: { status: "Approved" }
        })

        if (resolvedAssignmentType === "primary") {
          // Update client salespersonId
          await tx.client.update({
            where: { id: accessRequest.clientId },
            data: { salespersonId: accessRequest.userId }
          })
        } else {
          // Create or update secondary client assignment
          await tx.clientAssignment.upsert({
            where: {
              clientId_userId: {
                clientId: accessRequest.clientId,
                userId: accessRequest.userId
              }
            },
            create: {
              clientId: accessRequest.clientId,
              userId: accessRequest.userId,
              isPrimary: false,
              allowAllQuotations: true,
              allowQuotationEdit: true,
              allowRevisionApproval: false,
              allowBoqAccess: true,
              allowPricingVisibility: true
            },
            update: {
              isPrimary: false,
              allowAllQuotations: true,
              allowQuotationEdit: true,
              allowBoqAccess: true,
              allowPricingVisibility: true
            }
          })
        }

        // Create notification for requested user
        await tx.notification.create({
          data: {
            userId: accessRequest.userId,
            title: "Access Request Approved",
            message: `Your access request for "${clientName}" has been approved.`,
            type: "CLIENT_ACCESS_APPROVED",
            link: `/quotations/new?clientId=${accessRequest.clientId}`
          }
        })

        // Log Activity
        await tx.activityLog.create({
          data: {
            userId: dbSessionUser.id,
            action: "APPROVED_CLIENT_ACCESS",
            entityType: "CLIENT",
            entityId: accessRequest.clientId,
            details: `Approved client access request for ${userName} to client ${clientName} (${resolvedAssignmentType} assignment)`,
          }
        })
      })

      return NextResponse.json({ success: true, status: "Approved" })
    } else {
      // Reject action
      await prisma.$transaction(async (tx) => {
        // Update request record
        await tx.clientAccessRequest.update({
          where: { id: requestId },
          data: { 
            status: "Rejected",
            rejectionReason: rejectionReason || null
          }
        })

        // Create notification for requested user
        await tx.notification.create({
          data: {
            userId: accessRequest.userId,
            title: "Access Request Rejected",
            message: `Your access request for "${clientName}" was rejected.${
              rejectionReason ? ` Reason: ${rejectionReason}` : ""
            }`,
            type: "CLIENT_ACCESS_REJECTED",
            link: `/quotations/new`
          }
        })

        // Log Activity
        await tx.activityLog.create({
          data: {
            userId: dbSessionUser.id,
            action: "REJECTED_CLIENT_ACCESS",
            entityType: "CLIENT",
            entityId: accessRequest.clientId,
            details: `Rejected client access request for ${userName} to client ${clientName}${
              rejectionReason ? ` (Reason: ${rejectionReason})` : ""
            }`,
          }
        })
      })

      return NextResponse.json({ success: true, status: "Rejected" })
    }
  } catch (error) {
    console.error("Failed to process access request:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
