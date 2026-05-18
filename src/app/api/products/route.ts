import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const products = await prisma.product.findMany({
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
        description,
        specifications,
        unitPrice: parseFloat(unitPrice) || 0.0,
        costPrice: parseFloat(costPrice) || 0.0,
        warranty: warranty || "5 Years",
        availableColors: availableColors || "Standard",
        dimensions: dimensions || "Standard",
        status: "ACTIVE",
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
          action: "CREATED_PRODUCT",
          entityType: "PRODUCT",
          entityId: newProduct.id,
          details: `Created product ${productName} (${finalCode})`,
        },
      })
    }

    return NextResponse.json(newProduct, { status: 201 })
  } catch (error) {
    console.error("Failed to create product:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
