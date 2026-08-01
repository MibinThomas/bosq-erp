import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  console.log('Migrating BOQ permissions for existing roles...');
  const roles = await prisma.role.findMany();
  let created = 0;

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

      if (['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_MANAGER'].includes(role.name)) {
        view = true;
        canEdit = true;
        canApprove = true;
        ownership = "ALL";
      } else if (['SALES_EXECUTIVE', 'INTERIOR_DESIGN_CONSULTANT'].includes(role.name)) {
        view = true;
        canEdit = true; 
        canApprove = false;
        ownership = "OWN"; 
      } else if (role.name === 'ESTIMATOR') {
        view = true;
        canEdit = true; 
        canApprove = true;
        ownership = "ASSIGNED"; 
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
        created++;
      }
    }
  }

  return NextResponse.json({ success: true, created });
}
