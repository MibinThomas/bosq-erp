import prisma from "../src/lib/prisma";

export function extractSubProductName(productName: string, masterName?: string, modelName?: string | null): string {
  if (modelName && modelName.trim() && modelName !== "Standard" && modelName !== masterName) {
    return modelName.trim();
  }

  let name = productName.trim();
  name = name.replace(/\b\d{3,5}\s*[x×X]\s*\d{3,5}(\s*[x×X]\s*\d{3,5})?\s*(mm)?\b/gi, "").trim();

  const parts = name.split(/\s+–\s+|\s+-\s+|,\s+|\s+\|\s+/);
  let baseTitle = parts[0].trim();
  baseTitle = baseTitle.replace(/,\s*.*$/, "").trim();

  if (!baseTitle && masterName) return masterName;
  return baseTitle || productName;
}

async function updateHierarchy() {
  console.log("Fast-updating modelName for all product variants...");

  const masterProducts = await prisma.product.findMany({
    where: { isMaster: true, deletedAt: null },
    include: { variants: { where: { deletedAt: null } } }
  });

  let totalUpdated = 0;

  for (const master of masterProducts) {
    // Group variants by computed sub-product model
    const modelToIds: Record<string, string[]> = {};

    for (const v of master.variants) {
      const computedModel = extractSubProductName(v.productName, master.productName, v.modelName);
      if (computedModel && computedModel !== v.modelName) {
        if (!modelToIds[computedModel]) modelToIds[computedModel] = [];
        modelToIds[computedModel].push(v.id);
      }
    }

    for (const [model, ids] of Object.entries(modelToIds)) {
      const res = await prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { modelName: model }
      });
      totalUpdated += res.count;
    }
  }

  console.log(`Successfully batch updated modelName for ${totalUpdated} variants!`);
}

updateHierarchy().finally(() => prisma.$disconnect());
