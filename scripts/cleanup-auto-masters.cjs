// Undoes the automatic "brand" grouping that the old GET /api/products?grouped=true performed.
// That code linked every unlinked product to an auto-created master named after the first word of
// its name (e.g. "AYX", "Cable", "2") with code MASTER-<WORD> and description "<WORD> Series Seating Collection".
//
// Usage (dry run — lists what would change, writes nothing):
//   DATABASE_URL=... node scripts/cleanup-auto-masters.cjs --since 2026-10-22
// Apply:
//   DATABASE_URL=... node scripts/cleanup-auto-masters.cjs --since 2026-10-22 --apply
//
// Only masters created on/after --since are touched. Their variants are unlinked (become standalone
// products) and the auto masters are soft-deleted (deletedAt set), so nothing is permanently removed.
const path = require("path")
const pg = require(path.join(process.cwd(), "node_modules", "pg"))

const args = process.argv.slice(2)
const apply = args.includes("--apply")
const sinceArg = args[args.indexOf("--since") + 1]
if (!args.includes("--since") || !sinceArg || isNaN(Date.parse(sinceArg))) {
  console.error("Missing or invalid --since <YYYY-MM-DD> (only auto masters created on/after this date are cleaned up).")
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error("Set DATABASE_URL to the target database.")
  process.exit(1)
}

;(async () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    const { rows: masters } = await client.query(
      `SELECT m.id, m."productCode", m."productName", m."createdAt",
              (SELECT count(*)::int FROM "Product" v WHERE v."parentProductId" = m.id) AS variants
         FROM "Product" m
        WHERE m."isMaster" = true
          AND m."deletedAt" IS NULL
          AND m."productCode" LIKE 'MASTER-%'
          AND m.description LIKE '% Series Seating Collection'
          AND m."createdAt" >= $1
        ORDER BY m."productName"`,
      [new Date(sinceArg)]
    )

    if (masters.length === 0) {
      console.log("No auto-created masters found — nothing to do.")
      return
    }

    // Masters referenced by quotations/BOQs are only unlinked, never hidden
    const { rows: used } = await client.query(
      `SELECT DISTINCT "productId" AS id FROM "QuotationItem" WHERE "productId" = ANY($1)
       UNION SELECT DISTINCT "productId" FROM "BoqItem" WHERE "productId" = ANY($1)`,
      [masters.map((m) => m.id)]
    )
    const usedIds = new Set(used.map((u) => u.id))

    console.log(`${apply ? "APPLYING" : "DRY RUN"} — ${masters.length} auto-created master(s):`)
    for (const m of masters) {
      console.log(`  ${m.productCode.padEnd(28)} "${m.productName}"  variants=${m.variants}${usedIds.has(m.id) ? "  (used on quotes — will be kept visible)" : ""}`)
    }
    if (!apply) {
      console.log("\nRe-run with --apply to unlink these variants and soft-delete the masters.")
      return
    }

    await client.query("BEGIN")
    const ids = masters.map((m) => m.id)
    const unlinked = await client.query(
      `UPDATE "Product" SET "parentProductId" = NULL, "updatedAt" = now() WHERE "parentProductId" = ANY($1)`,
      [ids]
    )
    const hideIds = ids.filter((id) => !usedIds.has(id))
    const hidden = await client.query(
      `UPDATE "Product" SET "deletedAt" = now(), "isMaster" = false, "updatedAt" = now() WHERE id = ANY($1)`,
      [hideIds]
    )
    await client.query("COMMIT")
    console.log(`\nUnlinked ${unlinked.rowCount} product(s); soft-deleted ${hidden.rowCount} auto master(s).`)
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {})
    throw err
  } finally {
    await client.end()
  }
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
