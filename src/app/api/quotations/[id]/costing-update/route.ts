import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    const logUserId = (session?.user as any)?.id || ""

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
        OR: [{ id: id }, { quotationNumber: id }]
      },
      include: { items: true, client: true }
    })

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 })
    }

    // Process each item costing update
    for (const itemUpdate of items) {
      const existingItem = quotation.items.find((i: any) => i.id === itemUpdate.id)
      if (!existingItem) continue

      const matCost = Number(itemUpdate.materialCost ?? existingItem.materialCost ?? 0)
      const labCost = Number(itemUpdate.laborCost ?? existingItem.laborCost ?? 0)
      const overCost = Number(itemUpdate.overheadCost ?? existingItem.overheadCost ?? 0)
      const transCost = Number(itemUpdate.transportCost ?? existingItem.transportCost ?? 0)
      const instCost = Number(itemUpdate.installationCost ?? existingItem.installationCost ?? 0)
      const marginPct = Number(itemUpdate.marginPercentage ?? existingItem.marginPercentage ?? 0)

      const computedUnitCost = matCost + labCost + overCost + transCost + instCost
      
      let computedUnitPrice = Number(itemUpdate.unitPrice ?? existingItem.unitPrice ?? 0)
      if (itemUpdate.unitPrice === undefined && computedUnitCost > 0 && marginPct > 0 && marginPct < 100) {
        computedUnitPrice = Math.round((computedUnitCost / (1 - marginPct / 100)) * 100) / 100
      } else if (itemUpdate.unitPrice === undefined && computedUnitCost > 0 && computedUnitPrice === 0) {
        computedUnitPrice = computedUnitCost
      }

      const qty = existingItem.quantity || 1
      const disc = existingItem.discount || 0
      const computedAmount = Math.max(0, (computedUnitPrice - disc) * qty)

      const estimatorPrice = computedUnitPrice
      const consultantPrice = computedUnitPrice - disc
      const discountAmt = Math.max(0, disc)
      const discountPct = estimatorPrice > 0 ? (discountAmt / estimatorPrice) * 100 : 0

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
          unitPrice: computedUnitPrice,
          amount: computedAmount,
          estimatorUnitPrice: estimatorPrice,
          consultantDiscountAmount: discountAmt,
          consultantDiscountPct: discountPct,
          costingStatus: itemUpdate.costingStatus || "COSTING_COMPLETED",
          estimatorNotes: itemUpdate.estimatorNotes ?? existingItem.estimatorNotes,
          costingCompletedAt: new Date(),
          estimatorId: logUserId || existingItem.estimatorId
        }
      })
    }

    // Recalculate quotation grand totals & discount audit metrics
    const allItems = await prisma.quotationItem.findMany({
      where: { quotationId: quotation.id }
    })

    const newSubtotal = allItems.reduce((acc: number, item: any) => acc + item.amount, 0)
    let vatPct = 0.05
    const vatAmt = quotation.vatMode === "EXCLUDING" ? newSubtotal * vatPct : 0
    const newGrandTotal = newSubtotal + vatAmt + (quotation.deliveryCharge || 0)

    // Calculate Managerial Discount & Approval Audit Metrics
    let totalEstRev = 0
    let totalDiscAmt = 0
    let maxItemDiscountPct = 0

    allItems.forEach((i: any) => {
      const qty = i.quantity || 1
      const estPrice = i.estimatorUnitPrice > 0 ? i.estimatorUnitPrice : i.unitPrice
      const discAmt = i.consultantDiscountAmount || 0
      const discPct = i.consultantDiscountPct || 0

      totalEstRev += estPrice * qty
      totalDiscAmt += discAmt * qty
      if (discPct > maxItemDiscountPct) maxItemDiscountPct = discPct
    })

    const overallDiscountPct = totalEstRev > 0 ? (totalDiscAmt / totalEstRev) * 100 : 0

    // Automatic Approval Routing Matrix
    let approvalStatus = "AUTO_APPROVED"
    if (maxItemDiscountPct > 20 || overallDiscountPct > 20) {
      approvalStatus = "PENDING_GM_APPROVAL"
    } else if (maxItemDiscountPct > 10 || overallDiscountPct > 10) {
      approvalStatus = "PENDING_MANAGER_APPROVAL"
    } else if (maxItemDiscountPct > 0 || overallDiscountPct > 0) {
      approvalStatus = "PENDING_IDC_APPROVAL"
    }

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
        vatAmount: vatAmt,
        grandTotal: newGrandTotal,
        costingStatus: overallCostingStatus,
        totalEstimatorSellingPrice: totalEstRev,
        totalConsultantDiscountAmount: totalDiscAmt,
        overallDiscountPercentage: overallDiscountPct,
        maxDiscountPercentage: maxItemDiscountPct,
        approvalStatus: approvalStatus,
        costingCompletedAt: overallCostingStatus === "COSTING_COMPLETED" ? (quotation.costingCompletedAt || new Date()) : quotation.costingCompletedAt,
        costedById: overallCostingStatus === "COSTING_COMPLETED" ? (logUserId || quotation.costedById) : quotation.costedById
      }
    })

    // Log event in Quotation Journey timeline
    if (logUserId) {
      const userObj = await prisma.user.findUnique({ where: { id: logUserId } })
      const estimatorName = userObj?.name || "Cost Estimator"
      await prisma.activityLog.create({
        data: {
          action: "COSTING_COMPLETED",
          entityType: "QUOTATION",
          entityId: quotation.id,
          details: `Cost Estimator (${estimatorName}) updated pricing & approved costing for ${items.length} item(s). New Grand Total: AED ${newGrandTotal.toLocaleString()}`,
          userId: logUserId
        }
      })
    }

    // Send Notification to Quotation Creator that costing has been completed and items are ready for review
    if (quotation.preparedById) {
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
        preparedBy: true,
        assignedEstimator: true
      }
    })

    return NextResponse.json(updatedQuotation)
  } catch (error: any) {
    console.error("Costing update error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update costing" },
      { status: 500 }
    )
  }
}
