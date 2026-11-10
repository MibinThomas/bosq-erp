const { Client } = require('pg');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Set DATABASE_URL before running this script.");

async function main() {
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log("Connected to Neon DB successfully!");

    // Check if fields exist, if not add them
    await client.query(`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "employeeId" TEXT,
      ADD COLUMN IF NOT EXISTS "territories" TEXT,
      ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'Active';
    `);
    console.log("Database schema updated: Added employeeId, territories, and status to User table!");

    // Backfill status from isActive if status is not set or default
    await client.query(`
      UPDATE "User"
      SET "status" = CASE 
        WHEN "isActive" = true THEN 'Active' 
        ELSE 'Inactive' 
      END
      WHERE "status" IS NULL;
    `);
    console.log("Backfilled user status values.");
    
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.end();
  }
}

main();
