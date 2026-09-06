import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { hasPermission } from "@/lib/rbac"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const canView = await hasPermission((session.user as any).id, "PRODUCTS", "view")
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view products" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const grouped = searchParams.get("grouped") === "true"

    const userRole = (session?.user as any)?.role || ""
    const isInteriorConsultant = userRole === "INTERIOR_DESIGN_CONSULTANT"

    if (grouped) {
      // 1. Auto-consolidate any unlinked products if needed
      const unlinkedProducts = await prisma.product.findMany({
        where: {
          deletedAt: null,
          parentProductId: null,
          isMaster: false,
        }
      })

      if (unlinkedProducts.length > 0) {
        const brandGroups: Record<string, typeof unlinkedProducts> = {}
        for (const p of unlinkedProducts) {
          const brand = p.productName.trim().split(" ")[0]
          if (!brandGroups[brand]) brandGroups[brand] = []
          brandGroups[brand].push(p)
        }

        for (const [brand, items] of Object.entries(brandGroups)) {
          let master = await prisma.product.findFirst({
            where: {
              deletedAt: null,
              isMaster: true,
              productName: { equals: brand, mode: "insensitive" }
            }
          })

          if (!master) {
            const masterCode = `MASTER-${brand.toUpperCase().replace(/[^A-Z0-9]/g, "")}`
            master = await prisma.product.create({
              data: {
                productCode: masterCode,
                productName: brand,
                isMaster: true,
                categoryId: items[0].categoryId,
                description: `${brand} Series Seating Collection`,
                status: "ACTIVE",
                warranty: "3 Years",
              }
            })
          }

          await prisma.product.updateMany({
            where: { id: { in: items.map(i => i.id) } },
            data: {
              isMaster: false,
              parentProductId: master.id
            }
          })
        }
      }

      // 2. Fetch Master products and standalone products (parentProductId is null)
      const masterProducts = await prisma.product.findMany({
        where: {
          deletedAt: null,
          parentProductId: null,
          ...(isInteriorConsultant ? { stock: { gt: 0 } } : {})
        },
        include: {
          category: true,
          variants: {
            where: { deletedAt: null },
            include: { category: true },
            orderBy: { productCode: "asc" }
          }
        },
        orderBy: { productName: "asc" },
      })
      return NextResponse.json(masterProducts)
    }

    const products = await prisma.product.findMany({
      where: { 
        deletedAt: null,
        ...(isInteriorConsultant ? { stock: { gt: 0 } } : {})
      },
      include: {
        category: true,
        parentProduct: { select: { id: true, productName: true } }
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
      chairType,
      tableTopFinish,
      legType,
      storageOptions,
      finishMaterial,
      stock,
      isMaster,
      variants, // Optional array of variant definitions
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

    // 2. Generate master code if not provided
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

    // 3. Save master product
    const masterProduct = await prisma.product.create({
      data: {
        productCode: finalCode,
        productName,
        categoryId: category.id,
        parentProductId: body.parentProductId || null,
        modelName: body.modelName || null,
        description: description || null,
        specifications: specifications || null,
        unitPrice: parseFloat(unitPrice) || 0.0,
        costPrice: parseFloat(costPrice) || 0.0,
        interiorPrice: parseFloat(body.interiorPrice) || parseFloat(unitPrice) || 0.0,
        dealerPrice: parseFloat(body.dealerPrice) || parseFloat(unitPrice) || 0.0,
        projectPrice: parseFloat(body.projectPrice) || parseFloat(unitPrice) || 0.0,
        specialPrice: parseFloat(body.specialPrice) || parseFloat(unitPrice) || 0.0,
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
        stock: parseInt(stock) || 0,
        status: "ACTIVE",
        isMaster: body.parentProductId ? false : Boolean(isMaster || (variants && variants.length > 0)),
      },
      include: {
        category: true,
      },
    })

    // 4. Create child variants if provided
    if (variants && Array.isArray(variants) && variants.length > 0) {
      for (const varItem of variants) {
        const varCode = varItem.productCode || `${finalCode}-${(varItem.availableColors || varItem.modelName || "VAR").toUpperCase().replace(/[^A-Z0-9]/g, "")}`
        await prisma.product.create({
          data: {
            productCode: varCode,
            productName: varItem.productName || `${productName} - ${varItem.modelName || varItem.availableColors || "Variant"}`,
            parentProductId: masterProduct.id,
            isMaster: false,
            categoryId: category.id,
            modelName: varItem.modelName || null,
            modelCode: varItem.modelCode || null,
            description: varItem.description || description || null,
            specifications: varItem.specifications || specifications || null,
            costPrice: parseFloat(varItem.costPrice) || parseFloat(costPrice) || 0.0,
            unitPrice: parseFloat(varItem.unitPrice) || parseFloat(unitPrice) || 0.0,
            dealerPrice: parseFloat(varItem.dealerPrice) || parseFloat(body.dealerPrice) || 0.0,
            interiorPrice: parseFloat(varItem.interiorPrice) || parseFloat(body.interiorPrice) || 0.0,
            projectPrice: parseFloat(varItem.projectPrice) || parseFloat(body.projectPrice) || 0.0,
            specialPrice: parseFloat(varItem.specialPrice) || parseFloat(body.specialPrice) || 0.0,
            warranty: varItem.warranty || warranty || null,
            availableColors: varItem.availableColors || availableColors || null,
            dimensions: varItem.dimensions || dimensions || null,
            imageUrl: varItem.imageUrl || imageUrl || null,
            imageUrls: varItem.imageUrls || imageUrls || [],
            chairType: varItem.chairType || chairType || null,
            tableTopFinish: varItem.tableTopFinish || tableTopFinish || null,
            legType: varItem.legType || legType || null,
            storageOptions: varItem.storageOptions || storageOptions || null,
            finishMaterial: varItem.finishMaterial || finishMaterial || null,
            stock: parseInt(varItem.stock) || 0,
            status: "ACTIVE",
            variantAttributes: varItem.variantAttributes || null,
          }
        })
      }
    }

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any).id,
        action: "CREATED_PRODUCT",
        entityType: "PRODUCT",
        entityId: masterProduct.id,
        details: `Created master product ${productName} (${finalCode})${variants?.length ? ` with ${variants.length} variants` : ''}`,
      },
    })

    return NextResponse.json(masterProduct, { status: 201 })
  } catch (error) {
    console.error("Failed to create product:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
