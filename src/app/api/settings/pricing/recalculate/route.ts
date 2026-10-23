import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { hasPermission } from "@/lib/rbac"

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

    // 1. Fetch latest pricing margins
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "PRICING_PERCENTAGES" }
    })
    
    let margins = { dealer: 15, interior: 30, direct: 50, online: 75 }
    if (setting) {
      margins = { ...margins, ...JSON.parse(setting.value) }
    }

    const invalidMargin = Object.entries(margins).find(([, pct]) => !Number.isFinite(Number(pct)) || Number(pct) < 0 || Number(pct) >= 100)
    if (invalidMargin) {
      return NextResponse.json(
        { error: `Invalid ${invalidMargin[0]} margin (${invalidMargin[1]}%). Margins must be between 0 and 99.99%.` },
        { status: 400 }
      )
    }

    // 2. Fetch active products that have a cost price. Products without a cost are skipped so
    //    their manually entered selling prices are not wiped to 0.
    const products = await prisma.product.findMany({
      where: { deletedAt: null, costPrice: { gt: 0 } },
      select: { id: true, costPrice: true }
    })

    const priceFromMargin = (cost: number, pct: number) => Number((cost / (1 - pct / 100)).toFixed(2))

    // 3. Recalculate and write in batches so large catalogs don't exceed transaction limits
    const updateOperations = products.map(product => {
      const cost = product.costPrice
      const projectPrice = priceFromMargin(cost, margins.direct)

      return prisma.product.update({
        where: { id: product.id },
        data: {
          dealerPrice: priceFromMargin(cost, margins.dealer),
          interiorPrice: priceFromMargin(cost, margins.interior),
          projectPrice,
          specialPrice: priceFromMargin(cost, margins.online),
          unitPrice: projectPrice // Typically unitPrice serves as the default direct/base price
        }
      })
    })

    const BATCH_SIZE = 200
    for (let i = 0; i < updateOperations.length; i += BATCH_SIZE) {
      await prisma.$transaction(updateOperations.slice(i, i + BATCH_SIZE))
    }
    const updatedCount = products.length

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any).id,
        action: "RECALCULATED_PRICING",
        entityType: "SYSTEM",
        entityId: "ALL_PRODUCTS",
        details: `Recalculated prices for ${updatedCount} products using latest margins`,
      },
    })

    return NextResponse.json({ success: true, updatedCount })
  } catch (error) {
    console.error("Failed to recalculate product prices:", error)
    return NextResponse.json({ error: "Failed to recalculate prices" }, { status: 500 })
  }
}
