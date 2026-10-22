import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { hasPermission } from "@/lib/rbac"
import { generateProductCode } from "@/lib/product-code"

// Parses a spreadsheet cell as a number. Empty / non-numeric cells return undefined ("leave unchanged"),
// while an explicit 0 is preserved.
const parseNum = (val: unknown): number | undefined => {
  if (val === undefined || val === null) return undefined
  const s = String(val).replace(/,/g, "").trim()
  if (!s) return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

const parseInteger = (val: unknown): number | undefined => {
  const n = parseNum(val)
  return n === undefined ? undefined : Math.trunc(n)
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }
    const userId = (session.user as any).id
    const canBulkUpload = await hasPermission(userId, "PRODUCTS", "uploadFiles")
    if (!canBulkUpload) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to bulk upload products" }, { status: 403 })
    }

    const body = await request.json()
    const { products } = body

    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: "Products array is required" },
        { status: 400 }
      )
    }

    const savedProducts: { id: string; productName: string; productCode: string; created: boolean }[] = []
    const skipped: { row: number; reason: string }[] = []
    const categoryCache = new Map<string, string>()

    const getCategoryId = async (rawName: string) => {
      const name = rawName.trim()
      const key = name.toLowerCase()
      const cached = categoryCache.get(key)
      if (cached) return cached

      let category = await prisma.productCategory.findFirst({
        where: { name: { equals: name, mode: "insensitive" } },
      })
      if (!category) {
        category = await prisma.productCategory.create({
          data: { name, description: `${name} category` },
        })
      }
      categoryCache.set(key, category.id)
      return category.id
    }

    for (const [index, prod] of products.entries()) {
      const row = index + 1
      const {
        productCode,
        productName,
        categoryName,
        description,
        specifications,
        warranty,
        availableColors,
        dimensions,
        imageUrl,
        chairType,
        tableTopFinish,
        legType,
        storageOptions,
        finishMaterial,
        modelName,
      } = prod

      if (!productName || !String(productName).trim() || !categoryName || !String(categoryName).trim()) {
        skipped.push({ row, reason: "Product name and category are required" })
        continue
      }

      try {
        const categoryId = await getCategoryId(String(categoryName))

        const prices = {
          unitPrice: parseNum(prod.unitPrice),
          costPrice: parseNum(prod.costPrice),
          dealerPrice: parseNum(prod.dealerPrice),
          interiorPrice: parseNum(prod.interiorPrice),
          projectPrice: parseNum(prod.projectPrice),
          specialPrice: parseNum(prod.specialPrice),
        }
        const stock = parseInteger(prod.stock)

        const createData = {
          productName: String(productName).trim(),
          categoryId,
          description: description || null,
          specifications: specifications || null,
          unitPrice: prices.unitPrice ?? 0,
          costPrice: prices.costPrice ?? 0,
          dealerPrice: prices.dealerPrice ?? 0,
          interiorPrice: prices.interiorPrice ?? 0,
          projectPrice: prices.projectPrice ?? 0,
          specialPrice: prices.specialPrice ?? 0,
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
          stock: stock ?? 0,
          modelName: modelName ? String(modelName).trim() : null,
        }

        const providedCode = productCode ? String(productCode).trim() : ""

        let saved
        let created: boolean
        if (!providedCode) {
          // No code supplied → always a new product; never overwrite an existing one by a generated code
          saved = await prisma.product.create({
            data: { ...createData, productCode: await generateProductCode(String(categoryName)) },
          })
          created = true
        } else {
          const existing = await prisma.product.findUnique({
            where: { productCode: providedCode },
            select: { id: true },
          })
          saved = await prisma.product.upsert({
            where: { productCode: providedCode },
            update: {
              productName: String(productName).trim(),
              categoryId,
              description: description ? description : undefined,
              specifications: specifications ? specifications : undefined,
              ...prices,
              warranty: warranty ? warranty : undefined,
              availableColors: availableColors ? availableColors : undefined,
              dimensions: dimensions ? dimensions : undefined,
              imageUrl: imageUrl ? imageUrl : undefined,
              status: "ACTIVE",
              deletedAt: null, // re-importing a removed product code restores it
              chairType: chairType !== undefined ? chairType : undefined,
              tableTopFinish: tableTopFinish !== undefined ? tableTopFinish : undefined,
              legType: legType !== undefined ? legType : undefined,
              storageOptions: storageOptions !== undefined ? storageOptions : undefined,
              finishMaterial: finishMaterial !== undefined ? finishMaterial : undefined,
              stock,
              modelName: modelName ? String(modelName).trim() : undefined,
            },
            create: { ...createData, productCode: providedCode },
          })
          created = !existing
        }

        savedProducts.push({ id: saved.id, productName: saved.productName, productCode: saved.productCode, created })
      } catch (rowError: any) {
        console.error(`Bulk product import failed on row ${row}:`, rowError)
        skipped.push({ row, reason: rowError?.message || "Failed to save row" })
      }
    }

    if (savedProducts.length > 0) {
      await prisma.activityLog.createMany({
        data: savedProducts.map((p) => ({
          userId,
          action: p.created ? "CREATED_PRODUCT" : "UPDATED_PRODUCT",
          entityType: "PRODUCT",
          entityId: p.id,
          details: `Bulk ${p.created ? "imported" : "updated"} product ${p.productName} (${p.productCode})`,
        })),
      })
    }

    return NextResponse.json({
      success: true,
      count: savedProducts.length,
      created: savedProducts.filter((p) => p.created).length,
      updated: savedProducts.filter((p) => !p.created).length,
      skipped,
    })
  } catch (error) {
    console.error("Failed to bulk import products:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
