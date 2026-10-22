// Read-only diagnostics for the product catalog (no writes).
// Usage: DATABASE_URL=... node scripts/diagnose-products.cjs
const path = require("path")
const pg = require(path.join(process.cwd(), "node_modules", "pg"))

if (!process.env.DATABASE_URL) {
  console.error("Set DATABASE_URL to the target database.")
  process.exit(1)
}

;(async () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    await client.query("SET default_transaction_read_only = on")
    console.log(`Database host: ${new URL(process.env.DATABASE_URL).hostname}\n`)

    const { rows: cats } = await client.query(`
      SELECT c.name, p.name AS parent,
             count(pr.id) FILTER (WHERE pr."deletedAt" IS NULL)::int AS active,
             count(pr.id) FILTER (WHERE pr."deletedAt" IS NULL AND pr."isMaster")::int AS masters,
             count(pr.id) FILTER (WHERE pr."deletedAt" IS NOT NULL)::int AS deleted
        FROM "ProductCategory" c
        LEFT JOIN "ProductCategory" p ON p.id = c."parentId"
        LEFT JOIN "Product" pr ON pr."categoryId" = c.id
       GROUP BY c.id, c.name, p.name ORDER BY coalesce(p.name, c.name), c.name`)
    console.log("Categories (parent › name: active / masters / deleted)")
    for (const c of cats) console.log(`  ${(c.parent ? c.parent + " › " : "") + c.name}`.padEnd(48), `${c.active} / ${c.masters} / ${c.deleted}`)

    const { rows: [p] } = await client.query(`
      SELECT count(*) FILTER (WHERE "deletedAt" IS NULL)::int AS active,
             count(*) FILTER (WHERE "deletedAt" IS NULL AND "isMaster")::int AS masters,
             count(*) FILTER (WHERE "deletedAt" IS NULL AND "productCode" LIKE 'MODEL-%')::int AS model_masters,
             count(*) FILTER (WHERE "deletedAt" IS NULL AND "parentProductId" IS NOT NULL)::int AS variants,
             count(*) FILTER (WHERE "deletedAt" IS NULL AND "parentProductId" IS NULL AND NOT "isMaster")::int AS standalone,
             count(*) FILTER (WHERE "deletedAt" IS NULL AND "imageUrl" LIKE 'data:%')::int AS base64_images,
             coalesce(sum(length(row_to_json("Product")::text)) FILTER (WHERE "deletedAt" IS NULL), 0)::bigint AS list_bytes
        FROM "Product"`)
    console.log(`\nProducts: ${p.active} active — ${p.masters} masters (${p.model_masters} MODEL-*), ${p.variants} variants, ${p.standalone} standalone`)
    console.log(`Images stored inline (base64): ${p.base64_images}`)
    console.log(`Approx. product list response size: ${(Number(p.list_bytes) / 1024 / 1024).toFixed(2)} MB (Vercel limit 4.5 MB)`)

    const { rows: orphans } = await client.query(`
      SELECT count(*)::int AS n FROM "Product" v JOIN "Product" m ON m.id = v."parentProductId"
       WHERE v."deletedAt" IS NULL AND m."deletedAt" IS NOT NULL`)
    console.log(`Variants whose master is deleted (hidden from the list): ${orphans[0].n}`)

    const { rows: sample } = await client.query(`
      SELECT m."productCode", m."productName", c.name AS category, count(v.id)::int AS types
        FROM "Product" m JOIN "ProductCategory" c ON c.id = m."categoryId"
        LEFT JOIN "Product" v ON v."parentProductId" = m.id AND v."deletedAt" IS NULL
       WHERE m."deletedAt" IS NULL AND m."isMaster"
       GROUP BY m.id, c.name ORDER BY m."createdAt" DESC LIMIT 8`)
    console.log("\nLatest masters:")
    for (const s of sample) console.log(`  ${s.productCode.padEnd(18)} ${s.productName.padEnd(16)} ${s.category.padEnd(22)} types=${s.types}`)
  } finally {
    await client.end()
  }
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
