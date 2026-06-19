require("dotenv").config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  try {
    console.log('Running database description migration via raw SQL...');
    // This query runs directly on PostgreSQL to copy shortDescription to description if description is empty/null
    const result = await prisma.$executeRawUnsafe(`
      UPDATE "Product" 
      SET "description" = CASE 
        WHEN "description" IS NOT NULL AND "description" <> '' THEN "description"
        WHEN "shortDescription" IS NOT NULL AND "shortDescription" <> '' THEN "shortDescription"
        ELSE ''
      END
    `);
    console.log(`Successfully migrated descriptions. Rows affected: ${result}`);
  } catch (err) {
    console.error('Error migrating product descriptions:', err);
  } finally {
    await pool.end();
  }
}

run();
