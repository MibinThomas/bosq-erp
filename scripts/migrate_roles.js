const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString, max: 2 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Connecting to database...");

  try {
    // Perform update
    console.log("Updating User roles from DESIGN_CONSULTANT to INTERIOR_DESIGN_CONSULTANT...");
    
    const result = await prisma.user.updateMany({
      where: {
        role: "DESIGN_CONSULTANT"
      },
      data: {
        role: "INTERIOR_DESIGN_CONSULTANT"
      }
    });

    console.log(`\nSuccessfully updated ${result.count} users in the database.`);

  } catch (err) {
    console.error("\nError during migration:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
