import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"
import { hasPermission } from "@/lib/rbac"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }
    const userId = (session.user as any).id
    const canCreate = await hasPermission(userId, "PRODUCTS", "create")
    if (!canCreate) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to import products" }, { status: 403 })
    }

    const body = await request.json()
    const { products } = body

    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: "Products array is required" },
        { status: 400 }
      )
    }

    const createdProducts = []
    const defaultUser = await prisma.user.findFirst({
      where: { role: "SALES_EXECUTIVE" },
    })

    // Process products sequentially or in batch
    for (const prod of products) {
      const {
        productCode,
        productName,
        categoryName,
        description,
        specifications,
        unitPrice,
        costPrice,
        dealerPrice,
        interiorPrice,
        directPrice,
        onlinePrice,
        warranty,
        availableColors,
        dimensions,
        imageUrl,
        chairType,
        tableTopFinish,
        legType,
        storageOptions,
        finishMaterial,
      } = prod

      if (!productName || !categoryName) {
        continue // Skip invalid rows gracefully
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

      // 2. Generate code if not provided
      let finalCode = productCode ? productCode.trim() : null
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

      // 3. Upsert product (Create or Update if productCode exists)
      const savedProduct = await prisma.product.upsert({
        where: { productCode: finalCode },
        update: {
          productName: productName.trim() || undefined,
          categoryId: category.id,
          description: description ? description : undefined,
          specifications: specifications ? specifications : undefined,
          unitPrice: parseFloat(unitPrice) || undefined,
          costPrice: parseFloat(costPrice) || undefined,
          dealerPrice: parseFloat(dealerPrice) || undefined,
          interiorPrice: parseFloat(interiorPrice) || undefined,
          directPrice: parseFloat(directPrice) || undefined,
          onlinePrice: parseFloat(onlinePrice) || undefined,
          warranty: warranty ? warranty : undefined,
          availableColors: availableColors ? availableColors : undefined,
          dimensions: dimensions ? dimensions : undefined,
          imageUrl: imageUrl ? imageUrl : undefined,
          status: "ACTIVE",
          chairType: chairType !== undefined ? chairType : undefined,
          tableTopFinish: tableTopFinish !== undefined ? tableTopFinish : undefined,
          legType: legType !== undefined ? legType : undefined,
          storageOptions: storageOptions !== undefined ? storageOptions : undefined,
          finishMaterial: finishMaterial !== undefined ? finishMaterial : undefined,
        },
        create: {
          productCode: finalCode,
          productName: productName.trim(),
          categoryId: category.id,
          description: description || null,
          specifications: specifications || null,
          unitPrice: parseFloat(unitPrice) || 0.0,
          costPrice: parseFloat(costPrice) || 0.0,
          dealerPrice: parseFloat(dealerPrice) || 0.0,
          interiorPrice: parseFloat(interiorPrice) || 0.0,
          directPrice: parseFloat(directPrice) || 0.0,
          onlinePrice: parseFloat(onlinePrice) || 0.0,
          warranty: warranty || "5 Years",
          availableColors: availableColors || "Standard",
          dimensions: dimensions || "Standard",
          imageUrl: imageUrl || null,
          status: "ACTIVE",
          chairType: chairType || null,
          tableTopFinish: tableTopFinish || null,
          legType: legType || null,
          storageOptions: storageOptions || null,
          finishMaterial: finishMaterial || null,
        },
        include: {
          category: true,
        },
      })

      createdProducts.push(savedProduct)

      // Log Activity
      await prisma.activityLog.create({
        data: {
          userId: (session.user as any).id,
          action: "CREATED_PRODUCT",
          entityType: "PRODUCT",
          entityId: savedProduct.id,
          details: `Bulk imported product ${productName} (${finalCode})`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      count: createdProducts.length,
    })
  } catch (error) {
    console.error("Failed to bulk import products:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
