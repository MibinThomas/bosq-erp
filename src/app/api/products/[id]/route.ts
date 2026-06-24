import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"
import { hasPermission } from "@/lib/rbac"

// Get single product
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const canView = await hasPermission((session.user as any).id, "PRODUCTS", "view")
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view products" }, { status: 403 })
    }

    const { id } = await params
    const product = await prisma.product.findUnique({
      where: { 
        id,
        deletedAt: null
      },
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
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }
    const userId = (session.user as any).id
    const canEdit = await hasPermission(userId, "PRODUCTS", "edit")
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to edit products" }, { status: 403 })
    }

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
      imageUrls,
      status,
      chairType,
      tableTopFinish,
      legType,
      storageOptions,
      finishMaterial,
      stock,
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
        interiorPrice: parseFloat(body.interiorPrice) !== undefined ? parseFloat(body.interiorPrice) : undefined,
        dealerPrice: parseFloat(body.dealerPrice) !== undefined ? parseFloat(body.dealerPrice) : undefined,
        directPrice: parseFloat(body.directPrice) !== undefined ? parseFloat(body.directPrice) : undefined,
        onlinePrice: parseFloat(body.onlinePrice) !== undefined ? parseFloat(body.onlinePrice) : undefined,
        warranty: warranty || null,
        availableColors: availableColors || null,
        dimensions: dimensions || null,
        imageUrl: imageUrl !== undefined ? imageUrl : undefined,
        imageUrls: imageUrls !== undefined ? imageUrls : undefined,
        chairType: chairType !== undefined ? chairType : undefined,
        tableTopFinish: tableTopFinish !== undefined ? tableTopFinish : undefined,
        legType: legType !== undefined ? legType : undefined,
        storageOptions: storageOptions !== undefined ? storageOptions : undefined,
        finishMaterial: finishMaterial !== undefined ? finishMaterial : undefined,
        stock: stock !== undefined ? parseInt(stock) || 0 : undefined,
        status: status || "ACTIVE",
      },
      include: {
        category: true,
      },
    })

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any).id,
        action: "UPDATED_PRODUCT",
        entityType: "PRODUCT",
        entityId: updatedProduct.id,
        details: `Updated product ${productName} (${updatedProduct.productCode})`,
      },
    })

    return NextResponse.json(updatedProduct)
  } catch (error) {
    console.error("Failed to update product:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

// Partial update single product (e.g. stock)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }
    const userId = (session.user as any).id
    const canEdit = await hasPermission(userId, "PRODUCTS", "edit")
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to edit products" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { stock } = body

    if (stock === undefined) {
      return NextResponse.json({ error: "Stock value is required for this operation" }, { status: 400 })
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        stock: parseInt(stock, 10) || 0,
      },
      include: {
        category: true,
      },
    })

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: "UPDATED_PRODUCT_STOCK",
        entityType: "PRODUCT",
        entityId: id,
        details: `Updated product stock for ${updatedProduct.productName} (${updatedProduct.productCode}) to ${updatedProduct.stock}`,
      },
    })

    return NextResponse.json(updatedProduct)
  } catch (error) {
    console.error("Failed to patch product stock:", error)
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
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }
    const userId = (session.user as any).id
    const canDelete = await hasPermission(userId, "PRODUCTS", "delete")
    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to delete products" }, { status: 403 })
    }

    const { id } = await params
    const deletedProduct = await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() }
    })

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any).id,
        action: "DELETED_PRODUCT",
        entityType: "PRODUCT",
        entityId: id,
        details: `Deleted product ${deletedProduct.productName} (${deletedProduct.productCode})`,
      },
    })

    return NextResponse.json({ success: true, product: deletedProduct })
  } catch (error) {
    console.error("Failed to delete product:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
