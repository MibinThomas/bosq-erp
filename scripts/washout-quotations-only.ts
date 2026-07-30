import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function main() {
  console.log("Starting data washout for Quotations...");

  console.log("Deleting Quotations...");
  const deletedQuotations = await prisma.quotation.deleteMany({});
  console.log(`Deleted ${deletedQuotations.count} Quotations.`);

  console.log("Washout completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error during washout:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
