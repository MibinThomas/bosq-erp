import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import prisma from "@/lib/prisma"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { action, rejectionReason } = body

    const userRole = (session.user as any).role || ""
    const userId = (session.user as any).id || ""
    const userName = session.user.name || session.user.email || "Manager"

    const isManagerOrAdmin = [
      "SUPER_ADMIN",
      "ADMIN",
      "SALES_MANAGER",
      "MANAGER",
    ].includes(userRole)

    if (!isManagerOrAdmin) {
      return NextResponse.json(
        { message: "Forbidden: Only managerial roles can approve/reject quotation discounts." },
        { status: 403 }
      )
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!quotation) {
      return NextResponse.json({ message: "Quotation not found" }, { status: 404 })
    }

    if (action === "APPROVE") {
      const updated = await prisma.quotation.update({
        where: { id },
        data: {
          approvalStatus: "APPROVED",
          approvedById: userId,
          approvedAt: new Date(),
          rejectionReason: null,
        }
      })

      // Create Audit Activity Log
      await prisma.activityLog.create({
        data: {
          entityType: "QUOTATION",
          entityId: id,
          userId: userId,
          action: "DISCOUNT_APPROVED",
          details: `Quotation discount approved by ${userName} (${userRole}). Overall discount: ${quotation.overallDiscountPercentage.toFixed(1)}%.`,
        }
      }).catch((err: any) => console.error("Failed to log activity", err))

      return NextResponse.json({ success: true, quotation: updated })
    }

    if (action === "REJECT") {
      const updated = await prisma.quotation.update({
        where: { id },
        data: {
          approvalStatus: "REJECTED",
          rejectionReason: rejectionReason || "Discount rejected by management.",
        }
      })

      // Create Audit Activity Log
      await prisma.activityLog.create({
        data: {
          entityType: "QUOTATION",
          entityId: id,
          userId: userId,
          action: "DISCOUNT_REJECTED",
          details: `Quotation discount rejected by ${userName}. Reason: ${rejectionReason || "No remarks provided"}.`,
        }
      }).catch((err: any) => console.error("Failed to log activity", err))

      return NextResponse.json({ success: true, quotation: updated })
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("Error in quotation approval API:", error)
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    )
  }
}
