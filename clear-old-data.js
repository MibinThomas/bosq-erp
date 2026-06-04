const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    await prisma.product.updateMany({
      data: {
        dimensions: null,
        availableColors: null
      }
    });
    console.log('Successfully cleared old dimensions and availableColors data.');
  } catch (err) {
    console.error('Error clearing data:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
