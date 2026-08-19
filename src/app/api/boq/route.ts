import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { hasPermission } from "@/lib/rbac"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbSessionUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { permissionOverrides: { where: { module: "BOQS" } } }
    })

    if (!dbSessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Phase 1 block removed, RBAC will handle permissions

    // Check view permission dynamically
    const canView = await hasPermission(dbSessionUser.id, "BOQS", "view")
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view BOQs" }, { status: 403 })
    }

    // Resolve ownership rule
    let ownershipRule = "ALL"
    if (dbSessionUser.role !== "SUPER_ADMIN") {
      const override = dbSessionUser.permissionOverrides.find(o => o.action === "ownership")
      if (override?.ownership) {
        ownershipRule = override.ownership
      } else {
        const roleObj = await prisma.role.findFirst({
          where: { name: dbSessionUser.role },
          include: { permissions: { where: { module: "BOQS" } } }
        })
        const rolePerm = roleObj?.permissions[0]
        if (rolePerm?.ownership) {
          ownershipRule = rolePerm.ownership
        }
      }
    }

    let whereClause: any = { deletedAt: null }
    
    const isUnrestricted = ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(dbSessionUser.role)
    if (!isUnrestricted) {
      whereClause.OR = [
        { preparedById: dbSessionUser.id },
        { estimatorId: dbSessionUser.id },
        { client: { salespersonId: dbSessionUser.id } },
        { client: { assignments: { some: { userId: dbSessionUser.id } } } }
      ]
    } else {
      if (ownershipRule === "ALL") {
        // Views all
      } else if (ownershipRule === "DEPARTMENT") {
        const deptUsers = await prisma.user.findMany({
          where: { department: dbSessionUser.department || "N/A", deletedAt: null },
          select: { id: true }
        })
        const deptUserIds = deptUsers.map(u => u.id)
        whereClause.OR = [
          { preparedById: { in: deptUserIds } },
          { estimatorId: { in: deptUserIds } },
          { client: { salespersonId: { in: deptUserIds } } },
          { client: { assignments: { some: { userId: { in: deptUserIds } } } } }
        ]
      } else if (ownershipRule === "OWN" || ownershipRule === "ASSIGNED") {
        whereClause.OR = [
          { preparedById: dbSessionUser.id },
          { estimatorId: dbSessionUser.id },
          { client: { salespersonId: dbSessionUser.id } },
          { client: { assignments: { some: { userId: dbSessionUser.id } } } }
        ]
      } else if (ownershipRule === "NONE") {
        whereClause.id = "none"
      }
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")
    const isTemplate = searchParams.get("isTemplate") === "true"
    const showArchived = searchParams.get("archived") === "true"
    
    if (clientId) {
      whereClause.clientId = clientId
    }

    if (isTemplate) {
      whereClause.isTemplate = true
    } else {
      whereClause.isTemplate = false
    }

    if (!showArchived) {
      whereClause.status = { not: "ARCHIVED" }
    }

    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "50", 10)

    const totalCount = await prisma.boq.count({ where: whereClause })

    const boqs = await prisma.boq.findMany({
      where: whereClause,
      include: {
        client: true,
        preparedBy: true,
      },
      orderBy: { boqNumber: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    })

    return NextResponse.json({
      data: boqs,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page
    })
  } catch (error) {
    console.error("Failed to fetch BOQs:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
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

    const body = await request.json()
    const { ids } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No BOQ IDs provided for deletion" }, { status: 400 })
    }

    // Soft delete by updating status to ARCHIVED
    const result = await prisma.boq.updateMany({
      where: {
        id: { in: ids }
      },
      data: {
        status: "ARCHIVED"
      }
    })

    // Log the action
    if (userId) {
      await prisma.activityLog.create({
        data: {
          userId,
          action: "ARCHIVED_BOQ",
          entityType: "BOQ",
          entityId: "BATCH",
          details: `Admin batch archived ${result.count} BOQs. IDs: ${ids.join(", ")}`
        }
      })
    }

    return NextResponse.json({ success: true, count: result.count })
  } catch (error) {
    console.error("Failed to batch archive BOQs:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const body = await request.json()
    const {
      clientId,
      projectName,
      customerSegment,
      items,
      isTemplate,
      notes,
      termsConditions
    } = body

    if (!clientId || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Client and items are required" },
        { status: 400 }
      )
    }


    let creatorId = ""

    if (session?.user) {
      creatorId = (session.user as any).id
    } else {
      const defaultUser = await prisma.user.findFirst({
        where: { role: "SALES_EXECUTIVE" },
      })
      if (!defaultUser) {
        return NextResponse.json(
          { error: "No system user found. Please seed the database first." },
          { status: 500 }
        )
      }
      creatorId = defaultUser.id
    }

    // Generate BOQ number matching Quotation ID standard
    const segment = customerSegment || "Project"
    let prefix = "P"
    if (segment === "Interior") prefix = "I"
    else if (segment === "Dealer") prefix = "D"

    // Find max number across BOTH Quotations and BOQs to prevent collisions
    const allQuotes = await prisma.quotation.findMany({ select: { quotationNumber: true } })
    const allBoqs = await prisma.boq.findMany({ select: { boqNumber: true } })
    
    let maxNumber = 1000
    for (const q of allQuotes) {
      const match = q.quotationNumber.match(/^[IDP](\d+)/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNumber) maxNumber = num
      }
    }
    for (const b of allBoqs) {
      const match = b.boqNumber.match(/^[IDP](\d+)/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNumber) maxNumber = num
      }
    }

    const nextBoqNo = `${prefix}${maxNumber + 1}-1`

    // Calculate initial totals (including new cost structure)
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

    const boqItemsToCreate = items.map((item: any, idx: number) => {
      const qty = parseInt(item.quantity) || 1
      
      const factory = parseFloat(item.factoryCost) || 0
      const accessories = parseFloat(item.accessoriesCost) || 0

      const mat = parseFloat(item.materialCost) || 0
      const lab = parseFloat(item.laborCost) || 0
      const inst = parseFloat(item.installationCost) || 0
      const trans = parseFloat(item.transportCost) || 0
      const ovh = parseFloat(item.overheadCost) || 0

      const legacyUnitCost = mat + lab + inst + trans + ovh
      const baseCost = (factory > 0 || accessories > 0) ? (factory + accessories) : legacyUnitCost
      const itemTotalCost = baseCost * qty

      const margin = Math.min(99.99, parseFloat(item.marginPercentage ?? item.margin) || 0)
      const preNegPrice = baseCost > 0 ? Number((baseCost / (1 - Math.min(0.9999, margin / 100))).toFixed(2)) : 0

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

      let unitSell = parseFloat(item.unitSellingPrice ?? item.unitPrice)
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
        type: item.type || "custom",
        isCostingRequired: item.isCostingRequired === true,
        productId: item.productId || null,
        description: item.description,
        specifications: item.specifications || "",
        dimensions: item.dimensions || "",
        customImageUrl: item.customImageUrl || null,
        categoryName: item.categoryName || null,
        chairType: item.chairType || null,
        productDescription: item.productDescription || null,
        productNotes: item.productNotes || null,
        batchHeading: item.batchHeading || null,
        quantity: qty,
        unit: item.unit || "Nos",
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

    const newBoq = await prisma.boq.create({
      data: {
        boqNumber: nextBoqNo,
        clientId,
        projectName: projectName || null,
        customerSegment: customerSegment || "Project",
        preparedById: creatorId,
        status: "DRAFT",
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
        isTemplate: isTemplate || false,
        notes: notes || null,
        termsConditions: termsConditions || null,
        items: {
          create: boqItemsToCreate
        }
      },
      include: {
        client: true,
        items: true
      }
    })

    await prisma.activityLog.create({
      data: {
        userId: creatorId,
        action: "CREATED_BOQ",
        entityType: "BOQ",
        entityId: newBoq.id,
        details: `Created BOQ ${nextBoqNo} for client ${newBoq.client.companyName}`
      }
    })

    return NextResponse.json(newBoq, { status: 201 })
  } catch (error) {
    console.error("Failed to create BOQ:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}
