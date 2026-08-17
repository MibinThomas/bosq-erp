import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const prismaClientSingleton = () => {
  let connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    console.error("[Prisma] WARNING: DATABASE_URL is not defined in environment variables!")
    return new PrismaClient()
  }

  // Clean connection string to remove unsupported parameters like channel_binding
  connectionString = connectionString
    .replace(/([?&])channel_binding=[^&]*(&|$)/, '$1')
    .replace(/[?&]$/, '')

  const isDisableSsl = connectionString.includes("sslmode=disable")
  const isServerless = process.env.VERCEL === "1" || process.env.NODE_ENV === "production"

  try {
    const pool = new pg.Pool({
      connectionString,
      // On Vercel serverless containers, limit pool to max 2 connections per instance to avoid exhausting Neon pooler limits
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
  } catch (err: any) {
    console.error("[Prisma] Adapter initialization failed, falling back to default PrismaClient:", err?.message || err)
    return new PrismaClient()
  }
}

declare const globalThis: {
  prismaGlobal2: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal2 ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal2 = prisma
