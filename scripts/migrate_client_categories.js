require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString, max: 2 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting Client Type Migration...");

  // 1. Migrate Clients
  const clients = await prisma.client.findMany();
  let clientUpdates = 0;

  for (const client of clients) {
    let newType = null;
    const oldType = client.clientType?.trim().toLowerCase() || "";

    if (oldType === "dealer") newType = "Dealer";
    else if (oldType === "interior") newType = "Interior";
    else if (oldType === "direct" || oldType === "corporate" || oldType === "government" || oldType === "project") newType = "Project";
    else if (oldType === "online" || oldType === "special") newType = "Special";
    else if (!oldType) newType = "Project";

    if (newType && client.clientType !== newType) {
      await prisma.client.update({
        where: { id: client.id },
        data: { clientType: newType }
      });
      clientUpdates++;
    }
  }
  console.log(`Updated ${clientUpdates} Clients.`);

  // 2. Migrate Quotations
  const quotations = await prisma.quotation.findMany();
  let quoteUpdates = 0;

  for (const quote of quotations) {
    let newSeg = null;
    const oldSeg = quote.customerSegment?.trim().toLowerCase() || "";

    if (oldSeg === "dealer") newSeg = "Dealer";
    else if (oldSeg === "interior") newSeg = "Interior";
    else if (oldSeg === "direct" || oldSeg === "corporate" || oldSeg === "government" || oldSeg === "project") newSeg = "Project";
    else if (oldSeg === "online" || oldSeg === "special") newSeg = "Special";
    else if (!oldSeg) newSeg = "Project";

    if (newSeg && quote.customerSegment !== newSeg) {
      await prisma.quotation.update({
        where: { id: quote.id },
        data: { customerSegment: newSeg }
      });
      quoteUpdates++;
    }
  }
  console.log(`Updated ${quoteUpdates} Quotations.`);

  console.log("Migration Complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
