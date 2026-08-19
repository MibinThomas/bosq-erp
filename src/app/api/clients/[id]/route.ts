import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { renameClientFolder } from "@/lib/sharepoint"
import { hasPermission } from "@/lib/rbac"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const client = await prisma.client.findUnique({
      where: { id, deletedAt: null },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                name: true,
                role: true
              }
            }
          }
        }
      }
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // Check GET permission
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const canView = await hasPermission((session.user as any).id, "CLIENTS", "view")
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view clients" }, { status: 403 })
    }

    const userRole = (session.user as any).role || ""
    const isUnrestricted = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_MANAGER"].includes(userRole)
    if (!isUnrestricted) {
      const currentUserId = (session.user as any).id
      const hasApprovedRequest = await prisma.clientAccessRequest.findFirst({
        where: { clientId: id, userId: currentUserId, status: "Approved" }
      })
      const isAssigned = client.salespersonId === currentUserId ||
                         client.assignments.some(a => a.userId === currentUserId) ||
                         !!hasApprovedRequest
      if (!isAssigned) {
        return NextResponse.json({ error: "Forbidden: You do not have access to this client" }, { status: 403 })
      }
    }

    // Lazy-load SharePoint folder if missing (e.g. from bulk import)
    if (!client.sharepointFolder || client.sharepointFolder.startsWith("mock-")) {
      try {
        const { createClientFolder } = await import("@/lib/sharepoint")
        const newFolderId = await createClientFolder(client.companyName)
        if (newFolderId && !newFolderId.startsWith("mock-")) {
          await prisma.client.update({
            where: { id: client.id },
            data: { sharepointFolder: newFolderId }
          })
          client.sharepointFolder = newFolderId
        }
      } catch (err) {
        console.error("Failed lazy-loading SharePoint folder:", err)
      }
    }

    // Fetch all quotations for this client (including revised ones so history is complete)
    const quotations = await prisma.quotation.findMany({
      where: { clientId: id, parentId: null, deletedAt: null }, // only root quotations; revisions are nested
      include: {
        items: {
          orderBy: [
            { sortOrder: "asc" },
            { itemNo: "asc" }
          ]
        },
        preparedBy: { select: { id: true, name: true, role: true } },
        revisionsList: {
          where: { deletedAt: null },
          include: {
            items: {
              orderBy: [
                { sortOrder: "asc" },
                { itemNo: "asc" }
              ]
            },
            preparedBy: { select: { id: true, name: true, role: true } },
          },
          orderBy: { revisionNumber: "asc" }, // ASC for chronological display
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Attach QuotationRevision log entries to each root quotation
    const quotationsWithRevisionLogs = await Promise.all(
      quotations.map(async (q) => {
        const rootId = q.parentId || q.id
        const revisionLogs = await prisma.quotationRevision.findMany({
          where: { quotationId: rootId },
          orderBy: { revisionNumber: "desc" },
        })
        return { ...q, revisionLogs }
      })
    )

    return NextResponse.json({
      ...client,
      quotations: quotationsWithRevisionLogs,
    })
  } catch (error) {
    console.error("Failed to fetch client detail:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const currentUserId = (session.user as any).id

    const canEdit = await hasPermission(currentUserId, "CLIENTS", "edit")
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to edit clients" }, { status: 403 })
    }

    const { clientId, companyName, contactPerson, phone, email, address, trn, clientType, notes, status } = body

    if (!companyName) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 })
    }

    const currentClient = await prisma.client.findUnique({ 
      where: { id },
      include: { assignments: true }
    })
    if (!currentClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    const userRole = (session.user as any).role || ""
    let newClientIdToSave: string | undefined = undefined

    // Handle Client ID modification (Super Admin only)
    if (clientId && clientId.trim() !== currentClient.clientId) {
      if (userRole !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Forbidden: Only Super Admin users are allowed to edit Client IDs" }, { status: 403 })
      }

      const formattedNewClientId = clientId.trim()

      // Validate Client ID uniqueness
      const duplicateClientId = await prisma.client.findFirst({
        where: {
          clientId: {
            equals: formattedNewClientId,
            mode: "insensitive"
          },
          id: { not: id },
          deletedAt: null
        }
      })

      if (duplicateClientId) {
        return NextResponse.json(
          { error: `Client ID "${formattedNewClientId}" is already assigned to "${duplicateClientId.companyName}". Please enter a unique Client ID.` },
          { status: 409 }
        )
      }

      newClientIdToSave = formattedNewClientId
    }

    // Check for duplicate company name
    const existingClient = await prisma.client.findFirst({
      where: {
        companyName: {
          equals: companyName.trim(),
          mode: "insensitive"
        },
        id: { not: id } // Exclude the current client being edited
      }
    })

    if (existingClient) {
      return NextResponse.json(
        { error: `A client with the company name "${existingClient.companyName}" already exists.` },
        { status: 409 }
      )
    }

    const isUnrestricted = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_MANAGER"].includes(userRole)
    if (!isUnrestricted) {
      const hasApprovedRequest = await prisma.clientAccessRequest.findFirst({
        where: { clientId: id, userId: currentUserId, status: "Approved" }
      })
      const isAssigned = currentClient.salespersonId === currentUserId ||
                         currentClient.assignments.some(a => a.userId === currentUserId) ||
                         !!hasApprovedRequest
      if (!isAssigned) {
        return NextResponse.json({ error: "Forbidden: You do not have access to this client" }, { status: 403 })
      }
    }

    const oldCompanyName = currentClient.companyName
    const newCompanyName = companyName.trim()
    let sharepointRenamed = false

    if (oldCompanyName !== newCompanyName) {
      try {
        await renameClientFolder(oldCompanyName, newCompanyName)
        sharepointRenamed = true
      } catch (error: any) {
        if (error.message === "SHAREPOINT_FOLDER_EXISTS") {
          return NextResponse.json(
            { error: `A folder named "${newCompanyName}" already exists in SharePoint. Please use a different name or resolve it in SharePoint first.` },
            { status: 409 }
          )
        }
        console.error("Failed to rename SharePoint folder:", error)
        return NextResponse.json({ error: "Failed to rename client folder in SharePoint." }, { status: 500 })
      }
    }

    const updated = await prisma.client.update({
      where: { id },
      data: { 
        ...(newClientIdToSave && { clientId: newClientIdToSave }),
        companyName: companyName.trim(), 
        contactPerson, 
        phone, 
        email, 
        address, 
        trn, 
        clientType, 
        notes,
        ...(status && { status })
      },
    })

    // Log Activity for approval/rejection or general update
    let action = "UPDATED_CLIENT"
    let details = `Updated client ${companyName.trim()}`
    if (status === "Approved") {
      action = "APPROVED_CLIENT"
      details = `Approved client ${companyName.trim()}`
    } else if (status === "Rejected") {
      action = "REJECTED_CLIENT"
      details = `Rejected client ${companyName.trim()}`
    }

    await prisma.activityLog.create({
      data: {
        userId: (session?.user as any)?.id || "SYSTEM",
        action,
        entityType: "CLIENT",
        entityId: id,
        details,
      },
    })

    if (sharepointRenamed) {
      await prisma.activityLog.create({
        data: {
          userId: (session?.user as any)?.id || "SYSTEM",
          action: "UPDATED_CLIENT",
          entityType: "CLIENT",
          entityId: id,
          details: `Client folder renamed in SharePoint from "${oldCompanyName}" to "${newCompanyName}"`,
        },
      })
    }

    // Notify the salesperson if status changed
    if ((status === "Approved" || status === "Rejected") && updated.salespersonId) {
      await prisma.notification.create({
        data: {
          userId: updated.salespersonId,
          title: `Client ${status}`,
          message: `Your client ${companyName.trim()} has been ${status.toLowerCase()}.`,
          type: "CLIENT_APPROVAL",
          link: `/clients/${id}`
        }
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update client:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as any).id
    const userRole = (session.user as any).role || ""

    const canDelete = await hasPermission(userId, "CLIENTS", "delete")
    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to delete clients" }, { status: 403 })
    }

    // Check if client has associated quotations
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: { quotations: true }
        },
        assignments: true
      }
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    const isUnrestricted = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_MANAGER"].includes(userRole)
    if (!isUnrestricted) {
      const hasApprovedRequest = await prisma.clientAccessRequest.findFirst({
        where: { clientId: id, userId: userId, status: "Approved" }
      })
      const isAssigned = client.salespersonId === userId ||
                         client.assignments.some(a => a.userId === userId) ||
                         !!hasApprovedRequest
      if (!isAssigned) {
        return NextResponse.json({ error: "Forbidden: You do not have access to this client" }, { status: 403 })
      }
    }

    if (client._count.quotations > 0) {
      if (userRole === "SUPER_ADMIN") {
        // Cascade delete associated quotations, revisions list, and BOQs first
        await prisma.quotation.updateMany({
          where: { clientId: id },
          data: { parentId: null }
        })
        await prisma.quotation.deleteMany({
          where: { clientId: id }
        })
        await prisma.boq.deleteMany({
          where: { clientId: id }
        })
        await prisma.clientAssignment.deleteMany({
          where: { clientId: id }
        })
      } else {
        return NextResponse.json(
          { error: "Cannot delete client. There are quotations associated with this client." },
          { status: 400 }
        )
      }
    }

    await prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() }
    })

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: (session?.user as any)?.id || "SYSTEM",
        action: "DELETED_CLIENT",
        entityType: "CLIENT",
        entityId: id,
        details: `Deleted client ${client.companyName}`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete client:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
