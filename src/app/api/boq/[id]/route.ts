import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { hasPermission, checkOwnership } from "@/lib/rbac"
import { boqCostValues, boqUnitCost, priceFromMargin } from "@/lib/boq-costing"

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
      ...(boq.client?.salespersonId ? [boq.client.salespersonId] : []),
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
      ...(existingBoq.client?.salespersonId ? [existingBoq.client.salespersonId] : []),
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
    let totalOutsourcingCost = 0
    const totalNegotiationAmount = 0
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
      
      // Costs: the estimator's categories (only lines marked for costing are editable by them)
      const costSource = canEditCost ? incomingItem : sourceItem
      const costs = boqCostValues(costSource)
      const inst = parseFloat(costSource.installationCost) || 0
      const trans = parseFloat(costSource.transportCost) || 0
      const enteredCost = boqUnitCost(costSource)
      const baseCost = enteredCost > 0 ? enteredCost : (parseFloat(incomingItem.basePrice) || 0)
      const itemTotalCost = baseCost * qty

      // Margin belongs to the consultant (BOQ pricing row); estimators can't change it
      const margin = isEstimator
        ? (parseFloat(sourceItem.marginPercentage) || 0)
        : Math.min(99.99, parseFloat(incomingItem.marginPercentage ?? incomingItem.margin) || 0)

      // Selling price: costed lines are priced from their cost at the consultant's margin;
      // catalogue lines keep the price set on the pricing row.
      const sentPrice = parseFloat(incomingItem.unitSellingPrice ?? incomingItem.unitPrice)
      let unitSell: number
      if (isEstimator) {
        unitSell = enteredCost > 0 ? priceFromMargin(enteredCost, margin) : (parseFloat(sourceItem.unitSellingPrice) || 0)
      } else if (Number.isFinite(sentPrice) && sentPrice > 0) {
        unitSell = sentPrice
      } else {
        unitSell = priceFromMargin(baseCost, margin)
      }
      const itemTotalSell = unitSell * qty

      totalFactoryCost += costs.factoryCost * qty
      totalAccessoriesCost += costs.accessoriesCost * qty
      totalOutsourcingCost += costs.outsourcingCost * qty
      totalMaterialCost += costs.materialCost * qty
      totalLaborCost += costs.laborCost * qty
      totalInstallation += inst * qty
      totalTransport += trans * qty
      totalOverhead += costs.overheadCost * qty
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
        ...costs,
        installationCost: inst,
        transportCost: trans,
        unitCost: baseCost,
        totalCost: itemTotalCost,
        marginPercentage: margin,
        // Negotiation is no longer part of BOQ costing; commercial adjustments happen on the quotation
        negotiationPercentage: 0,
        negotiationAmount: 0,
        unitSellingPrice: unitSell,
        totalSellingPrice: itemTotalSell
      }
    })

    const marginAmount = totalSellingPrice - totalCost

    // A plain save may only move between DRAFT and SUBMITTED. Workflow statuses (sent to estimator,
    // costing completed, needs revision, converted) are set only by their dedicated actions.
    const EDITABLE_STATUSES = ["DRAFT", "SUBMITTED"]
    const nextStatus =
      typeof status === "string" && EDITABLE_STATUSES.includes(status) && EDITABLE_STATUSES.includes(existingBoq.status)
        ? status
        : existingBoq.status

    // Replace the items and update the BOQ atomically, so a failure can't leave it without lines
    const [, updatedBoq] = await prisma.$transaction([
      prisma.boqItem.deleteMany({
        where: { boqId: id }
      }),
      prisma.boq.update({
      where: { id },
      data: {
        status: nextStatus,
        customerSegment: customerSegment || existingBoq.customerSegment,
        totalMaterialCost,
        totalLaborCost,
        totalInstallation,
        totalTransport,
        totalOverhead,
        totalFactoryCost,
        totalAccessoriesCost,
        totalOutsourcingCost,
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
    }),
    ])

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
