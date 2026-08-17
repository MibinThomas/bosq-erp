import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { isManagerOrAdminRole } from "@/lib/utils"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userRole = (session.user as any).role || ""
    if (!isManagerOrAdminRole(userRole)) {
      return NextResponse.json(
        { error: "Forbidden: Only Super Admins and users with managerial roles can save products to the catalog" },
        { status: 403 }
      )
    }

    const { id: quotationId } = await params
    const body = await request.json().catch(() => ({}))
    const { itemId } = body

    if (!itemId) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 })
    }

    // Find the quotation item
    const item = await prisma.quotationItem.findFirst({
      where: {
        id: itemId,
        quotationId: quotationId,
      },
      include: {
        product: true,
      },
    })

    if (!item) {
      return NextResponse.json({ error: "Quotation item not found" }, { status: 404 })
    }

    const productName = (body.productName || item.description || "").trim()
    if (!productName) {
      return NextResponse.json(
        { error: "Product Title / Heading is required to save an item to the catalog." },
        { status: 400 }
      )
    }

    const categoryName = (body.categoryName || item.categoryName || "Chairs").trim()

    // 1. Get or create category
    let category = await prisma.productCategory.findUnique({
      where: { name: categoryName },
    })

    if (!category) {
      category = await prisma.productCategory.create({
        data: {
          name: categoryName,
          description: `${categoryName} category`,
        },
      })
    }

    // 2. Generate product code if needed
    let productCode = body.productCode
    if (!productCode) {
      const prefix = categoryName.substring(0, 2).toUpperCase()
      const lastProduct = await prisma.product.findFirst({
        where: { productCode: { startsWith: prefix } },
        orderBy: { productCode: "desc" },
      })

      let nextNum = 1
      if (lastProduct) {
        const lastNumPart = parseInt(lastProduct.productCode.replace(prefix + "-", ""), 10)
        if (!isNaN(lastNumPart)) {
          nextNum = lastNumPart + 1
        }
      }
      productCode = `${prefix}-${nextNum.toString().padStart(2, "0")}`
    }

    const unitPrice = body.unitPrice !== undefined ? Number(body.unitPrice) : Number(item.unitPrice || 0)
    const description = body.description || item.productDescription || item.description
    const specifications = body.specifications || item.specifications || ""
    const imageUrl = body.imageUrl || item.customImageUrl || null
    const chairType = body.chairType || item.chairType || null

    // 3. Create the product
    const newProduct = await prisma.product.create({
      data: {
        productCode,
        productName,
        categoryId: category.id,
        description: description || null,
        specifications: specifications || null,
        unitPrice,
        costPrice: 0.0,
        interiorPrice: unitPrice,
        dealerPrice: unitPrice,
        projectPrice: unitPrice,
        specialPrice: unitPrice,
        imageUrl,
        chairType,
        status: "ACTIVE",
      },
      include: {
        category: true,
      },
    })

    // 4. Update the quotation item to link to the new product
    const updatedItem = await prisma.quotationItem.update({
      where: { id: item.id },
      data: {
        productId: newProduct.id,
      },
    })

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any).id,
        action: "SAVED_QUOTATION_ITEM_TO_CATALOG",
        entityType: "PRODUCT",
        entityId: newProduct.id,
        details: `Saved product "${productName}" (${productCode}) to catalog from quotation ${quotationId}`,
      },
    })

    return NextResponse.json({
      success: true,
      product: newProduct,
      item: updatedItem,
    })
  } catch (error: any) {
    console.error("Failed to save quotation item to catalog:", error)
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    )
  }
}
