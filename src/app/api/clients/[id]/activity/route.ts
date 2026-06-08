import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Fetch all quotation IDs belonging to this client
    const clientQuotations = await prisma.quotation.findMany({
      where: { clientId: id },
      select: { id: true },
    })
    const quotationIds = clientQuotations.map((q) => q.id)

    // Fetch combined activity logs: client-level + quotation-level
    const logs = await prisma.activityLog.findMany({
      where: {
        OR: [
          { entityType: "CLIENT", entityId: id },
          ...(quotationIds.length > 0
            ? [{ entityType: "QUOTATION", entityId: { in: quotationIds } }]
            : []),
        ],
      },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error("Failed to fetch client activity logs:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
