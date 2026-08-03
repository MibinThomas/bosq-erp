require("dotenv").config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  try {
    console.log("Querying PaymentTerm and TermsCondition...");
    const payTerms = await prisma.paymentTerm.findMany();
    console.log("PaymentTerms count:", payTerms.length, payTerms);
    const conds = await prisma.termsCondition.findMany();
    console.log("TermsCondition count:", conds.length, conds);
  } catch (err) {
    console.error("DB test failed:", err);
  } finally {
    await pool.end();
  }
}

run();
