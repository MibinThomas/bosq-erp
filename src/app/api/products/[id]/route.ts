import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// Get single product
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error("Failed to fetch product:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

// Update single product
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      productCode,
      productName,
      categoryName,
      description,
      specifications,
      unitPrice,
      costPrice,
      warranty,
      availableColors,
      dimensions,
      imageUrl,
      status,
    } = body

    if (!productName || !categoryName) {
      return NextResponse.json(
        { error: "Product name and category are required" },
        { status: 400 }
      )
    }

    // 1. Get or create category
    let category = await prisma.productCategory.findUnique({
      where: { name: categoryName.trim() },
    })

    if (!category) {
      category = await prisma.productCategory.create({
        data: {
          name: categoryName.trim(),
          description: `${categoryName.trim()} category`,
        },
      })
    }

    // 2. Perform update
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        productCode: productCode ? productCode.trim() : undefined,
        productName: productName.trim(),
        categoryId: category.id,
        description: description || null,
        specifications: specifications || null,
        unitPrice: parseFloat(unitPrice) || 0.0,
        costPrice: parseFloat(costPrice) || 0.0,
        warranty: warranty || "5 Years",
        availableColors: availableColors || "Standard",
        dimensions: dimensions || "Standard",
        imageUrl: imageUrl || undefined,
        status: status || "ACTIVE",
      },
      include: {
        category: true,
      },
    })

    // Log Activity
    const defaultUser = await prisma.user.findFirst({
      where: { role: "SALES_EXECUTIVE" },
    })

    if (defaultUser) {
      await prisma.activityLog.create({
        data: {
          userId: defaultUser.id,
          action: "UPDATED_PRODUCT",
          entityType: "PRODUCT",
          entityId: updatedProduct.id,
          details: `Updated product ${productName} (${updatedProduct.productCode})`,
        },
      })
    }

    return NextResponse.json(updatedProduct)
  } catch (error) {
    console.error("Failed to update product:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

// Delete single product
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const deletedProduct = await prisma.product.delete({
      where: { id },
    })

    // Log Activity
    const defaultUser = await prisma.user.findFirst({
      where: { role: "SALES_EXECUTIVE" },
    })

    if (defaultUser) {
      await prisma.activityLog.create({
        data: {
          userId: defaultUser.id,
          action: "DELETED_PRODUCT",
          entityType: "PRODUCT",
          entityId: id,
          details: `Deleted product ${deletedProduct.productName} (${deletedProduct.productCode})`,
        },
      })
    }

    return NextResponse.json({ success: true, product: deletedProduct })
  } catch (error) {
    console.error("Failed to delete product:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
