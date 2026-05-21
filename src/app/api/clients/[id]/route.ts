import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const client = await prisma.client.findUnique({
      where: { id },
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // Fetch all quotations for this client (including revised ones so history is complete)
    const quotations = await prisma.quotation.findMany({
      where: { clientId: id },
      include: {
        items: { orderBy: { itemNo: "asc" } },
        preparedBy: { select: { id: true, name: true, role: true } },
        revisionsList: {
          include: {
            items: { orderBy: { itemNo: "asc" } },
            preparedBy: { select: { id: true, name: true, role: true } },
          },
          orderBy: { revisionNumber: "desc" },
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

    // Only ADMIN/SALES_MANAGER can edit clients
    if (!["ADMIN", "SALES_MANAGER"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { companyName, contactPerson, phone, email, address, trn, clientType, notes } = body

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

    const updated = await prisma.client.update({
      where: { id },
      data: { companyName: companyName.trim(), contactPerson, phone, email, address, trn, clientType, notes },
    })

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

    await prisma.client.delete({
      where: { id },
    })

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any).id,
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
