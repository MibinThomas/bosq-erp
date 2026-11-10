// Clears the product catalog so a fresh product list can be imported.
// Touches ONLY the "Product" and "ProductCategory" tables — clients, quotations, BOQs, users and
// settings are never modified.
//
//   - Products not referenced by any quotation or BOQ line are permanently deleted.
//   - Products referenced by quotation/BOQ lines are hidden (soft-deleted), so those documents keep
//     their product link. Re-importing the same product code brings them back.
//   - Categories left without any product are deleted, except the main categories in KEEP_CATEGORIES.
//
// Dry run (counts only, writes nothing):
//   DATABASE_URL=... node scripts/clear-product-catalog.cjs
// Apply:
//   DATABASE_URL=... node scripts/clear-product-catalog.cjs --apply
const path = require("path")
const pg = require(path.join(process.cwd(), "node_modules", "pg"))

const KEEP_CATEGORIES = ["Chairs", "Storage", "Accessories", "Workstations"]
const apply = process.argv.includes("--apply")

if (!process.env.DATABASE_URL) {
  console.error("Set DATABASE_URL to the target database.")
  process.exit(1)
}

const REFERENCED = `
  SELECT "productId" AS id FROM "QuotationItem" WHERE "productId" IS NOT NULL
  UNION
  SELECT "productId" FROM "BoqItem" WHERE "productId" IS NOT NULL`

;(async () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    // Make sure this is the ERP's database (current schema) before doing anything
    const host = new URL(process.env.DATABASE_URL).hostname
    console.log(`Database host: ${host}`)
    const { rows: cols } = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'Product' AND column_name = ANY($1)`,
      [["parentProductId", "isMaster", "deletedAt", "categoryId"]]
    )
    if (cols.length < 4) {
      console.error(
        `This database does not match the ERP's current schema (missing: ${["parentProductId", "isMaster", "deletedAt", "categoryId"]
          .filter((c) => !cols.some((r) => r.column_name === c)).join(", ")}).\n` +
        `It is probably not the database the app uses — check the host above against PROD_DB_URL in src/lib/prisma.ts. Nothing was changed.`
      )
      process.exitCode = 1
      return
    }

    const { rows: [stats] } = await client.query(`
      SELECT count(*)::int AS total,
             count(*) FILTER (WHERE "deletedAt" IS NULL)::int AS visible,
             count(*) FILTER (WHERE id IN (${REFERENCED}))::int AS referenced
        FROM "Product"`)
    const { rows: categories } = await client.query(`
      SELECT c.name, count(p.id)::int AS products
        FROM "ProductCategory" c LEFT JOIN "Product" p ON p."categoryId" = c.id
       GROUP BY c.id, c.name ORDER BY c.name`)

    console.log(`${apply ? "APPLYING" : "DRY RUN"}`)
    console.log(`Products: ${stats.total} total (${stats.visible} visible)`)
    console.log(`  will be permanently deleted (not on any quotation/BOQ): ${stats.total - stats.referenced}`)
    console.log(`  will be hidden (used on quotations/BOQs, kept for history): ${stats.referenced}`)
    console.log("Categories (current product count):")
    for (const c of categories) console.log(`  ${c.name.padEnd(40)} ${c.products}${KEEP_CATEGORIES.includes(c.name) ? "  [kept]" : ""}`)

    if (!apply) {
      console.log("\nNothing changed. Re-run with --apply to clear the product catalog.")
      return
    }

    await client.query("BEGIN")
    // Unlink everything first so deleting a master can't cascade into a referenced variant
    await client.query(`UPDATE "Product" SET "parentProductId" = NULL WHERE "parentProductId" IS NOT NULL`)
    const deleted = await client.query(`DELETE FROM "Product" WHERE id NOT IN (${REFERENCED})`)
    const hidden = await client.query(
      `UPDATE "Product" SET "deletedAt" = COALESCE("deletedAt", now()), "isMaster" = false, "updatedAt" = now()`
    )
    const removedCats = await client.query(
      `DELETE FROM "ProductCategory" c
        WHERE NOT EXISTS (SELECT 1 FROM "Product" p WHERE p."categoryId" = c.id)
          AND c.name <> ALL($1)`,
      [KEEP_CATEGORIES]
    )
    await client.query("COMMIT")
    console.log(`\nDeleted ${deleted.rowCount} product(s), hid ${hidden.rowCount} product(s) used on quotations/BOQs, removed ${removedCats.rowCount} empty categor${removedCats.rowCount === 1 ? "y" : "ies"}.`)
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
