import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const FALLBACK_DB_URL = "postgresql://neondb_owner:npg_kSwG9Ic8MNyx@ep-old-term-adz4r5o6-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

const prismaClientSingleton = () => {
  let connectionString = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || FALLBACK_DB_URL

  // Intercept stale/obsolete database host URLs injected by Vercel environment variables
  if (
    !connectionString || 
    connectionString.includes("ep-rough-bar-adwnszst") || 
    connectionString.includes("ep-lucky-leaf-adynkc0f")
  ) {
    connectionString = FALLBACK_DB_URL
  }

  try {
    const parsedUrl = new URL(connectionString)
    parsedUrl.searchParams.delete("channel_binding")
    connectionString = parsedUrl.toString()
  } catch {
    connectionString = connectionString
      .replace(/([?&])channel_binding=[^&]*(&|$)/, '$1')
      .replace(/[?&]$/, '')
  }

  const isDisableSsl = connectionString?.includes("sslmode=disable")
  const isServerless = process.env.VERCEL === "1" || process.env.NODE_ENV === "production"

  const pool = new pg.Pool({
    connectionString,
    max: isServerless ? 3 : 10,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
    ssl: isDisableSsl ? false : { rejectUnauthorized: false }
  })

  pool.on("error", (err) => {
    console.error("[Prisma] Idle pg pool client error:", err.message)
  })

  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

declare const globalThis: {
  prismaGlobal2: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal2 ?? prismaClientSingleton()

export default prisma

// Reuse Prisma client and connection pool across warm serverless lambda invocations
globalThis.prismaGlobal2 = prisma
