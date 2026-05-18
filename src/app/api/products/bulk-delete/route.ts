import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Product IDs array is required" },
        { status: 400 }
      )
    }

    // 1. Log Activity
    const defaultUser = await prisma.user.findFirst({
      where: { role: "SALES_EXECUTIVE" },
    })

    if (defaultUser) {
      await prisma.activityLog.create({
        data: {
          userId: defaultUser.id,
          action: "DELETED_PRODUCTS",
          entityType: "PRODUCT",
          entityId: "BULK",
          details: `Bulk deleted ${ids.length} products`,
        },
      })
    }

    // 2. Perform deletion
    const deleteResult = await prisma.product.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    })

    return NextResponse.json({
      success: true,
      count: deleteResult.count,
    })
  } catch (error) {
    console.error("Failed to bulk delete products:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
