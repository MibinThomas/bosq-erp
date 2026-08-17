import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || "NOT SET"
  const directUrl = process.env.DIRECT_URL || "NOT SET"
  
  // Mask password for safety
  const maskUrl = (url: string) => {
    try {
      const parsed = new URL(url)
      parsed.password = "****"
      return parsed.toString()
    } catch {
      return url.replace(/:([^:@]+)@/, ":****@")
    }
  }

  let dbStatus = "UNKNOWN"
  let userCount = -1
  let dbError: any = null

  try {
    userCount = await prisma.user.count()
    dbStatus = "CONNECTED"
  } catch (err: any) {
    dbStatus = "FAILED"
    dbError = {
      message: err?.message || String(err),
      code: err?.code,
      name: err?.name,
      stack: err?.stack
    }
  }

  return NextResponse.json({
    dbStatus,
    userCount,
    dbError,
    DATABASE_URL: maskUrl(dbUrl),
    DIRECT_URL: maskUrl(directUrl),
    HAS_NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    NODE_ENV: process.env.NODE_ENV
  }, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
    }
  })
}
