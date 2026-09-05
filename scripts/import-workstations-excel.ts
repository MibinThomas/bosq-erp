import path from "path"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import xlsx from "xlsx"

const PROD_DB_URL = "postgresql://neondb_owner:npg_kSwG9Ic8MNyx@ep-old-term-adz4r5o6-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

async function importWorkstations() {
  const excelPath = "C:\\Users\\Lazim\\Downloads\\erp.xlsx"
  console.log(`Reading Excel file: ${excelPath}...`)

  const workbook = xlsx.readFile(excelPath)
  const sheetName = workbook.SheetNames.includes("product_variants")
    ? "product_variants"
    : workbook.SheetNames[0]

  const worksheet = workbook.Sheets[sheetName]
  const rows: any[] = xlsx.utils.sheet_to_json(worksheet)

  console.log(`Found ${rows.length} rows in sheet "${sheetName}".`)

  const pool = new pg.Pool({
    connectionString: PROD_DB_URL,
    ssl: { rejectUnauthorized: false },
  })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    // 1. Ensure "Workstations" category exists
    let category = await prisma.productCategory.findFirst({
      where: {
        OR: [
          { name: { equals: "Workstations", mode: "insensitive" } },
          { name: { equals: "Desks and Workstations, Workstation", mode: "insensitive" } },
        ],
      },
    })

    if (!category) {
      category = await prisma.productCategory.create({
        data: {
          name: "Workstations",
          description: "Office workstations and desks systems",
        },
      })
      console.log(`Created Category: "Workstations" (${category.id})`)
    } else {
      console.log(`Using Category: "${category.name}" (${category.id})`)
    }

    let successCount = 0
    let skipCount = 0

    for (const row of rows) {
      const productCode = (row["Product Code"] || "").trim()
      const productName = (row["Product Name"] || "").trim()
      const description = row["Product Description"] || null
      const specifications = row["Specifications / Details"] || null
      const basePrice = parseFloat(row["Base Price (AED)"]) || 0
      const tableTopFinish = row["Table Top Finish (for workstations)"] ? String(row["Table Top Finish (for workstations)"]).trim() : null
      const legType = row["Leg Type (for workstations)"] ? String(row["Leg Type (for workstations)"]).trim() : null
      const dimensions = row["Dimensions"] ? String(row["Dimensions"]).trim() : null
      const stock = parseInt(row["Stock Quantity"]) || 0

      if (!productCode || !productName) {
        console.warn(`Skipping invalid row: ${JSON.stringify(row)}`)
        skipCount++
        continue
      }

      await prisma.product.upsert({
        where: { productCode },
        update: {
          productName,
          categoryId: category.id,
          description,
          specifications,
          unitPrice: basePrice,
          interiorPrice: basePrice,
          dealerPrice: basePrice,
          projectPrice: basePrice,
          specialPrice: basePrice,
          tableTopFinish,
          legType,
          dimensions,
          stock,
          status: "ACTIVE",
          deletedAt: null,
        },
        create: {
          productCode,
          productName,
          categoryId: category.id,
          description,
          specifications,
          unitPrice: basePrice,
          costPrice: 0,
          interiorPrice: basePrice,
          dealerPrice: basePrice,
          projectPrice: basePrice,
          specialPrice: basePrice,
          warranty: "5 Years",
          tableTopFinish,
          legType,
          dimensions,
          stock,
          status: "ACTIVE",
        },
      })

      successCount++
    }

    console.log(`\nImport completed! Successfully imported/upserted: ${successCount} products. Skipped: ${skipCount}.`)

    // Verify total count in category
    const totalInCat = await prisma.product.count({
      where: { categoryId: category.id, deletedAt: null },
    })
    console.log(`Total active products in category "${category.name}": ${totalInCat}`)
  } catch (error) {
    console.error("Error during workstations import:", error)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

importWorkstations()
