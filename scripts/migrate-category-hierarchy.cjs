// Adds parent/child support to product categories and sets up: Chairs > Premium Chairs, Chairs > Executive Chairs.
// Only the "ProductCategory" table is changed (one new nullable column + index + foreign key, and category rows).
// Must run BEFORE deploying the code that uses ProductCategory.parentId.
//
// Dry run (shows what would change, writes nothing):
//   DATABASE_URL=... node scripts/migrate-category-hierarchy.cjs
// Apply:
//   DATABASE_URL=... node scripts/migrate-category-hierarchy.cjs --apply
const path = require("path")
const crypto = require("crypto")
const pg = require(path.join(process.cwd(), "node_modules", "pg"))

const HIERARCHY = { Chairs: ["Premium Chairs", "Executive Chairs"] }
const apply = process.argv.includes("--apply")

if (!process.env.DATABASE_URL) {
  console.error("Set DATABASE_URL to the target database.")
  process.exit(1)
}

// cuid-like id (Prisma generates cuid() in the app; any unique string is valid for the column)
const newId = () => "c" + crypto.randomBytes(12).toString("hex")

;(async () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    console.log(`Database host: ${new URL(process.env.DATABASE_URL).hostname}`)
    const { rows: productCols } = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'Product' AND column_name = 'parentProductId'`
    )
    if (productCols.length === 0) {
      console.error("This database does not match the ERP's current schema (Product.parentProductId missing). Nothing was changed.")
      process.exitCode = 1
      return
    }
    const { rows: hasCol } = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'ProductCategory' AND column_name = 'parentId'`
    )
    const { rows: cats } = await client.query(`SELECT id, name FROM "ProductCategory"`)
    const byName = (n) => cats.find((c) => c.name.toLowerCase() === n.toLowerCase())

    console.log(apply ? "APPLYING" : "DRY RUN")
    console.log(hasCol.length ? "  Column ProductCategory.parentId already exists." : "  Will add column ProductCategory.parentId (+ index, foreign key).")
    for (const [parent, children] of Object.entries(HIERARCHY)) {
      console.log(`  ${parent}: ${byName(parent) ? "exists" : "will be created"}`)
      for (const child of children) console.log(`    └ ${child}: ${byName(child) ? "exists — will be linked" : "will be created and linked"}`)
    }
    if (!apply) {
      console.log("\nNothing changed. Re-run with --apply.")
      return
    }

    await client.query("BEGIN")
    await client.query(`ALTER TABLE "ProductCategory" ADD COLUMN IF NOT EXISTS "parentId" TEXT`)
    await client.query(`CREATE INDEX IF NOT EXISTS "ProductCategory_parentId_idx" ON "ProductCategory"("parentId")`)
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductCategory_parentId_fkey') THEN
          ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_parentId_fkey"
            FOREIGN KEY ("parentId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;`)

    const ensure = async (name, parentId) => {
      const { rows } = await client.query(`SELECT id FROM "ProductCategory" WHERE lower(name) = lower($1)`, [name])
      if (rows[0]) {
        if (parentId !== undefined) await client.query(`UPDATE "ProductCategory" SET "parentId" = $1, "updatedAt" = now() WHERE id = $2`, [parentId, rows[0].id])
        return rows[0].id
      }
      const id = newId()
      await client.query(
        `INSERT INTO "ProductCategory" (id, name, description, "parentId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, now(), now())`,
        [id, name, `${name} category`, parentId ?? null]
      )
      return id
    }
    for (const [parent, children] of Object.entries(HIERARCHY)) {
      const parentId = await ensure(parent, null)
      for (const child of children) await ensure(child, parentId)
    }
    await client.query("COMMIT")
    console.log("\nDone. Category hierarchy is ready — you can now deploy the app update.")
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
