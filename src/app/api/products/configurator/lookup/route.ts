import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const {
      variantId,
      modelName,
      legType,
      tableTopFinish,
      dimensions,
      storageOptions,
      finishMaterial,
    } = body

    let matchedProduct = null

    if (variantId) {
      matchedProduct = await prisma.product.findUnique({
        where: { id: variantId },
        include: { category: true },
      })
    } else {
      // Find all candidate active products matching model name
      const candidateProducts = await prisma.product.findMany({
        where: {
          deletedAt: null,
          status: "ACTIVE",
          ...(modelName
            ? {
                productName: {
                  startsWith: modelName,
                },
              }
            : {}),
        },
        include: { category: true },
      })

      // Match by attributes
      matchedProduct = candidateProducts.find((p) => {
        if (legType && p.legType && p.legType.trim().toLowerCase() !== legType.trim().toLowerCase()) return false
        if (tableTopFinish && p.tableTopFinish && p.tableTopFinish.trim().toLowerCase() !== tableTopFinish.trim().toLowerCase()) return false
        if (dimensions && p.dimensions && p.dimensions.trim().toLowerCase() !== dimensions.trim().toLowerCase()) return false
        if (storageOptions && p.storageOptions && p.storageOptions.trim().toLowerCase() !== storageOptions.trim().toLowerCase()) return false
        if (finishMaterial && p.finishMaterial && p.finishMaterial.trim().toLowerCase() !== finishMaterial.trim().toLowerCase()) return false
        return true
      }) || candidateProducts[0] || null
    }

    if (!matchedProduct) {
      return NextResponse.json(
        { error: "Combination Not Available: No matching variant found for the selected attributes." },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      product: matchedProduct,
    })
  } catch (error: any) {
    console.error("Failed to lookup variant product:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
