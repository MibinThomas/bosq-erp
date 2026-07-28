require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString, max: 2 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function updateOwnership() {
  console.log("Updating Ownership Rule for INTERIOR_DESIGN_CONSULTANT...");

  try {
    const role = await prisma.role.findFirst({
      where: { name: "INTERIOR_DESIGN_CONSULTANT" },
      include: { permissions: { where: { module: "CLIENTS" } } }
    });

    if (role && role.permissions.length > 0) {
      const permId = role.permissions[0].id;
      await prisma.rolePermission.update({
        where: { id: permId },
        data: { ownership: "ASSIGNED" }
      });
      console.log("Successfully updated CLIENTS ownership rule to ASSIGNED.");
    } else {
      console.log("Could not find role or permissions.");
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

updateOwnership();
