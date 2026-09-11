import * as XLSX from "xlsx"
import prisma from "@/lib/prisma"

export interface ImportResult {
  success: boolean
  masterCount: number
  variantCount: number
  errors: string[]
}

export function formatSpecificationsText(rawSpecs?: string | null): string | null {
  if (!rawSpecs || !rawSpecs.trim()) return null

  const trimmed = rawSpecs.trim()
  if (trimmed === "-" || trimmed.toLowerCase() === "none" || trimmed.toLowerCase() === "not specified") {
    return null
  }

  if (/<(ul|ol|li)\b[^>]*>/i.test(trimmed)) {
    return trimmed
  }

  let cleaned = trimmed
    .replace(/^<(p|div)[^>]*>/i, "")
    .replace(/<\/(p|div)>$/i, "")
    .replace(/&nbsp;/gi, " ")
    .trim()

  cleaned = cleaned.replace(/\.\s+(?=[A-Z][a-zA-Z0-9\s_\-]{1,25}:)/g, "; ")

  const rawItems = cleaned
    .split(/;|\r?\n|\|/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== "-" && s.toLowerCase() !== "none" && s.toLowerCase() !== "not specified")
    .filter((s) => !/^(product\s+specifications|configured\s+attributes|specifications|attributes)$/i.test(s))

  if (rawItems.length === 0) return null

  const listElements = rawItems.map((item) => {
    const colonIndex = item.indexOf(":")
    if (colonIndex > 0 && colonIndex < item.length - 1) {
      const key = item.substring(0, colonIndex).trim()
      const val = item.substring(colonIndex + 1).trim()
      const formattedKey = key.charAt(0).toUpperCase() + key.slice(1)
      return `<li><strong>${formattedKey}:</strong> ${val}</li>`
    }
    return `<li>${item}</li>`
  })

  return `<ul>${listElements.join("")}</ul>`
}

const inferCategoryName = (categoryFromCsv?: string, productName?: string, productCode?: string): string => {
  const cleanCat = (categoryFromCsv || "").trim()
  if (cleanCat && cleanCat.toLowerCase() !== "chairs" && cleanCat.toLowerCase() !== "general") {
    return cleanCat
  }

  const text = `${productName || ""} ${productCode || ""}`.toLowerCase()
  
  if (text.includes("reception")) return "Reception Desk"
  if (text.includes("conference") || text.includes("meeting table") || (text.includes("meeting") && text.includes("table"))) return "Meeting Tables"
  if (text.includes("executive desk") || text.includes("exec desk")) return "Executive Desks"
  if (text.includes("workstation") || text.includes("desk") || text.includes("bench") || text.includes("f2f") || (text.includes("seater") && !text.includes("sofa"))) return "Workstations"
  if (text.includes("storage") || text.includes("credenza") || text.includes("pedestal") || text.includes("cabinet") || text.includes("drawer") || text.includes("locker") || text.includes("shelf")) return "Storage"
  if (text.includes("sofa") || text.includes("lounge") || text.includes("couch") || text.includes("pouf")) return "Sofas"
  if (text.includes("pod") || text.includes("booth") || text.includes("acoustic")) return "Acoustic Pods"
  if (text.includes("chair") || text.includes("seating") || text.includes("high back") || text.includes("mid back") || text.includes("low back") || text.includes("visitor")) return "Chairs"
  
  return cleanCat || "General"
}

export async function importBosqBulkData(filePath: string = "public/uploads/bosq_bulk_update.xlsx"): Promise<ImportResult> {
  const errors: string[] = []
  let masterCount = 0
  let variantCount = 0

  try {
    const workbook = XLSX.readFile(filePath)
    
    // Validate sheets
    if (!workbook.Sheets["product_base"] || !workbook.Sheets["product_variants"]) {
      throw new Error("Invalid file structure. Required sheets 'product_base' and 'product_variants' missing.")
    }

    const baseRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets["product_base"])
    const modelRows: any[] = workbook.Sheets["product_models"] ? XLSX.utils.sheet_to_json(workbook.Sheets["product_models"]) : []
    const variantRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets["product_variants"])

    // Build model codes map: key = `${base_title}_${model_title}` => code
    const modelCodeMap: Record<string, string> = {}
    modelRows.forEach((m) => {
      if (m.base_title && m.title) {
        const key = `${String(m.base_title).trim().toLowerCase()}_${String(m.title).trim().toLowerCase()}`
        modelCodeMap[key] = String(m.code || "").trim()
      }
    })

    // Map base titles to Master Product IDs
    const masterProductMap: Record<string, any> = {}

    // Helper to get or create category dynamically
    const catCache: Record<string, string> = {}
    const getOrCreateCategory = async (catName: string) => {
      const trimmed = catName.trim()
      if (catCache[trimmed]) return catCache[trimmed]
      let category = await prisma.productCategory.findFirst({
        where: { name: { equals: trimmed, mode: "insensitive" } },
      })
      if (!category) {
        category = await prisma.productCategory.create({
          data: {
            name: trimmed,
            description: `${trimmed} category`,
          },
        })
      }
      catCache[trimmed] = category.id
      return category.id
    }

    // Default pricing margins
    let margins = { dealer: 15, interior: 30, direct: 50, online: 75 }
    try {
      const setting = await prisma.systemSetting.findUnique({ where: { key: "PRICING_MARGINS" } })
      if (setting) {
        margins = JSON.parse(setting.value)
      }
    } catch (e) {
      // fallback to default
    }

    // 1. Process Master Products (product_base)
    for (const base of baseRows) {
      const title = String(base.title || "").trim()
      if (!title) continue

      const masterCode = `MASTER-${title.toUpperCase().replace(/[^A-Z0-9]/g, "")}`
      const targetCatName = inferCategoryName(base.category || base.category_name, title, masterCode)
      const categoryId = await getOrCreateCategory(targetCatName)

      // Check existing master or create
      const masterProduct = await prisma.product.upsert({
        where: { productCode: masterCode },
        update: {
          productName: title,
          isMaster: true,
          categoryId: categoryId,
          status: "ACTIVE",
        },
        create: {
          productCode: masterCode,
          productName: title,
          isMaster: true,
          categoryId: categoryId,
          description: `${title} Series Collection`,
          status: "ACTIVE",
          warranty: "3 Years",
        },
      })

      masterProductMap[title.toLowerCase()] = masterProduct
      masterCount++
    }

    // 2. Process Variants (product_variants)
    for (const v of variantRows) {
      const baseTitle = String(v.base_title || "").trim().toLowerCase()
      const modelTitle = String(v.model_title || "").trim()
      const sku = String(v.sku || "").trim()
      const title = String(v.title || "").trim()

      if (!sku || !title) continue

      const masterProduct = masterProductMap[baseTitle]
      const modelKey = `${baseTitle}_${modelTitle.toLowerCase()}`
      const modelCode = modelCodeMap[modelKey] || ""

      const targetCatName = inferCategoryName(v.category || v.category_name, title, sku)
      const categoryId = await getOrCreateCategory(targetCatName)

      // Extract attributes (e.g. "color:tan-brown:0")
      let color = "Standard"
      if (v.attributes) {
        const attrStr = String(v.attributes)
        const match = attrStr.match(/color:([a-z0-9-]+)/i)
        if (match && match[1]) {
          color = match[1]
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ")
        }
      }

      // Cost price & margin calculations
      const cost = parseFloat(v["price without vat"]) || 200.0
      const dealerPrice = Number((cost / (1 - margins.dealer / 100)).toFixed(2))
      const interiorPrice = Number((cost / (1 - margins.interior / 100)).toFixed(2))
      const projectPrice = Number((cost / (1 - margins.direct / 100)).toFixed(2))
      const specialPrice = Number((cost / (1 - margins.online / 100)).toFixed(2))

      // Images
      const coverImage = v.cover_image ? String(v.cover_image).trim() : null
      const galleryImages = v.images ? String(v.images).split(",").map((s) => s.trim()).filter(Boolean) : []
      const primaryImage = coverImage || (galleryImages.length > 0 ? galleryImages[0] : null)

      // Specifications & description
      const specs = formatSpecificationsText(v.details ? String(v.details).trim() : null)
      const desc = v.additional_details ? String(v.additional_details).trim() : v.description ? String(v.description).trim() : null

      const variantAttributes = {
        color,
        modelName: modelTitle,
        modelCode,
      }

      await prisma.product.upsert({
        where: { productCode: sku },
        update: {
          productName: title,
          parentProductId: masterProduct ? masterProduct.id : undefined,
          isMaster: false,
          modelName: modelTitle || undefined,
          modelCode: modelCode || undefined,
          categoryId: categoryId,
          costPrice: cost,
          unitPrice: projectPrice,
          dealerPrice,
          interiorPrice,
          projectPrice,
          specialPrice,
          stock: parseInt(v.stock, 10) || 0,
          status: "ACTIVE",
          availableColors: color,
          chairType: modelTitle || "Executive Chair",
          imageUrl: primaryImage,
          imageUrls: galleryImages,
          specifications: specs,
          description: desc,
          warranty: "3 Years",
          variantAttributes: variantAttributes,
        },
        create: {
          productCode: sku,
          productName: title,
          parentProductId: masterProduct ? masterProduct.id : null,
          isMaster: false,
          modelName: modelTitle || null,
          modelCode: modelCode || null,
          categoryId: categoryId,
          costPrice: cost,
          unitPrice: projectPrice,
          dealerPrice,
          interiorPrice,
          projectPrice,
          specialPrice,
          stock: parseInt(v.stock, 10) || 0,
          status: "ACTIVE",
          availableColors: color,
          chairType: modelTitle || "Executive Chair",
          imageUrl: primaryImage,
          imageUrls: galleryImages,
          specifications: specs,
          description: desc,
          warranty: "3 Years",
          variantAttributes: variantAttributes,
        },
      })

      variantCount++
    }

    return {
      success: true,
      masterCount,
      variantCount,
      errors,
    }
  } catch (err: any) {
    console.error("Failed to import bosq_bulk_update.xlsx:", err)
    return {
      success: false,
      masterCount,
      variantCount,
      errors: [err.message || "Import failed"],
    }
  }
}
