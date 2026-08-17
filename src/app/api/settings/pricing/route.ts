import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { hasPermission } from "@/lib/rbac"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const canView = await hasPermission((session.user as any).id, "PRICING_MARKUP", "view")
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view pricing markup settings" }, { status: 403 })
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key: "PRICING_PERCENTAGES" }
    })
    
    if (setting) {
      return NextResponse.json(JSON.parse(setting.value))
    } else {
      // Default values
      return NextResponse.json({
        dealer: 15,
        interior: 30,
        project: 50,
        special: 75
      })
    }
  } catch (error) {
    console.error("Failed to fetch pricing percentages:", error)
    return NextResponse.json({ error: "Failed to fetch pricing percentages" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }
    const userId = (session.user as any).id
    const canEdit = await hasPermission(userId, "PRICING_MARKUP", "edit")
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to edit pricing markup settings" }, { status: 403 })
    }

    const body = await request.json()
    const { dealer, interior, project, special, recalculateExisting } = body

    const dealerVal = Math.min(Number(dealer), 99.99)
    const interiorVal = Math.min(Number(interior), 99.99)
    const projectVal = Math.min(Number(project), 99.99)
    const specialVal = Math.min(Number(special), 99.99)

    const valueStr = JSON.stringify({
      dealer: dealerVal,
      interior: interiorVal,
      project: projectVal,
      special: specialVal
    })

    const setting = await prisma.systemSetting.upsert({
      where: { key: "PRICING_PERCENTAGES" },
      update: { value: valueStr },
      create: { key: "PRICING_PERCENTAGES", value: valueStr }
    })

    let recalculatedCount = 0

    if (recalculateExisting) {
      // Fetch all products
      const products = await prisma.product.findMany({
        select: { id: true, costPrice: true }
      })

      // Build and run the transaction
      const updateOperations = products.map(product => {
        const cost = product.costPrice || 0
        const dealerPrice = cost / (1 - (dealerVal / 100))
        const interiorPrice = cost / (1 - (interiorVal / 100))
        const projectPrice = cost / (1 - (projectVal / 100))
        const specialPrice = cost / (1 - (specialVal / 100))

        return prisma.product.update({
          where: { id: product.id },
          data: {
            dealerPrice: Number(dealerPrice.toFixed(2)),
            interiorPrice: Number(interiorPrice.toFixed(2)),
            projectPrice: Number(projectPrice.toFixed(2)),
            specialPrice: Number(specialPrice.toFixed(2)),
            unitPrice: Number(projectPrice.toFixed(2))
          }
        })
      })

      if (updateOperations.length > 0) {
        await prisma.$transaction(updateOperations)
        recalculatedCount = updateOperations.length
      }

      // Log Recalculate Activity
      await prisma.activityLog.create({
        data: {
          userId: (session.user as any).id,
          action: "RECALCULATED_PRICING",
          entityType: "SYSTEM",
          entityId: "ALL_PRODUCTS",
          details: `Automatically recalculated prices for ${recalculatedCount} products on margin update`,
        },
      })
    }

    // Log Settings Update Activity
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any).id,
        action: "UPDATED_SETTINGS",
        entityType: "SYSTEM",
        entityId: setting.id,
        details: `Updated global pricing markup percentages${recalculateExisting ? ' and recalculated existing products' : ''}`,
      },
    })

    return NextResponse.json({
      ...JSON.parse(setting.value),
      recalculatedCount
    })
  } catch (error) {
    console.error("Failed to update pricing percentages:", error)
    return NextResponse.json({ error: "Failed to update pricing percentages" }, { status: 500 })
  }
}
