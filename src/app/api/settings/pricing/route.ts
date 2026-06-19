import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"

export async function GET() {
  try {
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
        direct: 50,
        online: 75
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
    const role = (session?.user as any)?.role
    if (!session || (role !== "ADMIN" && role !== "SALES_MANAGER" && role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }

    const body = await request.json()
    const { dealer, interior, direct, online, recalculateExisting } = body

    const dealerVal = Math.min(Number(dealer), 99.99)
    const interiorVal = Math.min(Number(interior), 99.99)
    const directVal = Math.min(Number(direct), 99.99)
    const onlineVal = Math.min(Number(online), 99.99)

    const valueStr = JSON.stringify({
      dealer: dealerVal,
      interior: interiorVal,
      direct: directVal,
      online: onlineVal
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
        const directPrice = cost / (1 - (directVal / 100))
        const onlinePrice = cost / (1 - (onlineVal / 100))

        return prisma.product.update({
          where: { id: product.id },
          data: {
            dealerPrice: Number(dealerPrice.toFixed(2)),
            interiorPrice: Number(interiorPrice.toFixed(2)),
            directPrice: Number(directPrice.toFixed(2)),
            onlinePrice: Number(onlinePrice.toFixed(2)),
            unitPrice: Number(directPrice.toFixed(2))
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
