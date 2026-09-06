import prisma from "../src/lib/prisma"

async function main() {
  const clients = await prisma.client.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      clientId: true,
      companyName: true,
      contactPerson: true,
      phone: true,
      email: true,
      clientType: true,
      priceCategory: true,
      notes: true,
      salespersonId: true,
      assignments: {
        include: { user: { select: { name: true } } }
      }
    }
  })

  console.log(JSON.stringify(clients, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
