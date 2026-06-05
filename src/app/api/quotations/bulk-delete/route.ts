import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    const role = (session?.user as any)?.role
    if (!session || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized. Only admins can delete quotations." }, { status: 401 })
    }

    const { ids } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No quotation IDs provided" }, { status: 400 })
    }

    // Delete related items first due to foreign key constraints
    await prisma.$transaction(async (tx) => {
      // 1. Delete associated quotation items
      await tx.quotationItem.deleteMany({
        where: {
          quotationId: {
            in: ids,
          },
        },
      })

      // 2. Delete the quotations
      await tx.quotation.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      })
      
      // 3. Log Activity
      await tx.activityLog.create({
        data: {
          userId: (session.user as any).id,
          action: "DELETED_QUOTATIONS",
          entityType: "QUOTATION",
          entityId: "BULK",
          details: `Admin deleted ${ids.length} quotation(s): ${ids.join(", ")}`,
        },
      })
    })

    return NextResponse.json({ message: `Successfully deleted ${ids.length} quotation(s)` })
  } catch (error) {
    console.error("Failed to delete quotations:", error)
    return NextResponse.json(
      { error: "Failed to delete quotations. Please try again." },
      { status: 500 }
    )
  }
}
