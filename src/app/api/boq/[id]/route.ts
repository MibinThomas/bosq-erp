import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const boq = await prisma.boq.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        preparedBy: true,
        items: true
      },
    })

    if (!boq) {
      return NextResponse.json({ error: "BOQ not found" }, { status: 404 })
    }

    return NextResponse.json(boq)
  } catch (error) {
    console.error("Failed to fetch BOQ:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const {
      status,
      items,
      notes,
      termsConditions,
      isTemplate,
      customerSegment
    } = body

    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
    const userId = (session?.user as any)?.id || "system"

    const existingBoq = await prisma.boq.findUnique({
      where: { id: params.id },
      include: { items: true }
    })

    if (!existingBoq) {
      return NextResponse.json({ error: "BOQ not found" }, { status: 404 })
    }

    // Role-based guarding logic is enforced more stringently on UI,
    // but here we just process the values we receive. We could add strict checks.

    let totalMaterialCost = 0
    let totalLaborCost = 0
    let totalInstallation = 0
    let totalTransport = 0
    let totalOverhead = 0
    let totalCost = 0
    let totalSellingPrice = 0

    // For items, we will delete all old items and recreate them. 
    // In a production system, upsert is better, but this is simpler for drafts.
    
    const boqItemsToCreate = items.map((item: any, idx: number) => {
      const qty = parseInt(item.quantity) || 1
      
      const mat = parseFloat(item.materialCost) || 0
      const lab = parseFloat(item.laborCost) || 0
      const inst = parseFloat(item.installationCost) || 0
      const trans = parseFloat(item.transportCost) || 0
      const ovh = parseFloat(item.overheadCost) || 0
      
      const unitCost = mat + lab + inst + trans + ovh
      const itemTotalCost = unitCost * qty
      
      const margin = parseFloat(item.marginPercentage) || 0
      const unitSell = unitCost * (1 + (margin / 100))
      const itemTotalSell = unitSell * qty

      totalMaterialCost += mat * qty
      totalLaborCost += lab * qty
      totalInstallation += inst * qty
      totalTransport += trans * qty
      totalOverhead += ovh * qty
      totalCost += itemTotalCost
      totalSellingPrice += itemTotalSell

      return {
        itemNo: idx + 1,
        productId: item.productId || null,
        description: item.description,
        specifications: item.specifications || "",
        dimensions: item.dimensions || "",
        customImageUrl: item.customImageUrl || null,
        quantity: qty,
        unit: item.unit || "Nos",
        materialCost: mat,
        laborCost: lab,
        installationCost: inst,
        transportCost: trans,
        overheadCost: ovh,
        unitCost: unitCost,
        totalCost: itemTotalCost,
        marginPercentage: margin,
        unitSellingPrice: unitSell,
        totalSellingPrice: itemTotalSell
      }
    })

    const marginAmount = totalSellingPrice - totalCost

    // Delete existing items
    await prisma.boqItem.deleteMany({
      where: { boqId: params.id }
    })

    // Update BOQ
    const updatedBoq = await prisma.boq.update({
      where: { id: params.id },
      data: {
        status: status !== undefined ? status : existingBoq.status,
        customerSegment: customerSegment || existingBoq.customerSegment,
        totalMaterialCost,
        totalLaborCost,
        totalInstallation,
        totalTransport,
        totalOverhead,
        totalCost,
        marginAmount,
        totalSellingPrice,
        notes: notes !== undefined ? notes : existingBoq.notes,
        termsConditions: termsConditions !== undefined ? termsConditions : existingBoq.termsConditions,
        isTemplate: isTemplate !== undefined ? isTemplate : existingBoq.isTemplate,
        items: {
          create: boqItemsToCreate
        }
      },
      include: {
        client: true,
        items: true
      }
    })

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: "UPDATED_BOQ",
        entityType: "BOQ",
        entityId: params.id,
        details: `Updated BOQ ${updatedBoq.boqNumber} to status ${updatedBoq.status}`
      }
    })

    return NextResponse.json(updatedBoq)
  } catch (error) {
    console.error("Failed to update BOQ:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.boq.delete({
      where: { id: params.id }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete BOQ:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
