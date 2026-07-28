require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString, max: 2 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function debug() {
  const users = await prisma.user.findMany({
    where: { role: "INTERIOR_DESIGN_CONSULTANT" },
    include: {
      clientAssignments: true,
      permissionOverrides: true,
    }
  });

  console.log(`Found ${users.length} INTERIOR_DESIGN_CONSULTANT users.`);

  for (const user of users) {
    console.log(`\nUser: ${user.name} (${user.email}) | ID: ${user.id}`);
    
    // Check salespersonId assignments
    const directClients = await prisma.client.count({
      where: { salespersonId: user.id }
    });
    console.log(`Directly assigned clients (salespersonId): ${directClients}`);

    // Check ClientAssignment table
    console.log(`Assigned clients via ClientAssignment table: ${user.clientAssignments.length}`);
    
    // Check Role Permissions
    const role = await prisma.role.findFirst({
      where: { name: user.role },
      include: { permissions: { where: { module: "CLIENTS" } } }
    });
    
    if (role && role.permissions.length > 0) {
      console.log(`Role View Permission: ${role.permissions[0].view}`);
      console.log(`Role Ownership Rule: ${role.permissions[0].ownership}`);
    } else {
      console.log(`Role permissions missing for CLIENTS module!`);
    }
  }

  process.exit(0);
}

debug();
