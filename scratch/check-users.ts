import prisma from "../src/lib/prisma"

async function main() {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, email: true, role: true, isActive: true }
  })
  console.log("Database Users Count:", users.length)
  console.log(JSON.stringify(users, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
