const { loadEnvConfig } = require('@next/env');
// Load .env
loadEnvConfig(process.cwd());

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

async function main() {
  console.log('Migrating BOQ permissions for existing roles...');
  
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined. Make sure you have a .env file.");
  }

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const roles = await prisma.role.findMany();

  for (const role of roles) {
    let permissions = await prisma.rolePermission.findFirst({
      where: { roleId: role.id, module: 'BOQS' }
    });

    if (!permissions) {
      console.log(`Creating BOQS permission for role: ${role.name}`);
      let canEdit = false;
      let canApprove = false;
      let ownership = "NONE";
      let view = false;

      // Assign reasonable defaults based on role name
      if (['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_MANAGER'].includes(role.name)) {
        view = true;
        canEdit = true;
        canApprove = true;
        ownership = "ALL";
      } else if (['SALES_EXECUTIVE', 'INTERIOR_DESIGN_CONSULTANT'].includes(role.name)) {
        view = true;
        canEdit = true; // They prepare BOQs
        canApprove = false;
        ownership = "OWN"; // Can only see/edit their own
      } else if (role.name === 'ESTIMATOR') {
        view = true;
        canEdit = true; // Estimator fills out pricing
        canApprove = true;
        ownership = "ASSIGNED"; // Can see BOQs sent to them
      }

      if (view) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            module: 'BOQS',
            view: true,
            create: canEdit,
            edit: canEdit,
            delete: canApprove, 
            approve: canApprove,
            reject: canApprove,
            export: true,
            downloadPdf: true,
            uploadFiles: true,
            share: true,
            manage: canApprove,
            ownership: ownership
          }
        });
      }
    } else {
      console.log(`BOQS permission already exists for role: ${role.name}`);
    }
  }

  console.log('BOQ permissions migration completed successfully.');
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
