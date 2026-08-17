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
      margins = JSON.parse(setting.value)
    }

    // 2. Fetch all products
    const products = await prisma.product.findMany({
      select: { id: true, costPrice: true }
    })

    let updatedCount = 0

    // 3. Recalculate logic via a transaction
    const updateOperations = products.map(product => {
      const cost = product.costPrice || 0
      const dealerPrice = cost / (1 - (margins.dealer / 100))
      const interiorPrice = cost / (1 - (margins.interior / 100))
      const projectPrice = cost / (1 - (margins.direct / 100))
      const specialPrice = cost / (1 - (margins.online / 100))

      updatedCount++

      return prisma.product.update({
        where: { id: product.id },
        data: {
          dealerPrice: Number(dealerPrice.toFixed(2)),
          interiorPrice: Number(interiorPrice.toFixed(2)),
          projectPrice: Number(projectPrice.toFixed(2)),
          specialPrice: Number(specialPrice.toFixed(2)),
          unitPrice: Number(projectPrice.toFixed(2)) // Typically unitPrice serves as the default direct/base price
        }
      })
    })

    // Execute in batches to avoid overwhelming DB if there are thousands of products
    // (Assuming < 1000 for standard ERP usage for now, single transaction is fine)
    await prisma.$transaction(updateOperations)

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
