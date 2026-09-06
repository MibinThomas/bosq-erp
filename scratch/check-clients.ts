import prisma from "../src/lib/prisma";

async function checkClients() {
  console.log("Checking client assignments in database...");
  const clients = await prisma.client.findMany({
    where: { deletedAt: null },
    include: {
      assignments: { include: { user: { select: { id: true, name: true, role: true } } } }
    }
  });

  console.log(`Total active clients: ${clients.length}`);
  const users = await prisma.user.findMany({ where: { deletedAt: null }, select: { id: true, name: true, role: true } });
  const userMap = new Map(users.map(u => [u.id, u.name]));

  const byConsultant: Record<string, number> = {};

  clients.forEach(c => {
    let name = "UNASSIGNED";
    if (c.salespersonId && userMap.has(c.salespersonId)) {
      name = userMap.get(c.salespersonId)!;
    } else if (c.assignments && c.assignments.length > 0) {
      name = c.assignments[0].user?.name || "UNASSIGNED";
    }
    byConsultant[name] = (byConsultant[name] || 0) + 1;
  });

  console.log("Client count per salesperson/consultant:");
  console.table(byConsultant);
}

checkClients().finally(() => prisma.$disconnect());
