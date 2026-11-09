import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { canUseCosting } from "@/lib/costing-access"
import { canAccessQuotation } from "@/lib/data-scope"
import { computeQuotationTotals } from "@/lib/quotation-totals"
import { computeApprovalMetrics, lineApprovalFields } from "@/lib/approval-policy"
import { applyQuotationApproval, approvalDataFor, decideQuotationApproval } from "@/lib/approval-engine"

const num = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    const logUserId = (session?.user as any)?.id as string | undefined
    if (!logUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!(await canUseCosting({ id: logUserId }))) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to update costing" }, { status: 403 })
    }

    const body = await request.json()
    const { items } = body // Array of item costing updates

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "No item costing data provided." },
        { status: 400 }
      )
    }

    const quotation = await prisma.quotation.findFirst({
      where: {
        OR: [{ id: id }, { quotationNumber: id }],
        deletedAt: null
      },
      include: { items: true, client: true }
    })

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 })
    }
    const sessionRole = ((session?.user as any)?.role || "") as string
    if (!(await canAccessQuotation({ id: logUserId, role: sessionRole }, quotation.id))) {
      return NextResponse.json({ error: "Forbidden: You do not have access to this quotation." }, { status: 403 })
    }

    // Process each item costing update
    let completedNow = 0
    for (const itemUpdate of items) {
      const existingItem = quotation.items.find((i: any) => i.id === itemUpdate.id)
      if (!existingItem) continue

      const pick = (key: string, fallback: number | null | undefined) => {
        const v = num(itemUpdate[key])
        return v !== undefined && v >= 0 ? v : (fallback ?? 0)
      }
      const matCost = pick("materialCost", existingItem.materialCost)
      const labCost = pick("laborCost", existingItem.laborCost)
      const overCost = pick("overheadCost", existingItem.overheadCost)
      const transCost = pick("transportCost", existingItem.transportCost)
      const instCost = pick("installationCost", existingItem.installationCost)
      const marginPct = Math.min(pick("marginPercentage", existingItem.marginPercentage), 99.9)
      const negotiationPct = Math.min(pick("negotiationPct", existingItem.negotiationPct), 99.9)

      const computedUnitCost = matCost + labCost + overCost + transCost + instCost

      // A line without costs keeps its current selling price — never price it at 0
      const sentPrice = num(itemUpdate.unitPrice)
      let computedUnitPrice = existingItem.unitPrice || 0
      if (sentPrice !== undefined && sentPrice > 0) {
        computedUnitPrice = sentPrice
      } else if (computedUnitCost > 0) {
        computedUnitPrice = marginPct > 0
          ? Math.round((computedUnitCost / (1 - marginPct / 100)) * 100) / 100
          : computedUnitCost
      }

      const status = itemUpdate.costingStatus || existingItem.costingStatus || "COSTING_IN_PROGRESS"
      if (status === "COSTING_COMPLETED" && !(computedUnitPrice > 0)) {
        return NextResponse.json(
          { error: `Line #${existingItem.itemNo} has no selling price. Enter its costs before completing the costing.` },
          { status: 400 }
        )
      }
      const isCompleted = status === "COSTING_COMPLETED"
      if (isCompleted && existingItem.costingStatus !== "COSTING_COMPLETED") completedNow++

      const qty = existingItem.quantity || 1
      const disc = existingItem.discount || 0
      const computedAmount = Math.max(0, (computedUnitPrice - disc) * qty)

      const approvalFields = lineApprovalFields({ unitPrice: computedUnitPrice, discount: disc, estimatorUnitPrice: computedUnitPrice })

      await prisma.quotationItem.update({
        where: { id: existingItem.id },
        data: {
          materialCost: matCost,
          laborCost: labCost,
          overheadCost: overCost,
          transportCost: transCost,
          installationCost: instCost,
          unitCost: computedUnitCost,
          marginPercentage: marginPct,
          negotiationPct,
          unitPrice: computedUnitPrice,
          amount: computedAmount,
          ...approvalFields,
          costingStatus: status,
          estimatorNotes: itemUpdate.estimatorNotes ?? existingItem.estimatorNotes,
          // Only a completed costing is stamped as done by this estimator
          costingCompletedAt: isCompleted ? (existingItem.costingCompletedAt || new Date()) : existingItem.costingCompletedAt,
          estimatorId: computedUnitCost > 0 ? logUserId : existingItem.estimatorId
        }
      })
    }

    // Recalculate quotation totals with the same formula as create/update
    const allItems = await prisma.quotationItem.findMany({
      where: { quotationId: quotation.id }
    })

    const newSubtotal = allItems.reduce((acc: number, item: any) => acc + item.amount, 0)
    const totals = computeQuotationTotals({
      subtotal: newSubtotal,
      additionalCharges: quotation.additionalCharges,
      specialDiscountType: quotation.specialDiscountType,
      specialDiscountValue: quotation.specialDiscountValue,
      vatMode: quotation.vatMode
    })

    // Discount approval audit and routing (shared policy with create/update)
    const approvalMetrics = computeApprovalMetrics(allItems, totals.appliedDiscountPercent)
    const approvalDecision = await decideQuotationApproval({
      historyDocumentIds: [quotation.id],
      metrics: approvalMetrics,
      amount: totals.grandTotal,
      customerSegment: quotation.customerSegment,
      preparedById: quotation.preparedById,
      projectName: quotation.projectName,
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
        subtotal: newSubtotal,
        discount: totals.discountAmt,
        vatAmount: totals.vatAmount,
        grandTotal: totals.grandTotal,
        costingStatus: overallCostingStatus,
        ...approvalDataFor(approvalDecision, approvalMetrics),
        costingCompletedAt: overallCostingStatus === "COSTING_COMPLETED" ? (quotation.costingCompletedAt || new Date()) : quotation.costingCompletedAt,
        costedById: overallCostingStatus === "COSTING_COMPLETED" ? (logUserId || quotation.costedById) : quotation.costedById
      }
    })

    await applyQuotationApproval({
      quotationId: quotation.id,
      quotationNumber: quotation.quotationNumber,
      decision: approvalDecision,
      requestedById: quotation.preparedById,
      openRequest: quotation.status !== "DRAFT",
    })

    // Log event in Quotation Journey timeline
    const userObj = await prisma.user.findUnique({ where: { id: logUserId }, select: { name: true } })
    const estimatorName = userObj?.name || "Cost Estimator"
    await prisma.activityLog.create({
      data: {
        action: completedNow > 0 ? "COSTING_COMPLETED" : "COSTING_UPDATED",
        entityType: "QUOTATION",
        entityId: quotation.id,
        details: completedNow > 0
          ? `Cost Estimator (${estimatorName}) completed costing for ${completedNow} item(s). New Grand Total: AED ${totals.grandTotal.toLocaleString()}`
          : `Cost Estimator (${estimatorName}) saved costing progress. Grand Total: AED ${totals.grandTotal.toLocaleString()}`,
        userId: logUserId
      }
    })

    // Tell the quotation creator only when the costing has just been completed
    const justCompleted = overallCostingStatus === "COSTING_COMPLETED" && quotation.costingStatus !== "COSTING_COMPLETED"
    if (quotation.preparedById && justCompleted) {
      await prisma.notification.create({
        data: {
          userId: quotation.preparedById,
          title: "Costing Completed",
          message: `Costing for quotation ${quotation.quotationNumber} has been completed and the items are ready for your review.`,
          type: "COSTING_COMPLETED",
          link: `/quotations/${quotation.id}/preview`
        }
      })
    }

    const updatedQuotation = await prisma.quotation.findUnique({
      where: { id: quotation.id },
      include: {
        items: true,
        client: true,
        preparedBy: { select: { id: true, name: true, email: true, role: true } },
        assignedEstimator: { select: { id: true, name: true, email: true } }
      }
    })

    return NextResponse.json(updatedQuotation)
  } catch (error: any) {
    console.error("Costing update error:", error)
    return NextResponse.json(
      { error: "Failed to update costing" },
      { status: 500 }
    )
  }
}
