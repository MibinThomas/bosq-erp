import prisma from "../src/lib/prisma"

async function consolidateProducts() {
  console.log("Starting product consolidation...")

  const allProducts = await prisma.product.findMany({
    where: { deletedAt: null },
    include: { variants: true }
  })

  // Helper to extract base brand name (e.g., "Avon", "Aero", "Monarch")
  function getMasterName(productName: string, productCode: string): string {
    const cleanName = productName.trim()
    const firstWord = cleanName.split(" ")[0]
    
    // Check known brands
    const knownBrands = ["Avon", "Aero", "Monarch", "Ace", "Elora", "Hida", "Kyro", "Optron", "Zenith", "Kube"]
    for (const brand of knownBrands) {
      if (cleanName.toLowerCase().startsWith(brand.toLowerCase()) || productCode.toLowerCase().startsWith(brand.toLowerCase())) {
        return brand
      }
    }
    return firstWord
  }

  // Group all products by master name
  const groups: Record<string, typeof allProducts> = {}

  for (const prod of allProducts) {
    if (prod.isMaster && prod.productCode.startsWith("MASTER-")) {
      // It's already a master product entry
      const brand = prod.productName.trim()
      if (!groups[brand]) groups[brand] = []
      groups[brand].push(prod)
    } else if (!prod.parentProductId) {
      const brand = getMasterName(prod.productName, prod.productCode)
      if (!groups[brand]) groups[brand] = []
      groups[brand].push(prod)
    }
  }

  console.log("Groups found:", Object.keys(groups))

  for (const [brand, prods] of Object.entries(groups)) {
    // Find or create the Master Product entry
    let master = prods.find(p => p.isMaster && p.productCode === `MASTER-${brand.toUpperCase()}`)
    
    if (!master) {
      const masterCode = `MASTER-${brand.toUpperCase().replace(/[^A-Z0-9]/g, "")}`
      master = await prisma.product.findFirst({ where: { productCode: masterCode } })
    }

    if (!master) {
      const sample = prods[0]
      master = await prisma.product.create({
        data: {
          productCode: `MASTER-${brand.toUpperCase().replace(/[^A-Z0-9]/g, "")}`,
          productName: brand,
          isMaster: true,
          categoryId: sample.categoryId,
          description: `${brand} Executive & Ergonomic Series`,
          status: "ACTIVE",
          warranty: "3 Years",
        }
      })
      console.log(`Created Master Product: ${brand} (${master.productCode})`)
    } else {
      // Ensure master has isMaster: true and productName is clean
      await prisma.product.update({
        where: { id: master.id },
        data: {
          isMaster: true,
          productName: brand,
          parentProductId: null
        }
      })
      console.log(`Updated Master Product: ${brand} (${master.productCode})`)
    }

    // Link all standalone non-master products in this group as variants of `master`
    for (const p of prods) {
      if (p.id === master.id) continue

      // Clean variant attributes
      const modelName = p.chairType || p.modelName || p.productName.replace(brand, "").trim()
      await prisma.product.update({
        where: { id: p.id },
        data: {
          isMaster: false,
          parentProductId: master.id,
          modelName: modelName || "Standard",
        }
      })
      console.log(`  Linked variant ${p.productCode} (${p.productName}) -> Master ${master.productName}`)
    }
  }

  console.log("Consolidation complete!")
}

consolidateProducts()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
