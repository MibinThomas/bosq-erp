require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function backfill() {
  console.log("Starting quotation parent link backfill...");
  
  // Find all quotations with parentId null
  const nullParentQuotes = await prisma.quotation.findMany({
    where: { parentId: null }
  });

  console.log(`Found ${nullParentQuotes.length} quotations with parentId: null`);

  // Build a lookup map of base quotation numbers to root quotation IDs
  const rootMap = new Map();
  for (const q of nullParentQuotes) {
    if (!q.quotationNumber.toLowerCase().includes("copy")) {
      rootMap.set(q.quotationNumber.trim(), q.id);
      const baseMatch = q.quotationNumber.match(/^([IDP]\d+)/i);
      if (baseMatch) {
        if (!rootMap.has(baseMatch[1])) {
          rootMap.set(baseMatch[1], q.id);
        }
      }
    }
  }

  let updatedCount = 0;

  for (const q of nullParentQuotes) {
    if (q.quotationNumber.toLowerCase().includes("copy") || (q.notes && q.notes.toLowerCase().includes("copied from"))) {
      let sourceNum = q.quotationNumber.replace(/\s+Copy.*$/gi, "").trim();
      
      let rootId = rootMap.get(sourceNum);
      if (!rootId) {
        const baseMatch = sourceNum.match(/^([IDP]\d+)/i);
        if (baseMatch) {
          rootId = rootMap.get(baseMatch[1]);
        }
      }

      if (rootId && rootId !== q.id) {
        console.log(`Linking copied quote ${q.quotationNumber} (${q.id}) -> root parent ${rootId}`);
        await prisma.quotation.update({
          where: { id: q.id },
          data: { parentId: rootId }
        });
        updatedCount++;
      } else {
        console.log(`Could not find parent for copied quote ${q.quotationNumber} (${q.id})`);
      }
    }
  }

  console.log(`Backfill complete. Updated ${updatedCount} quotation records.`);
}

backfill()
  .catch(err => {
    console.error("Backfill failed:", err);
  })
  .finally(async () => {
    await pool.end();
  });
