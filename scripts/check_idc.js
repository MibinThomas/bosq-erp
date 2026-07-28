require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString, max: 2 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const user = await prisma.user.findFirst({
    where: { role: "INTERIOR_DESIGN_CONSULTANT" },
    include: {
      clientAssignments: true,
      accessLogs: { take: 1 }
    }
  });

  if (!user) {
    console.log("No IDC users found.");
    return;
  }
  
  console.log("Found user:", user.email, user.id);
  
  const clientsWhereSalesperson = await prisma.client.findMany({
    where: { salespersonId: user.id }
  });
  console.log("Clients as salesperson:", clientsWhereSalesperson.length);
  
  const assignedClients = await prisma.clientAssignment.findMany({
    where: { userId: user.id }
  });
  console.log("Assigned clients in table:", assignedClients.length);
  
  const role = await prisma.role.findFirst({
    where: { name: "INTERIOR_DESIGN_CONSULTANT" },
    include: { permissions: { where: { module: "CLIENTS" } } }
  });
  console.log("Role ownership for clients:", role?.permissions[0]?.ownership);
  console.log("Role view perm:", role?.permissions[0]?.view);
  
  process.exit(0);
}

check();
