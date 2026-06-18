import { NextResponse } from "next/server"
import { execSync } from "child_process"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action") || "diff"
    
    let result = ""
    if (action === "show") {
      result = execSync("git -C d:\\MIBIN\\bosq-erp show HEAD:src/app/(dashboard)/quotations/new/page.tsx").toString()
    } else {
      result = execSync("git -C d:\\MIBIN\\bosq-erp diff -- src/app/(dashboard)/quotations/new/page.tsx").toString()
    }
    
    return new Response(result, { headers: { "Content-Type": "text/plain" } })
  } catch (err: any) {
    return NextResponse.json({
      error: err.message,
      stdout: err.stdout?.toString(),
      stderr: err.stderr?.toString()
    })
  }
}
