import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { getSetting } from "@/lib/settings"

// Helper to extract color attribute from product
const getColor = (p: any) => {
  if (p.availableColors && p.availableColors.trim() && p.availableColors.trim().toLowerCase() !== "standard") {
    return p.availableColors.trim()
  }
  const nameParts = p.productName.split(/\s*[-–|]\s*/)
  if (nameParts.length > 1) {
    const lastPart = nameParts[nameParts.length - 1].trim()
    if (lastPart && !/^\d+/.test(lastPart) && lastPart.length < 25 && !lastPart.toLowerCase().includes("custom")) {
      return lastPart
    }
  }
  const code = (p.productCode || "").toUpperCase()
  const codeParts = code.split("-")
  if (codeParts.length > 1) {
    const lastCode = codeParts[codeParts.length - 1]
    const knownColors = ["BLACK", "GREY", "GRAY", "CREAM", "WHITE", "BROWN", "TAN", "RED", "BLUE", "GREEN", "YELLOW", "ORANGE", "BEIGE"]
    if (knownColors.includes(lastCode)) {
      return lastCode.charAt(0) + lastCode.slice(1).toLowerCase()
    }
    if (codeParts.length > 2) {
      const doubleCode = `${codeParts[codeParts.length - 2]}-${lastCode}`
      if (["TAN-BROWN", "DARK-GREY", "LIGHT-GREY"].includes(doubleCode)) {
        return doubleCode.split("-").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ")
      }
    }
  }
  return p.availableColors && p.availableColors.trim() ? p.availableColors.trim() : null
}

// Helper to extract chair type attribute from product
const getChairType = (p: any) => {
  if (p.chairType && p.chairType.trim()) {
    const val = p.chairType.trim()
    return val
  }
  const lowerName = p.productName.toLowerCase()
  if (lowerName.includes("high back")) return "High Back"
  if (lowerName.includes("mid back")) return "Mid Back"
  if (lowerName.includes("low back")) return "Low Back"
  if (lowerName.includes("visitor")) return "Visitor Chair"
  if (lowerName.includes("executive")) return "Executive Chair"
  if (lowerName.includes("meeting")) return "Meeting Chair"
  if (lowerName.includes("lounge")) return "Lounge Chair"
  return null
}

// Helper to extract Series Name (Level 1)
const getSeriesName = (p: any) => {
  if (p.parentProduct?.productName && p.parentProduct.productName.trim()) {
    return p.parentProduct.productName.trim()
  }
  if (p.category?.name && p.category.name.trim()) {
    return p.category.name.trim()
  }
  return "General Catalog"
}

// Helper to extract Sub-Product / Model Name (Level 2)
const getSubProductName = (p: any, seriesName: string) => {
  if (p.modelName && p.modelName.trim() && p.modelName.trim() !== "Standard" && p.modelName.trim() !== seriesName) {
    return p.modelName.trim()
  }

  const code = (p.productCode || "").toUpperCase()
  const name = p.productName.trim()
  const lowerName = name.toLowerCase()

  if (code.startsWith("ZENX-S") || lowerName.includes("single seater")) {
    if (lowerName.includes("zen x")) return "Zen X Single Seater Workstation"
    if (lowerName.includes("alpha")) return "Alpha Single Seater Workstation"
  }
  if (code.startsWith("ZENX-F2F") || code.startsWith("ZENX-2S") || lowerName.includes("2 seater") || lowerName.includes("face-to-face")) {
    if (lowerName.includes("zen x")) return "Zen X Face-to-Face 2 Seater Workstation"
    if (lowerName.includes("alpha")) return "Alpha 2 Seater Workstation"
  }
  if (code.startsWith("ZENX-4S") || lowerName.includes("4 seater")) {
    if (lowerName.includes("zen x")) return "Zen X 4-Seater Workstation"
    if (lowerName.includes("alpha")) return "Alpha 4-Seater Workstation"
  }
  if (code.startsWith("ZENX-6S") || lowerName.includes("6 seater")) {
    if (lowerName.includes("zen x")) return "Zen X 6-Seater Workstation"
    if (lowerName.includes("alpha")) return "Alpha 6-Seater Workstation"
  }

  // Strip dimension specs e.g. 2000x750mm or 1000 x 600 mm
  let cleanName = name.replace(/\b\d{3,5}\s*[x×X]\s*\d{3,5}(\s*[x×X]\s*\d{3,5})?\s*(mm)?\b/gi, "").trim()

  // Split at attribute delimiters
  const parts = cleanName.split(/\s+–\s+|\s+-\s+|,\s+|\s+\|\s+/)
  let baseTitle = parts[0].trim().replace(/,\s*.*$/, "").trim()

  if (baseTitle && baseTitle !== seriesName && baseTitle.length > 2) {
    return baseTitle
  }

  return cleanName || seriesName
}

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
        parentProduct: {
          select: {
            id: true,
            productName: true,
            modelName: true,
          }
        }
      },
      orderBy: { productName: "asc" },
    })

    // Filter out top-level master container products that have no price/stock and have variants
    const targetProducts = products.filter(p => !p.isMaster)

    // Group products by series and sub-product model
    const modelsMap: Record<string, {
      seriesName: string
      modelName: string
      categoryId: string
      categoryName: string
      colors: Set<string>
      chairTypes: Set<string>
      legTypes: Set<string>
      tableTopFinishes: Set<string>
      dimensions: Set<string>
      storageOptions: Set<string>
      finishMaterials: Set<string>
      warranties: Set<string>
      combinations: Array<{
        id: string
        sku: string
        productName: string
        color: string | null
        chairType: string | null
        legType: string | null
        tableTopFinish: string | null
        dimensions: string | null
        storageOptions: string | null
        finishMaterial: string | null
        warranty: string | null
      }>
    }> = {}

    for (const p of targetProducts) {
      const seriesName = getSeriesName(p)
      const subProductName = getSubProductName(p, seriesName)
      const mapKey = `${seriesName}:::${subProductName}`

      if (!modelsMap[mapKey]) {
        modelsMap[mapKey] = {
          seriesName,
          modelName: subProductName,
          categoryId: p.categoryId,
          categoryName: p.category?.name || "Catalog",
          colors: new Set<string>(),
          chairTypes: new Set<string>(),
          legTypes: new Set<string>(),
          tableTopFinishes: new Set<string>(),
          dimensions: new Set<string>(),
          storageOptions: new Set<string>(),
          finishMaterials: new Set<string>(),
          warranties: new Set<string>(),
          combinations: [],
        }
      }

      const group = modelsMap[mapKey]
      const colorVal = getColor(p)
      const chairTypeVal = getChairType(p)

      if (colorVal) group.colors.add(colorVal)
      if (chairTypeVal) group.chairTypes.add(chairTypeVal)
      if (p.legType) group.legTypes.add(p.legType.trim())
      if (p.tableTopFinish) group.tableTopFinishes.add(p.tableTopFinish.trim())
      if (p.dimensions) group.dimensions.add(p.dimensions.trim())
      if (p.storageOptions) group.storageOptions.add(p.storageOptions.trim())
      if (p.finishMaterial) group.finishMaterials.add(p.finishMaterial.trim())
      if (p.warranty) group.warranties.add(p.warranty.trim())

      group.combinations.push({
        id: p.id,
        sku: p.productCode,
        productName: p.productName,
        color: colorVal,
        chairType: chairTypeVal,
        legType: p.legType ? p.legType.trim() : null,
        tableTopFinish: p.tableTopFinish ? p.tableTopFinish.trim() : null,
        dimensions: p.dimensions ? p.dimensions.trim() : null,
        storageOptions: p.storageOptions ? p.storageOptions.trim() : null,
        finishMaterial: p.finishMaterial ? p.finishMaterial.trim() : null,
        warranty: p.warranty ? p.warranty.trim() : null,
      })
    }

    // Convert Sets to Arrays for JSON response and sort configurable models to top
    const models = Object.values(modelsMap)
      .map((m) => ({
        seriesName: m.seriesName,
        modelName: m.modelName,
        categoryId: m.categoryId,
        categoryName: m.categoryName,
        colors: Array.from(m.colors).sort(),
        chairTypes: Array.from(m.chairTypes).sort(),
        legTypes: Array.from(m.legTypes).sort(),
        tableTopFinishes: Array.from(m.tableTopFinishes).sort(),
        dimensions: Array.from(m.dimensions).sort(),
        storageOptions: Array.from(m.storageOptions).sort(),
        finishMaterials: Array.from(m.finishMaterials).sort(),
        warranties: Array.from(m.warranties).sort(),
        combinations: m.combinations,
      }))
      .sort((a, b) => {
        const aCount = a.colors.length + a.chairTypes.length + a.legTypes.length + a.tableTopFinishes.length + a.dimensions.length
        const bCount = b.colors.length + b.chairTypes.length + b.legTypes.length + b.tableTopFinishes.length + b.dimensions.length
        if (aCount !== bCount) return bCount - aCount
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
