// Converts "Bosq- Price List 2026-27.xlsx" (one block per product with a row per size) into the ERP
// bulk-import template. Desks/tables/workstations become configurable models (sizes → Dimension Options),
// storage cabinets and panels become one product per size.
// Usage: node scripts/convert-price-list-2026.cjs <projectRoot> <outDir> <xlsx>
const path = require("path")
const fs = require("fs")
const root = process.argv[2]
const outDir = process.argv[3]
const input = process.argv[4]
const req = (m) => require(path.join(root, "node_modules", m))
const ExcelJS = req("exceljs")
const sharp = req("sharp")

const imgDir = path.join(outDir, "images")
fs.mkdirSync(imgDir, { recursive: true })

const text = (v) => {
  if (v == null) return ""
  if (typeof v === "object") {
    if (v.richText) return v.richText.map((r) => r.text).join("")
    if ("result" in v) return text(v.result)
    if (v.text) return text(v.text)
    return ""
  }
  return String(v)
}
const cleanSpec = (s) =>
  s.replace(/\r/g, "").split("\n").map((l) => l.replace(/[ \t]{2,}/g, " ").replace(/^["\s]+|["\s]+$/g, "").trim())
    .filter(Boolean).join("\n").replace(/""/g, '"')
// "1200x600x750mm" → "1200 × 600 × 750"; "1600x600mm + 1000x600mm" → "1600 × 600 + 1000 × 600"
const dim = (s) => s.replace(/\s*mm\b/gi, "").replace(/(\d)\s*[x×X]\s*(\d)/g, "$1 × $2").replace(/\s+/g, " ").trim()
const slug = (s) => s.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "")
const fileSafe = (s) => s.replace(/[\/\\:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim()

// ---------- read blocks ----------
async function readBlocks(file) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(file)
  const blocks = []
  for (const ws of wb.worksheets) {
    let hr = 0
    const col = {}
    for (let r = 1; r <= 6 && !hr; r++) {
      const row = ws.getRow(r)
      for (let c = 1; c <= ws.columnCount; c++) if (/specification/i.test(text(row.getCell(c).value))) hr = r
      if (hr) for (let c = 1; c <= ws.columnCount; c++) {
        const h = text(row.getCell(c).value).replace(/\s+/g, " ").trim().toLowerCase()
        if (h) col[h] = c
      }
    }
    if (!hr) continue
    const specC = col["product specifications"], numC = col["product number"] || col["sl number"]
    const dimC = col["dimensions"], priceC = col["direct price"]

    // images anchored by top row
    const imgs = new Map()
    for (const img of ws.getImages()) {
      const r = Math.floor(img.range.tl.nativeRow ?? img.range.tl.row) + 1
      if (!imgs.has(r)) {
        const media = wb.getImage(Number(img.imageId))
        if (media?.buffer) imgs.set(r, media.buffer)
      }
    }

    let cur = null
    for (let r = hr + 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r)
      const spec = text(row.getCell(specC).value).trim()
      const num = text(row.getCell(numC).value).trim()
      const size = text(row.getCell(dimC).value).trim()
      const priceRaw = row.getCell(priceC).value
      const price = typeof priceRaw === "number" ? priceRaw : Number(text(priceRaw))
      if (!spec && !size) continue
      const key = `${spec}|${num}`
      if (!cur || cur.key !== key) {
        cur = { key, sheet: ws.name, row: r, spec: cleanSpec(spec), num, sizes: [], image: null }
        blocks.push(cur)
      }
      if (!cur.image && imgs.has(r)) cur.image = imgs.get(r)
      if (size && Number.isFinite(price)) cur.sizes.push({ size, price })
    }
    // a block whose picture sits a row or two below its first row
    for (const b of blocks.filter((x) => x.sheet === ws.name && !x.image)) {
      for (let r = b.row; r < b.row + b.sizes.length; r++) if (imgs.has(r)) { b.image = imgs.get(r); break }
    }
  }
  return blocks
}

// ---------- classify a block ----------
// Returns { kind: "model" | "item", category, model, modelCode, layout, layoutCode, seats, optionLabel, name }
function classify(b) {
  const first = b.spec.split("\n")[0].trim()
  const t = b.spec.toLowerCase()
  const table = b.spec.match(/Table:\s*(\d+)\s*x\s*(\d+)\s*x\s*(\d+)\s*mm/i)
  const tableLayout = table ? `Table ${table[1]} × ${table[2]} × ${table[3]}` : ""
  const tableCode = table ? `${table[1]}X${table[2]}` : ""

  if (/^reception/i.test(first)) {
    const led = /led provision/i.test(t)
    return { kind: "model", category: "Workstations > Reception Desks", model: "Reception Desk", modelCode: "RECEPTION",
      layout: `Design ${b.num}${led ? " (LED provision)" : ""}`, layoutCode: `D${b.num}`, seats: 1 }
  }
  if (/storage cabinet/i.test(first)) {
    const height = (first.match(/^(low|medium|full) height/i) || [])[1]
    const depth = (first.match(/\((\d+)mm depth\)/i) || [])[1]
    return { kind: "item", category: `Storage > ${height[0].toUpperCase() + height.slice(1).toLowerCase()} Height Cabinets`,
      name: `${height[0].toUpperCase() + height.slice(1).toLowerCase()} Height Storage Cabinet`, codePrefix: `SC-${height[0].toUpperCase()}H`, depth }
  }
  if (/^planted box/i.test(first)) {
    return { kind: "item", category: "Storage > Planter Boxes", name: "Planter Box", codePrefix: "PLANTER" }
  }
  if (/^fabric partition/i.test(first)) return { kind: "item", category: "Accessories", name: "Fabric Partition Panel", codePrefix: "FPP" }
  if (/^modesty panel/i.test(first)) return { kind: "item", category: "Accessories", name: "Modesty Panel", codePrefix: "MODESTY" }

  if (/^executive table/i.test(first)) {
    if (/3 nos of wooden drawers and a swing shutter/i.test(t))
      return { kind: "model", category: "Workstations > Executive Tables", model: "Executive Table – Series 1", modelCode: "EXT1",
        layout: tableLayout, layoutCode: tableCode, seats: 1, optionLabel: "Side return" }
    if (/3 wooden drawer and a swing shutter/i.test(t))
      return { kind: "model", category: "Workstations > Executive Tables", model: "Executive Table – Series 2", modelCode: "EXT2",
        layout: tableLayout, layoutCode: tableCode, seats: 1, optionLabel: "Side storage" }
    if (/swinging single door/i.test(t)) {
      const multi = /^\*/m.test(b.spec)
      return { kind: "model", category: "Workstations > Executive Tables", model: `Executive Table – Series ${multi ? 4 : 3}`, modelCode: multi ? "EXT4" : "EXT3",
        layout: tableLayout, layoutCode: tableCode, seats: 1, optionLabel: "Side storage" }
    }
    if (!table)
      return { kind: "model", category: "Workstations > Executive Tables", model: "Executive Table – Panel Leg", modelCode: "EXTPL",
        layout: "Standard", layoutCode: "STD", seats: 1 }
  }
  if (/^round table/i.test(first))
    return { kind: "model", category: "Workstations > Meeting Tables", model: "Round Table", modelCode: "ROUND", layout: "Standard", layoutCode: "STD", seats: 0, round: true }
  if (/^clove/i.test(first))
    return { kind: "model", category: "Workstations > Meeting Tables", model: "Clove Meeting Table", modelCode: "CLOVE", layout: "Standard", layoutCode: "STD", seats: 0 }
  if (/^matrix/i.test(first))
    return { kind: "model", category: "Workstations > Meeting Tables", model: "Matrix Meeting Table", modelCode: "MATRIX", layout: "Standard", layoutCode: "STD", seats: 0 }
  if (/^meeting table/i.test(first)) {
    let leg = "Design"
    if (/loop leg/i.test(t)) leg = "Metal loop leg"
    else if (/rectangular box type leg/i.test(t)) leg = "Box leg with modesty"
    else if (/leg:\s*36mm/i.test(t) && /modesty included/i.test(t)) leg = "36mm MDF leg with modesty"
    else if (/legs?:\s*36mm/i.test(t)) leg = "36mm MDF leg"
    else if (/legs?:\s*18mm/i.test(t)) leg = "18mm MDF leg"
    const ref = b.num || `R${b.row}`
    return { kind: "model", category: "Workstations > Meeting Tables", model: "Meeting Table", modelCode: "MEETING",
      layout: `${leg} (Design ${ref})`, layoutCode: `D${ref}`, seats: 0 }
  }

  // Zen X family
  const zen = first.replace(/\s+/g, " ").trim()
  if (/^zen ?x/i.test(zen)) {
    const ret = (b.spec.match(/Side Return\s*:?\s*(\d{3,4})\s*x\s*(\d{3,4})/i) || [])
    const retLabel = ret[1] ? ` (${ret[1]} return)` : ""
    if (/recta/i.test(zen)) return zx("Zen X", "ZENX", "Single Seater (Recta)", "1S", 1)
    let m
    if ((m = zen.match(/linear of (\d)/i))) return zx("Zen X", "ZENX", `${m[1]} Seater Linear`, `L${m[1]}`, Number(m[1]))
    if (/l shape desk/i.test(zen)) return zx("Zen X", "ZENX", `L Shape Desk${retLabel}`, `LD${ret[1] || ""}`, 1)
    if (/l shape/i.test(zen)) return zx("Zen X", "ZENX", `L Shape${retLabel}`, "LS", 1)
    if ((m = zen.match(/cluster of (\d)/i)))
      return zx("Zen X", "ZENX", Number(m[1]) === 2 ? "2 Seater Face To Face (Cluster Of 2)" : `Cluster Of ${m[1]}`, `C${m[1]}`, Number(m[1]))
    if (/ultra single/i.test(zen)) return zx("Zen X Ultra", "ZENXU", `Single Seater${retLabel}`, `1S${ret[1] || ""}`, 1)
    if ((m = zen.match(/ultra (\d)/i))) return zx("Zen X Ultra", "ZENXU", `Cluster Of ${m[1]}`, `C${m[1]}`, Number(m[1]))
  }
  if (/^proglide/i.test(zen)) {
    const leg = /aok/i.test(zen) ? "AOK Leg" : "Bosq Leg"
    const legCode = /aok/i.test(zen) ? "AOK" : "BQ"
    if (/l shape/i.test(zen)) return zx("Proglide", "PROGLIDE", `L Shape Desk – ${leg}`, `LS-${legCode}`, 1, "Workstations > Height Adjustable Desks")
    if (/2 persons/i.test(zen)) return zx("Proglide", "PROGLIDE", `Ultra 2 Seater – ${leg}`, `U2-${legCode}`, 2, "Workstations > Height Adjustable Desks")
    if (/ultra/i.test(zen)) return zx("Proglide", "PROGLIDE", `Ultra Single Seater – ${leg}`, `U1-${legCode}`, 1, "Workstations > Height Adjustable Desks")
    return zx("Proglide", "PROGLIDE", `Series Single Seater – ${leg}`, `S1-${legCode}`, 1, "Workstations > Height Adjustable Desks")
  }
  return null

  function zx(model, modelCode, layout, layoutCode, seats, category = "Workstations > Desking Workstations") {
    return { kind: "model", category, model, modelCode, layout, layoutCode, seats }
  }
}

// ---------- main ----------
;(async () => {
  const blocks = await readBlocks(input)
  const rows = []
  const notes = []
  const note = (b, msg) => {
    if (!notes.some((n) => n[0] === b.sheet && n[1] === b.row && n[3] === msg)) notes.push([b.sheet, b.row, b.num, msg])
  }
  let images = 0

  const saveImage = async (buffer, code) => {
    if (!buffer) return ""
    const name = `IMG-${fileSafe(code)}.jpg`
    await sharp(buffer).rotate().resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" }).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(imgDir, name))
    images++
    return name
  }

  const usedCodes = new Map()
  const uniqueCode = (code, b) => {
    const n = (usedCodes.get(code) || 0) + 1
    usedCodes.set(code, n)
    if (n > 1) note(b, `Item code ${code} already used — this block was given ${code}-${n}.`)
    return n > 1 ? `${code}-${n}` : code
  }

  // Blocks that describe the same model + layout (e.g. the two Proglide L Shape Desk rows) are merged
  // into one layout with all their sizes as options.
  const classified = []
  for (const b of blocks) {
    if (b.sizes.length === 0) continue
    const c = classify(b)
    if (!c) { note(b, `Unrecognised product block "${b.spec.split("\n")[0]}" — not converted.`); continue }
    const prev = c.kind === "model" && classified.find((x) => x.c.kind === "model" && x.c.modelCode === c.modelCode && x.c.layoutCode === c.layoutCode)
    if (prev) {
      prev.b.sizes.push(...b.sizes)
      if (!prev.b.image) prev.b.image = b.image
      note(b, `Merged into ${c.model} — ${c.layout} as extra size option(s); its specification text differs from the first block, which is the one imported.`)
      continue
    }
    classified.push({ b, c })
  }
  const seriesNoted = new Set()

  for (const { b, c } of classified) {

    if (c.kind === "item") {
      // one product per size (Storage / Accessories use the catalog search)
      const image = await saveImage(b.image, `${c.codePrefix}-${b.num || b.row}`)
      for (const s of b.sizes) {
        const d = dim(s.size)
        const code = uniqueCode(`${c.codePrefix}-${slug(s.size.replace(/mm/i, ""))}`, b)
        rows.push({
          "Category": c.category, "Item Code": code, "Product Name": `${c.name} – ${d} mm`,
          "Selling Price (AED)": s.price, "Stock Quantity": 0, "Dimensions / Size": `${d} mm`,
          "Short Description": `${c.name} ${d} mm`, "Specifications / Details": b.spec, "Image Filename": image,
        })
      }
      continue
    }

    // configurable model: sizes become Dimension Options priced against the smallest
    const sizes = [...b.sizes].sort((x, y) => x.price - y.price)
    const base = sizes[0].price
    const optionName = (size) => {
      const d = c.round ? `Ø${dim(size).replace(" × ", " × H")}` : dim(size)
      return c.optionLabel ? `${c.optionLabel} ${d}` : d
    }
    // keep the source order (by size) for the option list, charges relative to the cheapest size
    const seen = new Set()
    const options = b.sizes.filter((s) => !seen.has(s.size) && seen.add(s.size))
      .map((s) => (s.price > base ? `${optionName(s.size)} (+${Math.round((s.price - base) * 100) / 100})` : optionName(s.size)))
    if (options.some((o) => o.includes(","))) note(b, "A size label contains a comma — check Dimension Options.")
    const dupSizes = b.sizes.length - seen.size
    if (dupSizes) note(b, `${dupSizes} duplicate size row(s) ignored.`)

    const code = uniqueCode(`${c.modelCode}-${c.layoutCode}`, b)
    const image = await saveImage(b.image, code)
    if (!image) note(b, `No picture in the source for ${c.model} — ${c.layout}.`)
    rows.push({
      "Category": c.category, "Product Model": c.model, "Model Code": c.modelCode,
      "Layout": c.layout, "Seats per Unit": c.seats || "",
      "Item Code": code, "Product Name": `${c.model} — ${c.layout}`,
      "Selling Price (AED)": base, "Stock Quantity": 0,
      "Dimension Options": options.join(", "),
      "Short Description": `${c.model} — ${c.layout}`,
      "Specifications / Details": b.spec,
      "Image Filename": image,
    })
    if (c.model.startsWith("Executive Table – Series") && !seriesNoted.has(c.model)) {
      seriesNoted.add(c.model)
      note(b, `"${c.model}" is a working name — the price list has no series names. Rename "Product Model" for all its rows if you use a different name.`)
    }
  }

  // Specific source observations worth checking
  const byKey = new Map()
  for (const b of blocks) {
    const k = b.spec
    if (byKey.has(k) && b.num && byKey.get(k).num !== b.num && /meeting table/i.test(b.spec)) {
      note(b, `Same specification text as design ${byKey.get(k).num} but different prices — confirm the difference (e.g. leg/design) and adjust the layout name.`)
    }
    if (!byKey.has(k)) byKey.set(k, b)
  }
  for (const b of blocks.filter((x) => /swinging single door/i.test(x.spec) && /^\*/m.test(x.spec)).slice(0, 1)) {
    note(b, "Executive Table Series 3 and Series 4 have the same description but different prices (Series 4 is higher) — confirm what differs and rename the series.")
  }
  for (const b of blocks.filter((x) => /^fabric partition/i.test(x.spec))) note(b, "Fabric partition sizes are ranges (e.g. 500-800 × 300) — kept as written.")
  for (const b of blocks.filter((x) => /1800 x 800 & Side Return 1000 x 800/i.test(x.spec) && x.sizes.some((s) => /1800x600/i.test(s.size)))) {
    note(b, "Specification says 1800 × 800 with a 1000 × 800 return, but the Dimensions column says 1800 × 600 + 1000 × 600 — the Dimensions column was used; please confirm.")
  }

  // ---------- write workbook ----------
  const HEADERS = [
    ["Category", 34], ["Product Model", 26], ["Model Code", 12], ["Chair Type", 12], ["Type Code", 10],
    ["Layout", 34], ["Seats per Unit", 10], ["Item Code", 22], ["Product Name", 50], ["Selling Price (AED)", 14],
    ["Base Price (AED)", 14], ["Stock Quantity", 10], ["Headrest Colours", 12], ["Backrest Colours", 12], ["Seat Colours", 12],
    ["Base Types", 12], ["Dimension Options", 70], ["Table Top Colours", 22], ["Leg Frame Colours", 22],
    ["Dimensions / Size", 22], ["Color", 12], ["Table Top Finish / Wood", 12], ["Leg Type / Color", 12],
    ["Side Return Option", 12], ["Warranty", 10], ["Short Description", 40], ["Specifications / Details", 80], ["Image Filename", 30],
  ]
  const names = HEADERS.map(([h]) => h)
  const wb = new ExcelJS.Workbook()
  const sheet = wb.addWorksheet("Products")
  sheet.columns = HEADERS.map(([header, width]) => ({ header, width }))
  for (const r of rows) sheet.addRow(names.map((h) => r[h] ?? ""))
  sheet.getRow(1).font = { bold: true }
  sheet.views = [{ state: "frozen", ySplit: 1 }]
  sheet.getColumn(names.indexOf("Specifications / Details") + 1).alignment = { wrapText: true, vertical: "top" }
  sheet.getColumn(names.indexOf("Dimension Options") + 1).alignment = { wrapText: true, vertical: "top" }
  await wb.xlsx.writeFile(path.join(outDir, "BOSQ_ERP_Product_Import_PriceList_2026-27.xlsx"))

  const rep = new ExcelJS.Workbook()
  const rs = rep.addWorksheet("Review")
  rs.columns = [{ header: "Sheet", width: 34 }, { header: "Row", width: 6 }, { header: "Product No.", width: 10 }, { header: "Note", width: 120 }]
  for (const n of notes) rs.addRow(n)
  rs.getRow(1).font = { bold: true }
  await rep.xlsx.writeFile(path.join(outDir, "Conversion_Review_Notes.xlsx"))

  // ---------- summary ----------
  const byCat = {}
  for (const r of rows) byCat[r["Category"]] = (byCat[r["Category"]] || 0) + 1
  console.log(`Blocks: ${blocks.length}  Rows: ${rows.length}  Images: ${images}  Notes: ${notes.length}`)
  console.log(byCat)
  for (const r of rows.filter((x) => x["Product Model"])) {
    console.log(`  ${r["Product Model"].padEnd(28)} | ${String(r["Layout"]).padEnd(38)} | ${r["Item Code"].padEnd(16)} | ${String(r["Selling Price (AED)"]).padStart(6)} | seats ${r["Seats per Unit"] || "-"} | ${r["Dimension Options"].split(", ").length} sizes | img ${r["Image Filename"] ? "y" : "-"}`)
  }
  console.log("\nNOTES:")
  for (const n of notes) console.log(`  [${n[0]} r${n[1]} #${n[2]}] ${n[3]}`)
})().catch((e) => { console.error(e); process.exit(1) })
