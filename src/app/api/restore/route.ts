import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export async function GET() {
  try {
    execSync('git checkout -- src/app/(dashboard)/quotations/page.tsx', { cwd: 'd:/MIBIN/bosq-erp' });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
