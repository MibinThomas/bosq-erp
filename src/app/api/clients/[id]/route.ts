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

    const updated = await prisma.client.update({
      where: { id },
      data: { companyName, contactPerson, phone, email, address, trn, clientType, notes },
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
