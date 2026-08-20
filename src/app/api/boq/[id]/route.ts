import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
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
        estimator: true,
        items: {
          include: {
            product: {
              include: {
                category: true
              }
            }
          }
        }
      },
    })

    if (!boq) {
      return NextResponse.json({ error: "BOQ not found" }, { status: 404 })
    }

    // Enforce ownership rule check
    const assignedUserIds = [
      ...(boq.client?.assignments?.map(a => a.userId) || []),
      ...(boq.estimatorId ? [boq.estimatorId] : [])
    ]
    const isOwner = await checkOwnership(
      userId,
      "BOQS",
      boq.preparedById,
      boq.preparedBy?.department || undefined,
      assignedUserIds
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
    const assignedUserIds = [
      ...(existingBoq.client?.assignments?.map(a => a.userId) || []),
      ...(existingBoq.estimatorId ? [existingBoq.estimatorId] : [])
    ]
    const isOwner = await checkOwnership(
      userId,
      "BOQS",
      existingBoq.preparedById,
      existingBoq.preparedBy?.department || undefined,
      assignedUserIds
    )
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden: You do not have ownership access to edit this BOQ" }, { status: 403 })
    }

    let totalMaterialCost = 0
    let totalLaborCost = 0
    let totalInstallation = 0
    let totalTransport = 0
    let totalOverhead = 0
    let totalFactoryCost = 0
    let totalAccessoriesCost = 0
    let totalNegotiationAmount = 0
    let totalCost = 0
    let totalSellingPrice = 0

    // For items, we will delete all old items and recreate them. 
    // In a production system, upsert is better, but this is simpler for drafts.
    
    const userRole = (session.user as any).role || "SALES_EXECUTIVE"
    const isCreatorOrOwner = existingBoq.preparedById === userId
    const isManagerOrAdmin = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_MANAGER"].includes(userRole)
    const isEstimator = userRole === "ESTIMATOR" || userRole === "COST_ESTIMATOR" || existingBoq.estimatorId === userId
    const isRestrictedEstimator = isEstimator && !isCreatorOrOwner && !isManagerOrAdmin

    const activeCostingStatuses = ["SENT_TO_ESTIMATOR", "COSTING_IN_PROGRESS", "PENDING_COSTING", "NEEDS_REVISION"]
    const isLockedStatus = activeCostingStatuses.includes(existingBoq.status)
    if (!isEstimator && isLockedStatus) {
      return NextResponse.json(
        { error: "This BOQ is currently with the Estimator for costing. You cannot edit it until costing is completed." },
        { status: 403 }
      )
    }

    // Estimators cannot edit BOQ once costing is completed unless a revision is requested by creator
    if (isRestrictedEstimator && !activeCostingStatuses.includes(existingBoq.status)) {
      return NextResponse.json(
        { error: "Costing has been completed for this BOQ. It is no longer editable by the estimator unless a costing revision is requested by the BOQ creator." },
        { status: 403 }
      )
    }

    // Enforce restriction: estimators cannot add products to BOQs created by other users
    if (isRestrictedEstimator && items && Array.isArray(items)) {
      const existingIds = new Set(existingBoq.items.map((i: any) => i.id))
      const hasNewItems = items.some((i: any) => i.id && !existingIds.has(i.id))

      if (hasNewItems) {
        return NextResponse.json(
          { error: "Forbidden: Estimators are restricted from adding products in BOQs created by other users." },
          { status: 403 }
        )
      }
    }

    // If estimator, preserve all existing BOQ items from DB and merge cost updates
    const sourceItems = isEstimator ? existingBoq.items : items;

    const boqItemsToCreate = sourceItems.map((sourceItem: any, idx: number) => {
      // Find the corresponding incoming item if we are mapping over existing items (for estimator)
      const incomingItem = isEstimator ? (items.find((i: any) => i.id === sourceItem.id || i.itemNo === sourceItem.itemNo) || sourceItem) : sourceItem;

      // If estimator, they can only update cost fields, and ONLY if isCostingRequired is true.
      // Otherwise, cost fields remain unchanged from the database.
      const canEditCost = isEstimator ? sourceItem.isCostingRequired === true : true;

      const qty = parseInt(isEstimator ? sourceItem.quantity : incomingItem.quantity) || 1
      
      const factory = canEditCost ? (parseFloat(incomingItem.factoryCost) || 0) : (parseFloat(sourceItem.factoryCost) || 0)
      const accessories = canEditCost ? (parseFloat(incomingItem.accessoriesCost) || 0) : (parseFloat(sourceItem.accessoriesCost) || 0)

      const mat = canEditCost ? (parseFloat(incomingItem.materialCost) || 0) : (parseFloat(sourceItem.materialCost) || 0)
      const lab = canEditCost ? (parseFloat(incomingItem.laborCost) || 0) : (parseFloat(sourceItem.laborCost) || 0)
      const inst = canEditCost ? (parseFloat(incomingItem.installationCost) || 0) : (parseFloat(sourceItem.installationCost) || 0)
      const trans = canEditCost ? (parseFloat(incomingItem.transportCost) || 0) : (parseFloat(sourceItem.transportCost) || 0)
      const ovh = canEditCost ? (parseFloat(incomingItem.overheadCost) || 0) : (parseFloat(sourceItem.overheadCost) || 0)
      
      const legacyUnitCost = mat + lab + inst + trans + ovh
      const baseCost = (factory > 0 || accessories > 0) ? (factory + accessories) : (parseFloat(incomingItem.basePrice) || legacyUnitCost)
      const itemTotalCost = baseCost * qty

      // Margin and selling price calculation
      const margin = isEstimator ? (parseFloat(sourceItem.marginPercentage) || 0) : Math.min(99.99, parseFloat(incomingItem.marginPercentage ?? incomingItem.margin) || 0)
      const preNegPrice = baseCost > 0 ? Number((baseCost / (1 - Math.min(0.9999, margin / 100))).toFixed(2)) : 0

      let negPct = parseFloat(incomingItem.negotiationPercentage ?? incomingItem.negotiationPct) || 0
      let negAmt = parseFloat(incomingItem.negotiationAmount ?? incomingItem.negotiationAdj) || 0

      if (negPct > 0 && (!incomingItem.negotiationAmount || parseFloat(incomingItem.negotiationAmount) === 0)) {
        const negDec = Math.min(0.9999, negPct / 100)
        const priceAfterNeg = preNegPrice > 0 ? (preNegPrice / (1 - negDec)) : 0
        negAmt = preNegPrice > 0 ? Number((priceAfterNeg - preNegPrice).toFixed(2)) : 0
      } else if (negAmt > 0 && negPct === 0 && preNegPrice > 0) {
        const finalPrice = preNegPrice + negAmt
        negPct = finalPrice > 0 ? Number(((1 - (preNegPrice / finalPrice)) * 100).toFixed(2)) : 0
      }

      let unitSell = parseFloat(incomingItem.unitSellingPrice ?? incomingItem.unitPrice)
      if (isNaN(unitSell) || unitSell <= 0) {
        const negDec = Math.min(0.9999, negPct / 100)
        unitSell = preNegPrice > 0 ? Number((preNegPrice / (1 - negDec)).toFixed(2)) : Number((preNegPrice + negAmt).toFixed(2))
      }
      const itemTotalSell = unitSell * qty

      totalFactoryCost += factory * qty
      totalAccessoriesCost += accessories * qty
      totalNegotiationAmount += negAmt * qty

      totalMaterialCost += mat * qty
      totalLaborCost += lab * qty
      totalInstallation += inst * qty
      totalTransport += trans * qty
      totalOverhead += ovh * qty
      totalCost += itemTotalCost
      totalSellingPrice += itemTotalSell

      return {
        itemNo: idx + 1,
        type: isEstimator ? sourceItem.type : (incomingItem.type || "custom"),
        isCostingRequired: isEstimator ? sourceItem.isCostingRequired : (incomingItem.isCostingRequired === true),
        productId: isEstimator ? sourceItem.productId : (incomingItem.productId || null),
        description: isEstimator ? sourceItem.description : incomingItem.description,
        specifications: isEstimator ? sourceItem.specifications : (incomingItem.specifications || ""),
        dimensions: isEstimator ? sourceItem.dimensions : (incomingItem.dimensions || ""),
        customImageUrl: isEstimator ? sourceItem.customImageUrl : (incomingItem.customImageUrl || null),
        categoryName: isEstimator ? sourceItem.categoryName : (incomingItem.categoryName || null),
        chairType: isEstimator ? sourceItem.chairType : (incomingItem.chairType || null),
        productDescription: isEstimator ? sourceItem.productDescription : (incomingItem.productDescription || null),
        productNotes: isEstimator ? sourceItem.productNotes : (incomingItem.productNotes || null),
        batchHeading: isEstimator ? sourceItem.batchHeading : (incomingItem.batchHeading || null),
        quantity: qty,
        unit: isEstimator ? sourceItem.unit : (incomingItem.unit || "Nos"),
        factoryCost: factory,
        accessoriesCost: accessories,
        materialCost: mat,
        laborCost: lab,
        installationCost: inst,
        transportCost: trans,
        overheadCost: ovh,
        unitCost: baseCost,
        totalCost: itemTotalCost,
        marginPercentage: margin,
        negotiationPercentage: negPct,
        negotiationAmount: negAmt,
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
        totalFactoryCost,
        totalAccessoriesCost,
        totalNegotiationAmount,
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

    await prisma.boq.update({
      where: { id },
      data: { deletedAt: new Date() }
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
