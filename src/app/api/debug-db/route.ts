import { NextResponse } from "next/server"

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

  return NextResponse.json({
    DATABASE_URL: maskUrl(dbUrl),
    DIRECT_URL: maskUrl(directUrl),
    NODE_ENV: process.env.NODE_ENV
  })
}
