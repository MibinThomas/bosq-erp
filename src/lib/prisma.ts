import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL
  const pool = new pg.Pool({
    connectionString,
    max: 15,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 10000,
  })

  pool.on("error", (err) => {
    console.error("Unexpected error on idle pg pool client:", err.message)
  })

  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

declare const globalThis: {
  prismaGlobal2: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal2 ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal2 = prisma
