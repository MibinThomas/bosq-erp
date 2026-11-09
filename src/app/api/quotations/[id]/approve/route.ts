import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import prisma from "@/lib/prisma"
import {
  APPROVAL_TIERS,
  PENDING_APPROVAL_STATUSES,
  canApproveTier,
  highestTier,
  requiredTierForQuotation,
  tierLabel,
} from "@/lib/approval-policy"

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

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json({ message: "Invalid action" }, { status: 400 })
    }

    const quotation = await prisma.quotation.findFirst({
      where: { id, deletedAt: null },
    })

    if (!quotation) {
      return NextResponse.json({ message: "Quotation not found" }, { status: 404 })
    }

    // The stricter of: the tier its stored discounts measure to, and the tier it is pending at.
    // Anything reaching this point needs at least a manager.
    const requiredTier = highestTier(
      requiredTierForQuotation(quotation),
      quotation.approvalStatus,
      APPROVAL_TIERS.IDC
    )

    if (!canApproveTier(userRole, requiredTier)) {
      return NextResponse.json(
        { message: `Forbidden: this discount requires ${tierLabel(requiredTier)} approval.` },
        { status: 403 }
      )
    }

    // Approve: a pending quotation, or a rejected one being reconsidered. Reject: pending only.
    const actionableStatuses = action === "APPROVE"
      ? [...PENDING_APPROVAL_STATUSES, "REJECTED"]
      : PENDING_APPROVAL_STATUSES
    if (!actionableStatuses.includes(quotation.approvalStatus)) {
      return NextResponse.json(
        { message: `This quotation is not awaiting approval (current status: ${quotation.approvalStatus}).` },
        { status: 409 }
      )
    }

    const data = action === "APPROVE"
      ? { approvalStatus: "APPROVED", approvedById: userId, approvedAt: new Date(), rejectionReason: null }
      : {
          approvalStatus: "REJECTED",
          approvedById: null,
          approvedAt: null,
          rejectionReason: rejectionReason || "Discount rejected by management.",
        }

    // Conditional update: if someone else decided in the meantime, nothing is written
    const result = await prisma.quotation.updateMany({
      where: { id, approvalStatus: quotation.approvalStatus },
      data,
    })
    if (result.count === 0) {
      return NextResponse.json(
        { message: "This quotation's approval status changed while you were reviewing it. Refresh and try again." },
        { status: 409 }
      )
    }
    const updated = await prisma.quotation.findUnique({ where: { id } })

    const pct = Math.max(quotation.overallDiscountPercentage || 0, quotation.maxDiscountPercentage || 0)
    await prisma.activityLog.create({
      data: {
        entityType: "QUOTATION",
        entityId: id,
        userId,
        action: action === "APPROVE" ? "DISCOUNT_APPROVED" : "DISCOUNT_REJECTED",
        details: action === "APPROVE"
          ? `Quotation discount approved by ${userName} (${userRole}) at ${tierLabel(requiredTier)} level. Max discount: ${pct.toFixed(1)}%.`
          : `Quotation discount rejected by ${userName} (${userRole}). Reason: ${rejectionReason || "No remarks provided"}.`,
      }
    }).catch((err: any) => console.error("Failed to log activity", err))

    // Tell the quotation's owner about the decision
    if (quotation.preparedById && quotation.preparedById !== userId) {
      await prisma.notification.create({
        data: {
          userId: quotation.preparedById,
          title: action === "APPROVE" ? "Discount Approved" : "Discount Rejected",
          message: action === "APPROVE"
            ? `${userName} approved the discount on quotation ${quotation.quotationNumber}. It can now be sent to the client.`
            : `${userName} rejected the discount on quotation ${quotation.quotationNumber}: ${rejectionReason || "No remarks provided"}`,
          type: "QUOTATION_UPDATE",
          link: `/quotations/${id}/preview`,
        }
      }).catch((err: any) => console.error("Failed to notify quotation owner", err))
    }

    return NextResponse.json({ success: true, quotation: updated })
  } catch (error: any) {
    console.error("Error in quotation approval API:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
