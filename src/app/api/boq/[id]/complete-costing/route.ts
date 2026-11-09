import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { canAccessBoq } from "@/lib/data-scope"
import { boqCostValues, boqUnitCost, priceFromMargin } from "@/lib/boq-costing"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    const userName = (session?.user as any)?.name || "Estimator"

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { items: updatedItems, notes: estimatorNotes } = body

    const boq = await prisma.boq.findUnique({
      where: { id },
      include: { preparedBy: true, items: true }
    })

    if (!boq || boq.deletedAt) {
      return NextResponse.json({ error: "BOQ not found" }, { status: 404 })
    }

    const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
    const isCreatorOrOwner = boq.preparedById === userId
    const isManagerOrAdmin = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_MANAGER"].includes(userRole)
    const isEstimator = userRole === "ESTIMATOR" || userRole === "COST_ESTIMATOR" || boq.estimatorId === userId
    const isRestrictedEstimator = isEstimator && !isCreatorOrOwner && !isManagerOrAdmin

    if (!isEstimator && !isManagerOrAdmin) {
      return NextResponse.json({ error: "Forbidden: Only the estimator or a manager can complete costing." }, { status: 403 })
    }
    if (!(await canAccessBoq(userId, boq.id))) {
      return NextResponse.json({ error: "Forbidden: You do not have access to this BOQ" }, { status: 403 })
    }
    // Costing can only be completed while the BOQ is with the estimator (managers may also re-save a completed costing)
    const costingStatuses = ["SENT_TO_ESTIMATOR", "COSTING_IN_PROGRESS", "PENDING_COSTING", "NEEDS_REVISION"]
    if (!costingStatuses.includes(boq.status) && !(boq.status === "COSTING_COMPLETED" && !isRestrictedEstimator)) {
      return NextResponse.json(
        { error: boq.status === "CONVERTED"
            ? "This BOQ was already converted to a quotation; its costing can't be changed."
            : "This BOQ hasn't been sent to the estimator yet." },
        { status: 409 }
      )
    }

    if (isRestrictedEstimator && boq.status === "COSTING_COMPLETED") {
      return NextResponse.json(
        { error: "Costing is already marked as completed for this BOQ. A costing revision must be requested by the creator before costing can be updated." },
        { status: 403 }
      )
    }

    let totalMaterialCost = 0
    let totalLaborCost = 0
    let totalInstallation = 0
    let totalTransport = 0
    let totalOverhead = 0
    let totalFactoryCost = 0
    let totalAccessoriesCost = 0
    let totalOutsourcingCost = 0
    let totalCost = 0
    let totalSellingPrice = 0

    const updatedBoq = await prisma.$transaction(async (tx) => {
      if (Array.isArray(updatedItems) && updatedItems.length > 0) {
        for (let idx = 0; idx < updatedItems.length; idx++) {
          const item = updatedItems[idx]

          // Match by item.id OR fallback to item.itemNo or boq.items[idx]?.id
          const targetItem = boq.items.find(bi => (item.id && bi.id === item.id) || bi.itemNo === (item.itemNo || idx + 1)) || boq.items[idx]
          const targetItemId = targetItem?.id || item.id
          if (!targetItemId) continue

          // The estimator supplies costs only; quantity and margin stay as the consultant set them
          const costs = boqCostValues(item)
          const instCost = parseFloat(item.installationCost) || 0
          const transCost = parseFloat(item.transportCost) || 0
          const baseCost = boqUnitCost(item)
          const qty = targetItem?.quantity || parseInt(item.quantity) || 1
          const marginPct = targetItem?.marginPercentage || 0

          // Costed lines are priced at cost plus the consultant's margin (0 until they set one)
          const unitSelling = baseCost > 0
            ? priceFromMargin(baseCost, marginPct)
            : (targetItem?.unitSellingPrice || parseFloat(item.unitSellingPrice ?? item.unitPrice) || 0)

          await tx.boqItem.update({
            where: { id: targetItemId },
            data: {
              ...costs,
              installationCost: instCost,
              transportCost: transCost,
              unitCost: baseCost,
              totalCost: baseCost * qty,
              marginPercentage: marginPct,
              negotiationPercentage: 0,
              negotiationAmount: 0,
              unitSellingPrice: unitSelling,
              totalSellingPrice: Number((unitSelling * qty).toFixed(2)),
            }
          })
        }
      }

      // Recalculate totals across ALL BOQ items (both costed and non-costed products)
      const allBoqItems = await tx.boqItem.findMany({
        where: { boqId: id },
        orderBy: { itemNo: "asc" }
      })

      for (const item of allBoqItems) {
        const qty = item.quantity || 1
        totalMaterialCost += (item.materialCost || 0) * qty
        totalLaborCost += (item.laborCost || 0) * qty
        totalInstallation += (item.installationCost || 0) * qty
        totalTransport += (item.transportCost || 0) * qty
        totalOverhead += (item.overheadCost || 0) * qty
        totalFactoryCost += (item.factoryCost || 0) * qty
        totalAccessoriesCost += (item.accessoriesCost || 0) * qty
        totalOutsourcingCost += (item.outsourcingCost || 0) * qty
        totalCost += item.totalCost || 0
        totalSellingPrice += item.totalSellingPrice || 0
      }

      const marginAmt = totalSellingPrice - totalCost

      return await tx.boq.update({
        where: { id },
        data: {
          status: "COSTING_COMPLETED",
          totalMaterialCost,
          totalLaborCost,
          totalInstallation,
          totalTransport,
          totalOverhead,
          totalFactoryCost,
          totalAccessoriesCost,
          totalOutsourcingCost,
          totalNegotiationAmount: 0,
          totalCost,
          marginAmount: marginAmt,
          totalSellingPrice,
          notes: estimatorNotes ? `[Estimator Notes]: ${estimatorNotes}\n\n${boq.notes || ""}` : boq.notes
        },
        include: {
          client: true,
          items: {
            include: {
              product: true
            },
            orderBy: { itemNo: "asc" }
          }
        }
      })
    })

    // Log completion activity
    await prisma.activityLog.create({
      data: {
        action: "COSTING_COMPLETED",
        entityType: "BOQ",
        entityId: boq.id,
        details: `Costing completed for BOQ ${boq.boqNumber} by ${userName}. Total Selling Price: AED ${totalSellingPrice.toFixed(2)}. Notified ${boq.preparedBy?.name || "Creator"}.`,
        userId: userId || boq.preparedById
      }
    })

    return NextResponse.json({ success: true, boq: updatedBoq })
  } catch (error: any) {
    console.error("Failed to mark costing completed:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
