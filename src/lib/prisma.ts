import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const prismaClientSingleton = () => {
  // The connection string must come from the environment (Vercel project settings / .env.local).
  // Never hard-code credentials here.
  const rawUrl = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL
  if (!rawUrl) {
    throw new Error("DATABASE_URL is not set. Configure it in the environment (e.g. .env.local or Vercel project settings).")
  }

  let connectionString = rawUrl
  try {
    const parsedUrl = new URL(connectionString)
    parsedUrl.searchParams.delete("channel_binding")
    connectionString = parsedUrl.toString()
  } catch {
    connectionString = connectionString
      .replace(/([?&])channel_binding=[^&]*(&|$)/, '$1')
      .replace(/[?&]$/, '')
  }

  const isDisableSsl = connectionString.includes("sslmode=disable")
  const isServerless = process.env.VERCEL === "1" || process.env.NODE_ENV === "production"

  const pool = new pg.Pool({
    connectionString,
    max: isServerless ? 3 : 10,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
    // Verify the server certificate (Neon uses publicly trusted certificates)
    ssl: isDisableSsl ? false : { rejectUnauthorized: true }
  })

  pool.on("error", (err) => {
    console.error("[Prisma] Idle pg pool client error:", err.message)
  })

  const adapter = new PrismaPg(pool)
  return new PrismaClient({
    adapter,
    // Secrets are never returned unless a query explicitly asks for them (login / session checks)
    omit: { user: { password: true, activeSessionToken: true } }
  })
}

declare const globalThis: {
  prismaGlobal2: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal2 ?? prismaClientSingleton()

export default prisma

// Reuse Prisma client and connection pool across warm serverless lambda invocations
globalThis.prismaGlobal2 = prisma
