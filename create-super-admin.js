require("dotenv").config()
const { PrismaClient } = require("@prisma/client")
const { PrismaPg } = require("@prisma/adapter-pg")
const pg = require("pg")
const crypto = require("crypto")

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex")
  const iterations = 210000
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, "sha512").toString("hex")
  return `${iterations}:${salt}:${hash}`
}

const connectionString = process.env.DATABASE_URL
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const email = "superadmin@bosq.ae"
  const password = process.env.NEW_PASSWORD || ""
  if (password.length < 12) throw new Error("Set NEW_PASSWORD (at least 12 characters) before running this script.")

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashPassword(password),
      role: "SUPER_ADMIN",
      isActive: true,
    },
    create: {
      name: "Super Admin",
      email,
      password: hashPassword(password),
      role: "SUPER_ADMIN",
      isActive: true,
    },
  })

  console.log("Super Admin seeded successfully:")
  console.log(`Email: ${email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
