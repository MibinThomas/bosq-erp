import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.client.groupBy({
    by: ['clientId'],
    _count: { clientId: true },
    having: { clientId: { _count: { gt: 1 } } }
  });
  console.log('Duplicate clients:', clients);
  
  const quotes = await prisma.quotation.groupBy({
    by: ['quotationNumber'],
    _count: { quotationNumber: true },
    having: { quotationNumber: { _count: { gt: 1 } } }
  });
  console.log('Duplicate quotes:', quotes);
}
main().catch(console.error).finally(() => prisma.$disconnect());
