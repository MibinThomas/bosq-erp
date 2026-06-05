import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (!session || (role !== "ADMIN" && role !== "SALES_MANAGER" && role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }

    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Product IDs array is required" },
        { status: 400 }
      )
    }

    // 1. Log Activity
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any).id,
        action: "DELETED_PRODUCTS",
        entityType: "PRODUCT",
        entityId: "BULK",
        details: `Bulk deleted ${ids.length} products`,
      },
    })

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
