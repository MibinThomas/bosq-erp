import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"

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

    // Soft-delete quotations so they can be restored by Super Admin
    await prisma.$transaction(async (tx) => {
      await tx.quotation.updateMany({
        where: {
          id: {
            in: ids,
          },
        },
        data: {
          deletedAt: new Date()
        }
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
