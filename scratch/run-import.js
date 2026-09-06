const fs = require("fs");
const path = require("path");

if (fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
}

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
const XLSX = require("xlsx");

const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_kSwG9Ic8MNyx@ep-old-term-adz4r5o6-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require";
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  try {
    console.log("Starting import of bosq_bulk_update.xlsx...");
    const workbook = XLSX.readFile("public/uploads/bosq_bulk_update.xlsx");

    const baseRows = XLSX.utils.sheet_to_json(workbook.Sheets["product_base"]);
    const modelRows = XLSX.utils.sheet_to_json(workbook.Sheets["product_models"]);
    const variantRows = XLSX.utils.sheet_to_json(workbook.Sheets["product_variants"]);

    console.log(`Found ${baseRows.length} bases, ${modelRows.length} models, ${variantRows.length} variants.`);

    const modelCodeMap = {};
    modelRows.forEach((m) => {
      if (m.base_title && m.title) {
        const key = `${String(m.base_title).trim().toLowerCase()}_${String(m.title).trim().toLowerCase()}`;
        modelCodeMap[key] = String(m.code || "").trim();
      }
    });

    let chairsCategory = await prisma.productCategory.findFirst({
      where: { name: { contains: "Chair", mode: "insensitive" } },
    });

    if (!chairsCategory) {
      chairsCategory = await prisma.productCategory.create({
        data: {
          name: "Chairs",
          description: "Office & Executive Ergonomic Chairs",
        },
      });
    }

    const masterProductMap = {};

    for (const base of baseRows) {
      const title = String(base.title || "").trim();
      if (!title) continue;

      const masterCode = `MASTER-${title.toUpperCase().replace(/[^A-Z0-9]/g, "")}`;
      const masterProduct = await prisma.product.upsert({
        where: { productCode: masterCode },
        update: {
          productName: title,
          isMaster: true,
          categoryId: chairsCategory.id,
          status: "ACTIVE",
        },
        create: {
          productCode: masterCode,
          productName: title,
          isMaster: true,
          categoryId: chairsCategory.id,
          description: `${title} Series Ergonomic & Executive Office Seating Collection`,
          status: "ACTIVE",
          warranty: "3 Years",
        },
      });

      masterProductMap[title.toLowerCase()] = masterProduct;
      console.log(`Created/Updated Master Product: ${title} (${masterProduct.id})`);
    }

    let margins = { dealer: 15, interior: 30, direct: 50, online: 75 };

    for (const v of variantRows) {
      const baseTitle = String(v.base_title || "").trim().toLowerCase();
      const modelTitle = String(v.model_title || "").trim();
      const sku = String(v.sku || "").trim();
      const title = String(v.title || "").trim();

      if (!sku || !title) continue;

      const masterProduct = masterProductMap[baseTitle];
      const modelKey = `${baseTitle}_${modelTitle.toLowerCase()}`;
      const modelCode = modelCodeMap[modelKey] || "";

      let color = "Standard";
      if (v.attributes) {
        const attrStr = String(v.attributes);
        const match = attrStr.match(/color:([a-z0-9-]+)/i);
        if (match && match[1]) {
          color = match[1]
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
        }
      }

      const cost = parseFloat(v["price without vat"]) || 200.0;
      const dealerPrice = Number((cost / (1 - margins.dealer / 100)).toFixed(2));
      const interiorPrice = Number((cost / (1 - margins.interior / 100)).toFixed(2));
      const projectPrice = Number((cost / (1 - margins.direct / 100)).toFixed(2));
      const specialPrice = Number((cost / (1 - margins.online / 100)).toFixed(2));

      const coverImage = v.cover_image ? String(v.cover_image).trim() : null;
      const galleryImages = v.images ? String(v.images).split(",").map((s) => s.trim()).filter(Boolean) : [];
      const primaryImage = coverImage || (galleryImages.length > 0 ? galleryImages[0] : null);

      const specs = v.details ? String(v.details).trim() : null;
      const desc = v.additional_details ? String(v.additional_details).trim() : v.description ? String(v.description).trim() : null;

      const variantAttributes = {
        color,
        modelName: modelTitle,
        modelCode,
      };

      await prisma.product.upsert({
        where: { productCode: sku },
        update: {
          productName: title,
          parentProductId: masterProduct ? masterProduct.id : undefined,
          isMaster: false,
          modelName: modelTitle || undefined,
          modelCode: modelCode || undefined,
          categoryId: chairsCategory.id,
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
          categoryId: chairsCategory.id,
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
      });

      console.log(`Saved Variant: ${sku} -> ${title}`);
    }

    console.log("SUCCESS: All master products and variants imported!");
  } catch (err) {
    console.error("Import error:", err);
  } finally {
    await pool.end();
  }
}

run();
