const fs = require("fs");
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

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  try {
    const masterProducts = await prisma.product.findMany({
      where: {
        deletedAt: null,
        parentProductId: null,
      },
      include: {
        category: true,
        variants: {
          where: { deletedAt: null },
          include: { category: true },
          orderBy: { productCode: "asc" }
        }
      },
      orderBy: { productName: "asc" },
    });

    console.log(`Master Products Count: ${masterProducts.length}`);
    masterProducts.forEach(m => {
      console.log(`- Master: ${m.productName} (${m.productCode}), Category: ${m.category.name}, Variants: ${m.variants.length}`);
      m.variants.slice(0, 3).forEach(v => {
        console.log(`   └─ Variant: ${v.productName} [SKU: ${v.productCode}], Price: AED ${v.projectPrice}, Stock: ${v.stock}, Color: ${v.availableColors}`);
      });
      if (m.variants.length > 3) {
        console.log(`   └─ ... and ${m.variants.length - 3} more variants`);
      }
    });

  } catch (err) {
    console.error("Verification failed:", err);
  } finally {
    await pool.end();
  }
}

run();
