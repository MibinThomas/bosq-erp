require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString, max: 2 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting role cleanup...");

  try {
    // 1. Fetch the old role and its permissions
    const oldRole = await prisma.role.findUnique({
      where: { name: "DESIGN_CONSULTANT" },
      include: { permissions: true }
    });

    if (!oldRole) {
      console.log("Role DESIGN_CONSULTANT does not exist. Nothing to clean up.");
      return;
    }

    // 2. Fetch or Create the new role
    let newRole = await prisma.role.findUnique({
      where: { name: "INTERIOR_DESIGN_CONSULTANT" }
    });

    if (!newRole) {
      console.log("Creating INTERIOR_DESIGN_CONSULTANT role...");
      newRole = await prisma.role.create({
        data: {
          name: "INTERIOR_DESIGN_CONSULTANT",
          description: "Design Consultant focused on BOQs and product selections",
          isSystem: true
        }
      });
    } else {
      console.log("INTERIOR_DESIGN_CONSULTANT already exists. Updating its properties to system role...");
      await prisma.role.update({
        where: { id: newRole.id },
        data: {
          description: "Design Consultant focused on BOQs and product selections",
          isSystem: true
        }
      });
    }

    // 3. Delete existing permissions for the new role just in case they are different
    console.log("Syncing permissions...");
    await prisma.rolePermission.deleteMany({
      where: { roleId: newRole.id }
    });

    // 4. Copy all permissions from oldRole to newRole
    for (const perm of oldRole.permissions) {
      // Exclude id, roleId from the copy
      const { id, roleId, ...permData } = perm;
      
      await prisma.rolePermission.create({
        data: {
          roleId: newRole.id,
          ...permData
        }
      });
    }

    // 5. Delete the old role (this will cascade delete its old permissions)
    console.log("Deleting old DESIGN_CONSULTANT role...");
    await prisma.role.delete({
      where: { name: "DESIGN_CONSULTANT" }
    });

    console.log("Success! Old role deleted and permissions synced.");

  } catch (err) {
    console.error("Error during cleanup:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
