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
    console.log("Querying database tables and columns...");
    
    // Query columns of the User table
    const columns = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'User'
    `);
    console.log("User table columns in PostgreSQL:", columns);
    
    const usersCount = await prisma.$queryRawUnsafe(`SELECT COUNT(*) FROM "User"`);
    console.log("Total users count in database:", usersCount);
  } catch (err) {
    console.error("DB test failed:", err);
  } finally {
    await pool.end();
  }
}

run();
