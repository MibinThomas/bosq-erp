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
    const userId = (session?.user as any)?.id
    const userName = (session?.user as any)?.name || "Estimator"

    const body = await request.json().catch(() => ({}))
    const { items: updatedItems, notes: estimatorNotes } = body

    const boq = await prisma.boq.findUnique({
      where: { id },
      include: { preparedBy: true, items: true }
    })

    if (!boq) {
      return NextResponse.json({ error: "BOQ not found" }, { status: 404 })
    }

    const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
    const isCreatorOrOwner = boq.preparedById === userId
    const isManagerOrAdmin = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_MANAGER"].includes(userRole)
    const isEstimator = userRole === "ESTIMATOR" || userRole === "COST_ESTIMATOR" || boq.estimatorId === userId
    const isRestrictedEstimator = isEstimator && !isCreatorOrOwner && !isManagerOrAdmin

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
    let totalCost = 0
    let totalSellingPrice = 0

    const updatedBoq = await prisma.$transaction(async (tx) => {
      if (Array.isArray(updatedItems) && updatedItems.length > 0) {
        for (let idx = 0; idx < updatedItems.length; idx++) {
          const item = updatedItems[idx]
          const factoryCost = parseFloat(item.factoryCost) || 0
          const accessoriesCost = parseFloat(item.accessoriesCost) || 0
          const matCost = parseFloat(item.materialCost) || 0
          const labCost = parseFloat(item.laborCost) || 0
          const instCost = parseFloat(item.installationCost) || 0
          const transCost = parseFloat(item.transportCost) || 0
          const overCost = parseFloat(item.overheadCost) || 0
          const qty = parseInt(item.quantity) || 1

          const legacyUnitCost = matCost + labCost + instCost + transCost + overCost
          const baseCost = (factoryCost > 0 || accessoriesCost > 0) ? (factoryCost + accessoriesCost) : legacyUnitCost
          const itemTotalCost = baseCost * qty

          const marginPct = parseFloat(item.marginPercentage ?? item.margin) || 0
          const preNegPrice = baseCost > 0 ? Number((baseCost / (1 - Math.min(0.9999, marginPct / 100))).toFixed(2)) : 0

          let negPct = parseFloat(item.negotiationPercentage ?? item.negotiationPct) || 0
          let negAmt = parseFloat(item.negotiationAmount ?? item.negotiationAdj) || 0

          if (negPct > 0 && (!item.negotiationAmount || parseFloat(item.negotiationAmount) === 0)) {
            const negDec = Math.min(0.9999, negPct / 100)
            const priceAfterNeg = preNegPrice > 0 ? (preNegPrice / (1 - negDec)) : 0
            negAmt = preNegPrice > 0 ? Number((priceAfterNeg - preNegPrice).toFixed(2)) : 0
          } else if (negAmt > 0 && negPct === 0 && preNegPrice > 0) {
            const finalPrice = preNegPrice + negAmt
            negPct = finalPrice > 0 ? Number(((1 - (preNegPrice / finalPrice)) * 100).toFixed(2)) : 0
          }

          let unitSelling = parseFloat(item.unitSellingPrice ?? item.unitPrice)
          if (isNaN(unitSelling) || unitSelling <= 0 || (baseCost > 0 && (marginPct !== 0 || negAmt !== 0 || negPct !== 0))) {
            const negDec = Math.min(0.9999, negPct / 100)
            unitSelling = preNegPrice > 0 ? Number((preNegPrice / (1 - negDec)).toFixed(2)) : Number((preNegPrice + negAmt).toFixed(2))
          }

          const itemTotalSelling = Number((unitSelling * qty).toFixed(2))

          // Match by item.id OR fallback to item.itemNo or boq.items[idx]?.id
          const targetItem = boq.items.find(bi => (item.id && bi.id === item.id) || bi.itemNo === (item.itemNo || idx + 1)) || boq.items[idx]
          const targetItemId = targetItem?.id || item.id

          if (targetItemId) {
            await tx.boqItem.update({
              where: { id: targetItemId },
              data: {
                factoryCost,
                accessoriesCost,
                materialCost: matCost,
                laborCost: labCost,
                installationCost: instCost,
                transportCost: transCost,
                overheadCost: overCost,
                unitCost: baseCost,
                totalCost: itemTotalCost,
                marginPercentage: marginPct,
                negotiationPercentage: negPct,
                negotiationAmount: negAmt,
                unitSellingPrice: unitSelling,
                totalSellingPrice: itemTotalSelling,
              }
            })
          }
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
