import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

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

    let totalMaterialCost = 0
    let totalLaborCost = 0
    let totalInstallation = 0
    let totalTransport = 0
    let totalOverhead = 0
    let totalCost = 0
    let totalSellingPrice = 0

    const updatedBoq = await prisma.$transaction(async (tx) => {
      if (Array.isArray(updatedItems) && updatedItems.length > 0) {
        for (const item of updatedItems) {
          const matCost = parseFloat(item.materialCost) || 0
          const labCost = parseFloat(item.laborCost) || 0
          const instCost = parseFloat(item.installationCost) || 0
          const transCost = parseFloat(item.transportCost) || 0
          const overCost = parseFloat(item.overheadCost) || 0
          const qty = parseInt(item.quantity) || 1

          const unitCost = matCost + labCost + instCost + transCost + overCost
          const itemTotalCost = unitCost * qty
          const marginPct = parseFloat(item.marginPercentage) || parseFloat(item.margin) || 0

          let basePrice = parseFloat(item.basePrice) || unitCost
          let unitSelling = parseFloat(item.unitSellingPrice) || parseFloat(item.unitPrice) || 0
          if (unitSelling === 0 && unitCost > 0) {
            const marginDec = Math.min(0.9999, marginPct / 100)
            unitSelling = Number((unitCost / (1 - marginDec)).toFixed(2))
          } else if (unitSelling === 0 && basePrice > 0) {
            const marginDec = Math.min(0.9999, marginPct / 100)
            unitSelling = Number((basePrice / (1 - marginDec)).toFixed(2))
          }
          const itemTotalSelling = Number((unitSelling * qty).toFixed(2))

          totalMaterialCost += matCost * qty
          totalLaborCost += labCost * qty
          totalInstallation += instCost * qty
          totalTransport += transCost * qty
          totalOverhead += overCost * qty
          totalCost += itemTotalCost
          totalSellingPrice += itemTotalSelling

          if (item.id) {
            await tx.boqItem.update({
              where: { id: item.id },
              data: {
                materialCost: matCost,
                laborCost: labCost,
                installationCost: instCost,
                transportCost: transCost,
                overheadCost: overCost,
                unitCost,
                totalCost: itemTotalCost,
                marginPercentage: marginPct,
                unitSellingPrice: unitSelling,
                totalSellingPrice: itemTotalSelling,
              }
            })
          }
        }
      } else {
        // Fallback: sum from existing items
        for (const item of boq.items) {
          totalMaterialCost += (item.materialCost || 0) * item.quantity
          totalLaborCost += (item.laborCost || 0) * item.quantity
          totalInstallation += (item.installationCost || 0) * item.quantity
          totalTransport += (item.transportCost || 0) * item.quantity
          totalOverhead += (item.overheadCost || 0) * item.quantity
          totalCost += item.totalCost || 0
          totalSellingPrice += item.totalSellingPrice || 0
        }
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
          totalCost,
          marginAmount: marginAmt,
          totalSellingPrice,
          notes: estimatorNotes ? `[Estimator Notes]: ${estimatorNotes}\n\n${boq.notes || ""}` : boq.notes
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
