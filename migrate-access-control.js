const { Client } = require('pg');

const databaseUrl = "postgresql://neondb_owner:npg_xaiVqC1ATRh2@ep-lucky-leaf-adynkc0f-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

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
