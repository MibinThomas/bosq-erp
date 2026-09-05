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
    const settingVal = await getSetting("enable_workstation_configurator")
    const isConfiguratorEnabled = settingVal !== "false"

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

    // Helper to extract clean base model name from productName / productCode
    const getModelName = (p: typeof products[0]) => {
      const code = (p.productCode || "").toUpperCase()
      const name = p.productName.trim()
      const lowerName = name.toLowerCase()

      if (code.startsWith("ZENX-S") || lowerName.includes("single seater")) {
        return "Zen X Single Seater Workstation"
      }
      if (code.startsWith("ZENX-F2F") || code.startsWith("ZENX-2S") || lowerName.includes("2 seater") || lowerName.includes("face-to-face")) {
        return "Zen X Face-to-Face 2 Seater Workstation"
      }
      if (code.startsWith("ZENX-4S") || lowerName.includes("4 seater")) {
        return "Zen X 4-Seater Workstation"
      }
      if (code.startsWith("ZENX-6S") || lowerName.includes("6 seater")) {
        return "Zen X 6-Seater Workstation"
      }

      // General product name normalization: strip out hyphen/pipe delimiters and dimension strings
      let cleanName = name
        .split(/\s*[-–|]\s*/)[0]
        .replace(/\b\d{3,4}\s*[x×]\s*\d{3,4}\s*(mm)?\b/gi, "")
        .trim()

      return cleanName || name
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

    // Convert Sets to Arrays for JSON response and sort configurable models to top
    const models = Object.values(modelsMap)
      .map((m) => ({
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
      .sort((a, b) => {
        const aHasAttr = (a.legTypes.length > 0 || a.tableTopFinishes.length > 0) ? 1 : 0
        const bHasAttr = (b.legTypes.length > 0 || b.tableTopFinishes.length > 0) ? 1 : 0
        if (aHasAttr !== bHasAttr) return bHasAttr - aHasAttr
        return a.modelName.localeCompare(b.modelName)
      })

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

