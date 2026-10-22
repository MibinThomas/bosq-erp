import { NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { hasPermission } from "@/lib/rbac"

// Exports the product catalog as .xlsx (default) or .csv.
// Supports the same filters as GET /api/products: ?q=&categoryId=&status=
// The first columns match the bulk import template so an export can be edited and re-imported.
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as any).id
    const canExport = await hasPermission(userId, "PRODUCTS", "export")
    if (!canExport) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to export products" }, { status: 403 })
    }
    const canSeeCost = await hasPermission(userId, "PRODUCTS", "manage")

    const { searchParams } = new URL(request.url)
    const format = searchParams.get("format") === "csv" ? "csv" : "xlsx"
    const q = searchParams.get("q")?.trim()
    const categoryId = searchParams.get("categoryId") || undefined
    const status = searchParams.get("status") || undefined

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(categoryId ? { categoryId } : {}),
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { productName: { contains: q, mode: "insensitive" } },
              { productCode: { contains: q, mode: "insensitive" } },
              { modelName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true } },
        parentProduct: { select: { productName: true } },
      },
      orderBy: [{ category: { name: "asc" } }, { productCode: "asc" }],
    })

    const columns: { header: string; key: string; width: number }[] = [
      { header: "Main Product / Base Title", key: "mainProduct", width: 28 },
      { header: "Sub-Product / Model", key: "modelName", width: 28 },
      { header: "Product Code", key: "productCode", width: 18 },
      { header: "Product Name", key: "productName", width: 36 },
      { header: "Category", key: "category", width: 18 },
      { header: "Base Price (AED)", key: "unitPrice", width: 14 },
      { header: "Stock Quantity", key: "stock", width: 12 },
      { header: "Short Description", key: "description", width: 40 },
      { header: "Dimensions / Size", key: "dimensions", width: 18 },
      { header: "Table Top Finish / Wood", key: "tableTopFinish", width: 20 },
      { header: "Leg Type / Color", key: "legType", width: 18 },
      { header: "Storage Options", key: "storageOptions", width: 18 },
      { header: "Chair Type", key: "chairType", width: 16 },
      { header: "Color", key: "availableColors", width: 16 },
      { header: "Warranty", key: "warranty", width: 12 },
      { header: "Specifications / Details", key: "specifications", width: 40 },
      { header: "Finish Material", key: "finishMaterial", width: 18 },
      { header: "Dealer Price", key: "dealerPrice", width: 12 },
      { header: "Interior Price", key: "interiorPrice", width: 12 },
      { header: "Project Price", key: "projectPrice", width: 12 },
      { header: "Special Price", key: "specialPrice", width: 12 },
      ...(canSeeCost ? [{ header: "Cost Price", key: "costPrice", width: 12 }] : []),
      { header: "Type", key: "type", width: 10 },
      { header: "Status", key: "status", width: 12 },
      { header: "Last Updated", key: "updatedAt", width: 20 },
    ]

    const rows = products.map((p) => ({
      mainProduct: p.parentProduct?.productName || (p.isMaster ? p.productName : ""),
      modelName: p.modelName || "",
      productCode: p.productCode,
      productName: p.productName,
      category: p.category?.name || "",
      unitPrice: p.unitPrice,
      stock: p.stock,
      description: p.description || "",
      dimensions: p.dimensions || "",
      tableTopFinish: p.tableTopFinish || "",
      legType: p.legType || "",
      storageOptions: p.storageOptions || "",
      chairType: p.chairType || "",
      availableColors: p.availableColors || "",
      warranty: p.warranty || "",
      specifications: p.specifications || "",
      finishMaterial: p.finishMaterial || "",
      dealerPrice: p.dealerPrice,
      interiorPrice: p.interiorPrice,
      projectPrice: p.projectPrice,
      specialPrice: p.specialPrice,
      costPrice: p.costPrice,
      type: p.isMaster ? "Master" : p.parentProductId ? "Variant" : "Standalone",
      status: p.status,
      updatedAt: p.updatedAt.toISOString().replace("T", " ").slice(0, 16),
    }))

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet("Products")
    sheet.columns = columns
    sheet.addRows(rows)
    sheet.getRow(1).font = { bold: true }
    sheet.views = [{ state: "frozen", ySplit: 1 }]

    const stamp = new Date().toISOString().slice(0, 10)
    const buffer = format === "csv" ? await workbook.csv.writeBuffer() : await workbook.xlsx.writeBuffer()

    await prisma.activityLog.create({
      data: {
        userId,
        action: "EXPORTED_PRODUCTS",
        entityType: "PRODUCT",
        entityId: "ALL_PRODUCTS",
        details: `Exported ${rows.length} products as ${format.toUpperCase()}`,
      },
    }).catch((logError) => console.error("Failed to log product export:", logError))

    return new Response(buffer as ArrayBuffer, {
      headers: {
        "Content-Type": format === "csv"
          ? "text/csv; charset=utf-8"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="bosq_products_${stamp}.${format}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Failed to export products:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
