import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    // Determine the role
    const userRole = (session?.user as any)?.role || "SALES_EXECUTIVE"
    
    let whereClause: any = {}
    if (userRole === "SALES_EXECUTIVE") {
      whereClause.preparedById = (session?.user as any)?.id
    }

    const { searchParams } = new URL(request.url)
    const isTemplate = searchParams.get("isTemplate") === "true"
    if (isTemplate) {
      whereClause.isTemplate = true
    } else {
      whereClause.isTemplate = false
    }

    const boqs = await prisma.boq.findMany({
      where: whereClause,
      include: {
        client: true,
        preparedBy: true,
      },
      orderBy: { boqNumber: "desc" },
    })

    return NextResponse.json(boqs)
  } catch (error) {
    console.error("Failed to fetch BOQs:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
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

    const session = await getServerSession(authOptions)
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

    // Generate BOQ number
    const prefix = "BOQ"
    const allBoqs = await prisma.boq.findMany({
      select: { boqNumber: true }
    })

    let maxNumber = 1000
    for (const b of allBoqs) {
      const match = b.boqNumber.match(/^BOQ-(\d+)/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNumber) {
          maxNumber = num
        }
      }
    }

    const nextBoqNo = `${prefix}-${maxNumber + 1}`

    // Calculate initial totals (likely zero for cost at this stage, but we handle whatever is passed)
    let totalMaterialCost = 0
    let totalLaborCost = 0
    let totalInstallation = 0
    let totalTransport = 0
    let totalOverhead = 0
    let totalCost = 0
    let totalSellingPrice = 0

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

    const newBoq = await prisma.boq.create({
      data: {
        boqNumber: nextBoqNo,
        clientId,
        projectName: projectName || null,
        customerSegment: customerSegment || "Direct",
        preparedById: creatorId,
        status: "DRAFT",
        totalMaterialCost,
        totalLaborCost,
        totalInstallation,
        totalTransport,
        totalOverhead,
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
