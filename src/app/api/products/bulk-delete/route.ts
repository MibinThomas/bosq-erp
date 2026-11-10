import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { hasPermission } from "@/lib/rbac"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }
    const userId = (session.user as any).id
    const canDelete = await hasPermission(userId, "PRODUCTS", "delete")
    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to delete products" }, { status: 403 })
    }

    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Product IDs array is required" },
        { status: 400 }
      )
    }

    // Soft delete (same as single delete) so quotations/BOQs keep their product links and
    // the products can be restored. Deleting a model also removes its variants from use.
    const now = new Date()
    const deleteResult = await prisma.$transaction(async (tx) => {
      const products = await tx.product.updateMany({
        where: { id: { in: ids }, deletedAt: null },
        data: { deletedAt: now },
      })
      const variants = await tx.product.updateMany({
        where: { parentProductId: { in: ids }, deletedAt: null },
        data: { deletedAt: now },
      })
      return { count: products.count + variants.count, variants: variants.count }
    })

    await prisma.activityLog.create({
      data: {
        userId: (session.user as any).id,
        action: "DELETED_PRODUCTS",
        entityType: "PRODUCT",
        entityId: "BULK",
        details: `Bulk deleted ${ids.length} products (${deleteResult.variants} variants included): ${ids.slice(0, 50).join(", ")}`.slice(0, 1000),
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
