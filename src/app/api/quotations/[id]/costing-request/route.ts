import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    const logUserId = (session?.user as any)?.id || ""

    const body = await request.json()
    const { itemIds, estimatorId, notes } = body

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: "Please select at least one item to send for costing." },
        { status: 400 }
      )
    }

    const quotation = await prisma.quotation.findFirst({
      where: {
        OR: [{ id: id }, { quotationNumber: id }]
      },
      include: { items: true }
    })

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 })
    }

    // Update selected quotation items to PENDING_COSTING
    await prisma.quotationItem.updateMany({
      where: {
        id: { in: itemIds },
        quotationId: quotation.id
      },
      data: {
        costingStatus: "PENDING_COSTING",
        estimatorId: estimatorId || null,
        costingRequestedAt: new Date(),
        estimatorNotes: notes || null
      }
    })

    // Check all items to compute overall quotation costing status
    const allItems = await prisma.quotationItem.findMany({
      where: { quotationId: quotation.id }
    })

    const pendingCount = allItems.filter((i: any) => i.costingStatus === "PENDING_COSTING" || i.costingStatus === "COSTING_IN_PROGRESS").length
    const completedCount = allItems.filter((i: any) => i.costingStatus === "COSTING_COMPLETED").length
    
    let overallCostingStatus = "NONE"
    if (pendingCount > 0 && completedCount > 0) {
      overallCostingStatus = "PARTIALLY_COSTED"
    } else if (pendingCount > 0) {
      overallCostingStatus = "PENDING_COSTING"
    } else if (completedCount > 0 && completedCount === allItems.length) {
      overallCostingStatus = "COSTING_COMPLETED"
    } else if (completedCount > 0) {
      overallCostingStatus = "PARTIALLY_COSTED"
    }

    await prisma.quotation.update({
      where: { id: quotation.id },
      data: {
        costingStatus: overallCostingStatus,
        assignedEstimatorId: estimatorId || quotation.assignedEstimatorId
      }
    })

    // Create activity log for Quotation Journey timeline
    let estimatorName = "Cost Estimator"
    if (estimatorId) {
      const estimatorUser = await prisma.user.findUnique({ where: { id: estimatorId } })
      if (estimatorUser?.name) estimatorName = estimatorUser.name
    }

    if (logUserId) {
      await prisma.activityLog.create({
        data: {
          action: "COSTING_REQUESTED",
          entityType: "QUOTATION",
          entityId: quotation.id,
          details: `Sent ${itemIds.length} product item(s) for costing to ${estimatorName}.${notes ? ` Notes: ${notes}` : ""}`,
          userId: logUserId
        }
      })
    }

    const updatedQuotation = await prisma.quotation.findUnique({
      where: { id: quotation.id },
      include: {
        items: true,
        client: true,
        preparedBy: true,
        assignedEstimator: true
      }
    })

    return NextResponse.json(updatedQuotation)
  } catch (error: any) {
    console.error("Costing request error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process costing request" },
      { status: 500 }
    )
  }
}
