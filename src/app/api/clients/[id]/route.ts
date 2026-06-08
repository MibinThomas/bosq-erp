import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { renameClientFolder } from "@/lib/sharepoint"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const client = await prisma.client.findUnique({
      where: { id, deletedAt: null },
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // Fetch all quotations for this client (including revised ones so history is complete)
    const quotations = await prisma.quotation.findMany({
      where: { clientId: id, parentId: null }, // only root quotations; revisions are nested
      include: {
        items: { orderBy: { itemNo: "asc" } },
        preparedBy: { select: { id: true, name: true, role: true } },
        revisionsList: {
          include: {
            items: { orderBy: { itemNo: "asc" } },
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
    const userRole = (session?.user as any)?.role || ""

    // Only ADMIN/SALES_MANAGER/SUPER_ADMIN can edit clients
    if (!["ADMIN", "SALES_MANAGER", "SUPER_ADMIN"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { companyName, contactPerson, phone, email, address, trn, clientType, notes, status } = body

    if (!companyName) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 })
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

    const currentClient = await prisma.client.findUnique({ where: { id } })
    if (!currentClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
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
    const userRole = (session?.user as any)?.role || ""

    // Only ADMIN/SALES_MANAGER can delete clients
    if (!["ADMIN", "SALES_MANAGER"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Check if client has associated quotations
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: { quotations: true }
        }
      }
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    if (client._count.quotations > 0) {
      return NextResponse.json(
        { error: "Cannot delete client. There are quotations associated with this client." },
        { status: 400 }
      )
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
