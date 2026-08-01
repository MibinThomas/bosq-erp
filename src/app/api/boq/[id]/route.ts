import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { hasPermission, checkOwnership } from "@/lib/rbac"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as any).id

    // Phase 1 block removed, RBAC will handle permissions

    const canView = await hasPermission(userId, "BOQS", "view")
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view BOQs" }, { status: 403 })
    }

    const boq = await prisma.boq.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            assignments: true
          }
        },
        preparedBy: true,
        items: true
      },
    })

    if (!boq) {
      return NextResponse.json({ error: "BOQ not found" }, { status: 404 })
    }

    // Enforce ownership rule check
    const isOwner = await checkOwnership(
      userId,
      "BOQS",
      boq.preparedById,
      boq.preparedBy?.department || undefined,
      boq.client?.assignments?.map(a => a.userId) || undefined
    )
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden: You do not have ownership access to this BOQ" }, { status: 403 })
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as any).id

    // Phase 1 block removed, RBAC will handle permissions

    const canEdit = await hasPermission(userId, "BOQS", "edit")
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to edit BOQs" }, { status: 403 })
    }

    const existingBoq = await prisma.boq.findUnique({
      where: { id },
      include: { 
        items: true,
        preparedBy: true,
        client: {
          include: {
            assignments: true
          }
        }
      }
    })

    if (!existingBoq) {
      return NextResponse.json({ error: "BOQ not found" }, { status: 404 })
    }

    // Enforce ownership check for edit operations
    const isOwner = await checkOwnership(
      userId,
      "BOQS",
      existingBoq.preparedById,
      existingBoq.preparedBy?.department || undefined,
      existingBoq.client?.assignments?.map(a => a.userId) || undefined
    )
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden: You do not have ownership access to edit this BOQ" }, { status: 403 })
    }

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
      
      const margin = Math.min(99.99, parseFloat(item.marginPercentage) || 0)
      const unitSell = unitCost / (1 - (margin / 100))
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
      where: { boqId: id }
    })

    // Update BOQ
    const updatedBoq = await prisma.boq.update({
      where: { id },
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
        entityId: id,
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as any).id

    // Phase 1 block removed, RBAC will handle permissions

    const canDelete = await hasPermission(userId, "BOQS", "delete")
    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to delete BOQs" }, { status: 403 })
    }

    const existingBoq = await prisma.boq.findUnique({
      where: { id },
      include: {
        preparedBy: true,
        client: {
          include: {
            assignments: true
          }
        }
      }
    })

    if (!existingBoq) {
      return NextResponse.json({ error: "BOQ not found" }, { status: 404 })
    }

    const isOwner = await checkOwnership(
      userId,
      "BOQS",
      existingBoq.preparedById,
      existingBoq.preparedBy?.department || undefined,
      existingBoq.client?.assignments?.map(a => a.userId) || undefined
    )
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden: You do not have ownership access to delete this BOQ" }, { status: 403 })
    }

    await prisma.boq.delete({
      where: { id }
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
