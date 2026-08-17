import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"

import { getSetting } from "@/lib/settings"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userRole = (session.user as any).role || ""
    const isSuperAdmin = userRole === "SUPER_ADMIN"
    const isConfiguratorEnabled = (await getSetting("enable_workstation_configurator")) === "true"

    if (!isSuperAdmin && !isConfiguratorEnabled) {
      return NextResponse.json({
        success: true,
        enabled: false,
        models: [],
      })
    }

    // Fetch all active products that have category or attribute data
    const products = await prisma.product.findMany({
      where: {
        deletedAt: null,
        status: "ACTIVE",
      },
      include: {
        category: true,
      },
      orderBy: { productName: "asc" },
    })

    // Filter products that belong to Workstation categories or have workstation attributes
    const workstationProducts = products.filter((p) => {
      const catName = (p.category?.name || "").toLowerCase()
      const isWorkstationCat = catName.includes("workstation") || catName.includes("desk") || catName.includes("table") || catName.includes("office")
      const hasAttributes = !!(p.legType || p.tableTopFinish || p.dimensions || p.storageOptions || p.finishMaterial)
      return isWorkstationCat || hasAttributes
    })

    // If no workstation-specific category matches, include all active products with attributes or all products
    const targetProducts = workstationProducts.length > 0 ? workstationProducts : products

    // Helper to extract base model name from productName (e.g., "Zen X Single Seater - White" -> "Zen X Single Seater")
    const getModelName = (p: typeof products[0]) => {
      let name = p.productName.trim()
      // If product name has hyphen delimiter containing attributes, extract base name
      if (name.includes(" - ")) {
        name = name.split(" - ")[0].trim()
      }
      return name
    }

    // Group products by model
    const modelsMap: Record<string, {
      modelName: string
      categoryId: string
      categoryName: string
      legTypes: Set<string>
      tableTopFinishes: Set<string>
      dimensions: Set<string>
      storageOptions: Set<string>
      finishMaterials: Set<string>
      combinations: Array<{
        id: string
        sku: string
        productName: string
        legType: string | null
        tableTopFinish: string | null
        dimensions: string | null
        storageOptions: string | null
        finishMaterial: string | null
      }>
    }> = {}

    for (const p of targetProducts) {
      const modelName = getModelName(p)
      if (!modelsMap[modelName]) {
        modelsMap[modelName] = {
          modelName,
          categoryId: p.categoryId,
          categoryName: p.category?.name || "Workstations",
          legTypes: new Set<string>(),
          tableTopFinishes: new Set<string>(),
          dimensions: new Set<string>(),
          storageOptions: new Set<string>(),
          finishMaterials: new Set<string>(),
          combinations: [],
        }
      }

      const group = modelsMap[modelName]
      if (p.legType) group.legTypes.add(p.legType.trim())
      if (p.tableTopFinish) group.tableTopFinishes.add(p.tableTopFinish.trim())
      if (p.dimensions) group.dimensions.add(p.dimensions.trim())
      if (p.storageOptions) group.storageOptions.add(p.storageOptions.trim())
      if (p.finishMaterial) group.finishMaterials.add(p.finishMaterial.trim())

      group.combinations.push({
        id: p.id,
        sku: p.productCode,
        productName: p.productName,
        legType: p.legType ? p.legType.trim() : null,
        tableTopFinish: p.tableTopFinish ? p.tableTopFinish.trim() : null,
        dimensions: p.dimensions ? p.dimensions.trim() : null,
        storageOptions: p.storageOptions ? p.storageOptions.trim() : null,
        finishMaterial: p.finishMaterial ? p.finishMaterial.trim() : null,
      })
    }

    // Convert Sets to Arrays for JSON response
    const models = Object.values(modelsMap).map((m) => ({
      modelName: m.modelName,
      categoryId: m.categoryId,
      categoryName: m.categoryName,
      legTypes: Array.from(m.legTypes).sort(),
      tableTopFinishes: Array.from(m.tableTopFinishes).sort(),
      dimensions: Array.from(m.dimensions).sort(),
      storageOptions: Array.from(m.storageOptions).sort(),
      finishMaterials: Array.from(m.finishMaterials).sort(),
      combinations: m.combinations,
    }))

    return NextResponse.json({
      success: true,
      enabled: true,
      models,
    })
  } catch (error: any) {
    console.error("Failed to fetch product configurator metadata:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
