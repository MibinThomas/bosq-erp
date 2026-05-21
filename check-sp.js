const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const settings = await prisma.systemSetting.findMany({
    where: { key: { startsWith: 'sharepoint_' } }
  });
  console.log(settings);
  await prisma.$disconnect();
}
run();
