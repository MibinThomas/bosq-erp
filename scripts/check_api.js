require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString, max: 2 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkAPI() {
  const anjuEmail = "anjushaji@bosq.ae";

  const dbSessionUser = await prisma.user.findUnique({
    where: { email: anjuEmail },
    include: { permissionOverrides: { where: { module: "CLIENTS" } } }
  });

  if (!dbSessionUser) return console.log("User not found");

  // hasPermission check
  const role = await prisma.role.findFirst({
    where: { name: dbSessionUser.role },
    include: { permissions: { where: { module: "CLIENTS" } } }
  });
  const hasView = role?.permissions[0]?.view;
  console.log("hasView:", hasView);

  let ownershipRule = "ALL";
  if (dbSessionUser.role !== "SUPER_ADMIN") {
    const override = dbSessionUser.permissionOverrides.find(o => o.action === "ownership");
    if (override?.ownership) {
      ownershipRule = override.ownership;
    } else if (role?.permissions[0]?.ownership) {
      ownershipRule = role.permissions[0].ownership;
    }
  }

  console.log("ownershipRule:", ownershipRule);

  let whereClause = { deletedAt: null };
  const isUnrestricted = ["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_MANAGER"].includes(dbSessionUser.role);
  
  if (!isUnrestricted) {
    whereClause.OR = [
      { salespersonId: dbSessionUser.id },
      { assignments: { some: { userId: dbSessionUser.id } } },
      { accessRequests: { some: { userId: dbSessionUser.id, status: "Approved" } } }
    ];
  } else {
    // ...
  }

  console.log("whereClause:", JSON.stringify(whereClause, null, 2));

  const clients = await prisma.client.findMany({
    where: whereClause,
    orderBy: { clientId: "asc" }
  });

  console.log("Returned clients:", clients.length);

  process.exit(0);
}

checkAPI();
