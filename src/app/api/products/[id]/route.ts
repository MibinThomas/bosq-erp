import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"

// Get single product
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const role = (session?.user as any)?.role
    if (!session || (role !== "ADMIN" && role !== "SALES_MANAGER" && role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
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

// Delete single product
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (!session || (role !== "ADMIN" && role !== "SALES_MANAGER" && role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
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
