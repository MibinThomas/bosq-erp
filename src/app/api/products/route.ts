import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/route"
import { hasPermission } from "@/lib/rbac"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const canView = await hasPermission((session.user as any).id, "PRODUCTS", "view")
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view products" }, { status: 403 })
    }

    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        category: true,
      },
      orderBy: { productCode: "asc" },
    })
    return NextResponse.json(products)
  } catch (error) {
    console.error("Failed to fetch products:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }
    const userId = (session.user as any).id
    const canCreate = await hasPermission(userId, "PRODUCTS", "create")
    if (!canCreate) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to create products" }, { status: 403 })
    }

    const body = await request.json()
    const {
      productCode,
      productName,
      categoryName, // E.g., Workstations
      description,
      specifications,
      unitPrice,
      costPrice,
      warranty,
      availableColors,
      dimensions,
      imageUrl,
      imageUrls,
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

    // 2. Generate code if not provided
    let finalCode = productCode
    if (!finalCode) {
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
      finalCode = `${prefix}-${nextNum.toString().padStart(2, "0")}`
    }

    // 3. Save product
    const newProduct = await prisma.product.create({
      data: {
        productCode: finalCode,
        productName,
        categoryId: category.id,
        description: description || null,
        specifications,
        unitPrice: parseFloat(unitPrice) || 0.0,
        costPrice: parseFloat(costPrice) || 0.0,
        interiorPrice: parseFloat(body.interiorPrice) || parseFloat(unitPrice) || 0.0,
        dealerPrice: parseFloat(body.dealerPrice) || parseFloat(unitPrice) || 0.0,
        directPrice: parseFloat(body.directPrice) || parseFloat(unitPrice) || 0.0,
        onlinePrice: parseFloat(body.onlinePrice) || parseFloat(unitPrice) || 0.0,
        warranty: warranty || null,
        availableColors: availableColors || null,
        dimensions: dimensions || null,
        imageUrl: imageUrl || null,
        imageUrls: imageUrls || [],
        chairType: chairType || null,
        tableTopFinish: tableTopFinish || null,
        legType: legType || null,
        storageOptions: storageOptions || null,
        finishMaterial: finishMaterial || null,
        status: "ACTIVE",
      },
      include: {
        category: true,
      },
    })

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any).id,
        action: "CREATED_PRODUCT",
        entityType: "PRODUCT",
        entityId: newProduct.id,
        details: `Created product ${productName} (${finalCode})`,
      },
    })

    return NextResponse.json(newProduct, { status: 201 })
  } catch (error) {
    console.error("Failed to create product:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
