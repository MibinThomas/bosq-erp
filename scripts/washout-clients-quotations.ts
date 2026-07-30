import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function main() {
  console.log("Starting data washout for Clients and Quotations...");

  // 1. Delete Quotations (cascading deletes QuotationItem, QuotationRevision, QuotationAssignment)
  console.log("Deleting Quotations...");
  const deletedQuotations = await prisma.quotation.deleteMany({});
  console.log(`Deleted ${deletedQuotations.count} Quotations.`);

  // 2. Delete BOQs (as they are tied to clients and restrict client deletion)
  console.log("Deleting BOQs...");
  const deletedBoqs = await prisma.boq.deleteMany({});
  console.log(`Deleted ${deletedBoqs.count} BOQs.`);

  // 3. Delete Clients (cascading deletes ClientDocument, ClientAssignment, ClientAccessRequest)
  console.log("Deleting Clients...");
  const deletedClients = await prisma.client.deleteMany({});
  console.log(`Deleted ${deletedClients.count} Clients.`);

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
