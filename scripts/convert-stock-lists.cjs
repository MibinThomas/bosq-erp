// Converts BOSQ price/stock list workbooks into the ERP bulk-import template.
// Usage: node convert.cjs <projectRoot> <outDir> <xlsx> [<xlsx> ...]
const path = require("path")
const fs = require("fs")
const root = process.argv[2]
const outDir = process.argv[3]
const inputs = process.argv.slice(4)
const req = (m) => require(path.join(root, "node_modules", m))
const ExcelJS = req("exceljs")
const JSZip = req("jszip")
const sharp = req("sharp")

const imgDir = path.join(outDir, "images")
fs.mkdirSync(imgDir, { recursive: true })

// ---------- helpers ----------
const cellText = (v) => {
  if (v === null || v === undefined) return ""
  if (typeof v === "object") {
    if (v.richText) return v.richText.map((r) => r.text).join("")
    if ("result" in v) return cellText(v.result)
    if (v.text) return cellText(v.text)
    if (v.error) return ""
    if (v instanceof Date) return v.toISOString().slice(0, 10)
    return ""
  }
  return String(v)
}
const clean = (s) => s.replace(/ /g, " ").replace(/<br\s*\/?>/gi, "\n").replace(/[ \t]+/g, " ").trim()
const cleanMultiline = (s) =>
  clean(s).split(/\r?\n/).map((l) => l.trim()).filter(Boolean).join("\n")
const oneLine = (s) => clean(s).replace(/\s+/g, " ")
const isPlaceholder = (s) => !s || /^(—|-|–|n\/a|same as picture)$/i.test(s.trim())
const titleCase = (s) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase())
const fileSafe = (s) => s.replace(/[\/\\:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim()

const TYPO_FIX = { gery: "Grey", gray: "Grey", blck: "Black", balck: "Black", black: "Black", grey: "Grey", white: "White" }
const fixColour = (s) => {
  if (isPlaceholder(s)) return ""
  const t = clean(s)
  return TYPO_FIX[t.toLowerCase()] || titleCase(t)
}

// Colour encoded at the end of an item code, e.g. "AYX 101/Grey", "EON 201 G", "Steerex 3D - W"
const SUFFIX_COLOURS = [
  [/(?:[\s\/-]|^)tan brown$/i, "Tan Brown"],
  [/(?:[\s\/-])b\s*&\s*w$/i, "Black & White"],
  [/(?:[\s\/-])(black|blk)$/i, "Black"],
  [/(?:[\s\/-])(grey|gray)$/i, "Grey"],
  [/(?:[\s\/-])white$/i, "White"],
  [/(?:[\s\/-])cream$/i, "Cream"],
  [/(?:[\s\/-])brown$/i, "Brown"],
  [/(?:[\s\/-])silver$/i, "Silver"],
  // single-letter colour codes only after a model number ("EON 201 B", "AYZ 201B") or a dash ("MPC - W")
  [/(?:\d\s?|-\s?)b$/i, "Black"],
  [/(?:\d\s?|-\s?)g$/i, "Grey"],
  [/(?:\d\s?|-\s?)w$/i, "White"],
  [/(?:\d\s?|-\s?)s$/i, "Silver"],
]
const colourFromCode = (code) => {
  const c = code.trim().replace(/\s+with footrest$/i, "").replace(/\/hc$/i, "")
  for (const [re, name] of SUFFIX_COLOURS) if (re.test(c)) return name
  return ""
}

const chairTypeFrom = (text) => {
  const t = text.toLowerCase()
  if (/bar stool/.test(t)) return "Bar Stool"
  if (/lou?n?ge/.test(t)) return "Lounge Chair"
  if (/training|writing tablet/.test(t)) return "Training Chair"
  if (/stackable/.test(t)) return "Stackable Chair"
  if (/visitor/.test(t)) return "Visitor Chair"
  if (/high[\s-]?back/.test(t)) return "High Back"
  if (/(mid|medium|middle)[\s-]?back/.test(t)) return "Mid Back"
  if (/task/.test(t)) return "Task Chair"
  return ""
}

// First meaningful line of a spec, used as the human-readable product title
const titleFromSpec = (spec, code) => {
  let first = (spec.split("\n")[0] || "").replace(/^["'*•■\s]+/, "").replace(/^\d+[.)]\s*/, "")
  first = first.split(/\s[•■]|•|■|【/)[0]
  // text glued to a following heading, e.g. "Visitor ChairHIDA – …", "Writing TabletAttribute …"
  first = first.split(/(?<=[a-z])(?=[A-Z]{2,}|Attribute\b)/)[0]
  // drop a repeated model code at the start, e.g. "KIVA T— Training Chair"
  const codeHead = code.split(/[\s\/]/)[0]
  first = first.replace(new RegExp(`^${code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[—–-]\\s*`, "i"), "")
  if (codeHead.length > 2) first = first.replace(new RegExp(`^${codeHead}\\s+[A-Z]?\\s*[—–]\\s*`, "i"), "")
  first = first.replace(/\s+Design:.*$/i, "").replace(/\s+Attribute Specific.*$/i, "")
  first = first.replace(/\s{2,}/g, " ").trim().replace(/[,:;.\-–]+$/, "")
  if (first.length > 70) first = first.slice(0, 70).replace(/\s+\S*$/, "") + "…"
  return first
}

// ---------- in-cell ("Place in cell") picture extraction ----------
async function readInCellImages(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file))
  const read = async (p) => (zip.file(p) ? zip.file(p).async("string") : null)
  const result = new Map() // sheetName -> Map<rowNumber, {buffer, ext}>
  const metadata = await read("xl/metadata.xml")
  const rvXml = await read("xl/richData/rdrichvalue.xml")
  const relXml = await read("xl/richData/richValueRel.xml")
  const relRels = await read("xl/richData/_rels/richValueRel.xml.rels")
  const structXml = await read("xl/richData/rdrichvaluestructure.xml")
  if (!metadata || !rvXml || !relXml || !relRels) return result

  // valueMetadata bk -> rc v (index into futureMetadata bk) -> rvb i (rich value index)
  const fmBlock = (metadata.match(/<futureMetadata[^>]*name="XLRICHVALUE"[\s\S]*?<\/futureMetadata>/) || [""])[0]
  const fmRvb = [...fmBlock.matchAll(/<bk>[\s\S]*?rvb[^>]*\bi="(\d+)"[\s\S]*?<\/bk>/g)].map((m) => +m[1])
  const vmBlock = (metadata.match(/<valueMetadata[\s\S]*?<\/valueMetadata>/) || [""])[0]
  const vmToRv = [...vmBlock.matchAll(/<bk>\s*<rc[^>]*\bv="(\d+)"[^>]*\/>\s*<\/bk>/g)].map((m) => fmRvb[+m[1]])

  // position of _rvRel:LocalImageIdentifier inside each structure
  const structs = [...(structXml || "").matchAll(/<s\b[^>]*>([\s\S]*?)<\/s>/g)].map((m) =>
    [...m[1].matchAll(/<k[^>]*\bn="([^"]+)"/g)].map((k) => k[1]).indexOf("_rvRel:LocalImageIdentifier"))
  const richValues = [...rvXml.matchAll(/<rv\b[^>]*\bs="(\d+)"[^>]*>([\s\S]*?)<\/rv>/g)].map((m) => {
    const vals = [...m[2].matchAll(/<v[^>]*>([^<]*)<\/v>/g)].map((v) => v[1])
    const pos = structs[+m[1]] >= 0 ? structs[+m[1]] : 0
    return +vals[pos]
  })
  const relIds = [...relXml.matchAll(/<rel\b[^>]*r:id="([^"]+)"/g)].map((m) => m[1])
  const relTargets = Object.fromEntries([...relRels.matchAll(/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((m) => [m[1], m[2]]))

  const wbXml = await read("xl/workbook.xml")
  const wbRels = await read("xl/_rels/workbook.xml.rels")
  const wbTargets = Object.fromEntries([...wbRels.matchAll(/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((m) => [m[1], m[2]]))
  for (const m of wbXml.matchAll(/<sheet\b[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)) {
    const sheetName = m[1].replace(/&amp;/g, "&")
    const target = wbTargets[m[2]].replace(/^\/?xl\//, "")
    const sheetXml = await read(`xl/${target}`)
    if (!sheetXml) continue
    const rows = new Map()
    for (const c of sheetXml.matchAll(/<c\b[^>]*\br="([A-Z]+)(\d+)"[^>]*\bvm="(\d+)"/g)) {
      const rvIndex = vmToRv[+c[3] - 1]
      const relIndex = richValues[rvIndex]
      const media = relTargets[relIds[relIndex]]
      if (!media) continue
      const mediaPath = path.posix.normalize(path.posix.join("xl/richData", media))
      const f = zip.file(mediaPath)
      if (!f) continue
      if (!rows.has(+c[2])) rows.set(+c[2], { buffer: await f.async("nodebuffer"), ext: path.extname(mediaPath).slice(1) })
    }
    result.set(sheetName, rows)
  }
  return result
}

// ---------- chair grouping ----------
// The price list has one row per colour (e.g. "AYX 101/Black", "AYX 101/Grey"). The quotation chair
// selector needs one item per chair model + chair type, with colours as component options.
const COLOUR_WORDS = ["tan brown", "black", "grey", "gray", "white", "cream", "brown", "silver", "red", "blue", "green", "beige"]
const KNOWN_FABRIC_COLOURS = ["Persian Blue", "Jet Black", "Black", "Candy Red", "Apple Green", "Silver Grey", "White", "Grey", "Brown", "Cream", "Beige", "Tan Brown", "Red", "Blue", "Green"]

// "AYX 101/Grey" → { modelCode: "AYX", typeCode: "101", extra: "", colours: ["Grey"] }
function parseChairCode(code) {
  const colours = []
  let s = " " + code.replace(/\//g, " / ") + " "
  for (const w of COLOUR_WORDS) {
    const re = new RegExp(`\\s${w.replace(" ", "\\s+")}(?=[\\s/])`, "ig")
    if (re.test(s)) {
      colours.push(w === "gray" ? "Grey" : titleCase(w))
      s = s.replace(re, " ")
    }
  }
  // single-letter colour after a model number: "EON 201 B", "AYZ 201B"
  s = s.replace(/(\d{3})\s?([BGW])(?=\s)/i, (_, num, letter) => {
    colours.push({ B: "Black", G: "Grey", W: "White" }[letter.toUpperCase()])
    return num
  })
  s = s.replace(/\s*\/\s*/g, " ").replace(/\s+/g, " ").trim()
  const m = s.match(/^(.*?)\s*(\d{3})\s*(.*)$/)
  if (m && m[1]) return { modelCode: m[1].trim().toUpperCase(), typeCode: m[2], extra: m[3].trim(), colours }
  const tokens = s.split(" ")
  if (tokens.length > 1 && tokens.slice(1).join(" ").length <= 4) {
    return { modelCode: tokens[0].toUpperCase(), typeCode: tokens.slice(1).join(" ").toUpperCase(), extra: "", colours }
  }
  return { modelCode: tokens[0].toUpperCase(), typeCode: "", extra: "", colours }
}

// "Persian Blue , Black Candy Red Apple Green Silver Grey, White" → known colour names in order
function parseColourList(text) {
  if (!text) return []
  const found = []
  let rest = " " + text.replace(/[,;|]/g, " ") + " "
  for (const name of [...KNOWN_FABRIC_COLOURS].sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`\\s${name.replace(" ", "\\s+")}(?=\\s)`, "ig")
    let mm
    while ((mm = re.exec(rest))) {
      found.push({ name, at: mm.index })
      rest = rest.slice(0, mm.index) + " ".repeat(mm[0].length) + rest.slice(mm.index + mm[0].length)
      re.lastIndex = 0
    }
  }
  return [...new Set(found.sort((a, b) => a.at - b.at).map((f) => f.name))]
}

const prettyModel = (code) => (/^[A-Z]{4,}$/.test(code) ? titleCase(code) : code)
const TYPE_BY_LETTER_CODE = { HB: "High Back", MB: "Mid Back", LB: "Low Back" }

// Base material mentioned next to "base"/"leg"/"star" (so "aluminium alloy mechanism" doesn't count)
function detectBaseTypes(text) {
  const found = []
  for (const [label, re] of [["Nylon", "nylon"], ["Aluminium", "alumin(?:i)?um"], ["Chrome", "chrome(?:d)?(?: coated)?"]]) {
    const near = new RegExp(`${re}[\\w\\s-]{0,25}?\\b(base|leg|star)|\\b(base|leg)\\b[^.\\n]{0,25}?${re}`, "i")
    if (near.test(text)) found.push(label)
  }
  return found
}

function groupChairs(rows, note) {
  // model name from the spec heading, e.g. "ACE – Executive Swivel Chair" → "Ace"
  const modelNames = new Map()
  for (const r of rows) {
    const { modelCode } = parseChairCode(r.code)
    const m = r.specifications.match(/^["*\s]*([A-Z][A-Za-z]{2,})\s*[–—-]/)
    if (m && m[1].toUpperCase() !== modelCode.split(" ")[0] && !modelNames.has(modelCode)) modelNames.set(modelCode, titleCase(m[1]))
  }

  // Rows under a "custom" section heading only become a separate item when the same model/type also
  // exists as a standard item (e.g. HCY 101 in ready-stock colours vs HCY 101 in custom colours)
  const baseKey = (r, parsed) => [r.category, parsed.modelCode, parsed.typeCode, parsed.extra.toLowerCase()].join("|")
  const standardKeys = new Set(rows.filter((r) => !/custom/i.test(r.section)).map((r) => baseKey(r, parseChairCode(r.code))))
  const groups = new Map()
  for (const r of rows) {
    const parsed = parseChairCode(r.code)
    const custom = /custom/i.test(r.section) && standardKeys.has(baseKey(r, parsed))
    const key = baseKey(r, parsed) + (custom ? "|custom" : "")
    if (!groups.has(key)) groups.set(key, { ...parsed, custom, rows: [] })
    groups.get(key).rows.push({ ...r, colours: parsed.colours })
  }

  const items = []
  for (const g of groups.values()) {
    const rows = g.rows
    const first = rows[0]
    const modelName = modelNames.get(g.modelCode) || prettyModel(g.modelCode)
    const minPrice = Math.min(...rows.map((r) => r.sellingPrice || Infinity))
    const price = Number.isFinite(minPrice) ? minPrice : 0

    // Type codes follow the series convention (101 High Back, 201 Mid Back, 301 Visitor); a specification
    // that contradicts its code is reported rather than trusted.
    const specType = first.chairType
    let chairType
    if (g.typeCode === "101") chairType = "High Back"
    else if (g.typeCode === "201") chairType = specType && !/high back/i.test(specType) ? specType : "Mid Back"
    else if (g.typeCode === "301") chairType = specType && !/back$/i.test(specType) ? specType : "Visitor Chair"
    else chairType = TYPE_BY_LETTER_CODE[g.typeCode] || specType || (g.typeCode ? titleCase(g.typeCode) : "Standard")
    if (specType && /back$/i.test(specType) && specType !== chairType && /^(101|201)$/.test(g.typeCode)) {
      note({ file: first.file, sheet: first.sheet, row: first.row, code: first.code },
        `Specification says "${specType}" but type code ${g.typeCode} means ${chairType} — used ${chairType}. Please check the specification text.`)
    }
    const extra = g.extra.replace(/^with\s+/i, "with ")
    if (extra) chairType += /^with /i.test(extra) ? ` ${extra}` : ` (${extra})`
    if (g.custom) chairType += " (Custom Colours)"

    const itemCode = [g.modelCode.replace(/\s+/g, "-"), g.typeCode.replace(/\s+/g, "-"),
      g.extra.replace(/^with\s+/i, "").toUpperCase().replace(/[^A-Z0-9]+/g, "-"), g.custom ? "C" : ""]
      .filter(Boolean).join("-")

    // Colour options: the colour versions of the row (with price difference as customization charge),
    // otherwise the sheet's seat/back colour lists or the customisation colour list.
    const variantColours = []
    for (const r of rows) {
      for (const c of r.colours) {
        if (!variantColours.some((v) => v.name === c)) variantColours.push({ name: c, surcharge: Math.max(0, (r.sellingPrice || price) - price) })
      }
    }
    const fmt = (opts, withCharge) => opts.map((o) => (withCharge && o.surcharge ? `${o.name} (+${o.surcharge})` : o.name)).join(", ")
    let backrest = "", seat = "", headrest = ""
    if (variantColours.length) {
      backrest = fmt(variantColours, true)
      seat = fmt(variantColours, false)
    } else {
      const back = parseColourList(first.backList)
      const seatList = parseColourList(first.seatList)
      const custom = /,/.test(first.customisation) && !/\d/.test(first.customisation)
        ? first.customisation.split(",").map((s) => titleCase(s.trim())).filter(Boolean) : []
      const single = first.colour ? [first.colour] : []
      backrest = (back.length ? back : custom.length ? custom : single).join(", ")
      seat = (seatList.length ? seatList : custom.length ? custom : single).join(", ")
    }
    if (/high[\s-]?back/i.test(chairType)) headrest = backrest.replace(/\s*\(\+[\d.]+\)/g, "")

    const bases = detectBaseTypes(rows.map((r) => `${r.specifications}\n${r.remarks || ""}\n${r.customisation || ""}`).join("\n"))

    const withImage = [...rows].sort((a, b) => (a.sellingPrice || 0) - (b.sellingPrice || 0)).find((r) => r.imageFilename)
    const item = {
      modelKey: `${first.category}|${g.modelCode}`,
      category: first.category,
      modelName,
      modelCode: g.modelCode,
      chairType,
      typeCode: g.typeCode,
      itemCode,
      productName: `${modelName} ${chairType}`.replace(/\s+/g, " ").trim(),
      price,
      stock: rows.reduce((s, r) => s + (r.stock || 0), 0),
      headrest,
      backrest,
      seat,
      base: bases.join(", "),
      dimensions: rows.find((r) => r.dimensions)?.dimensions || "",
      shortDescription: first.shortDescription,
      specifications: first.specifications,
      imageFilename: withImage?.imageFilename || "",
    }
    items.push(item)

    const ref = { file: first.file, sheet: first.sheet, row: first.row, code: itemCode }
    const from = rows.map((r) => `${r.code} (${r.sellingPrice || 0})`).join(", ")
    note(ref, `Chair item ${itemCode} "${item.productName}" built from: ${from}. Options — Backrest: ${backrest || "none"}; Seat: ${seat || "none"}${headrest ? `; Headrest: ${headrest}` : ""}; Base: ${item.base || "none"}. Please verify against the real option catalogue.`)
    if (!item.base) note(ref, `No base type found in the specification for ${itemCode} — fill "Base Types" (e.g. Nylon, Aluminium, Chrome) before importing.`)
  }
  return items.sort((a, b) => a.category.localeCompare(b.category) || a.modelName.localeCompare(b.modelName) || a.itemCode.localeCompare(b.itemCode, undefined, { numeric: true }))
}

// ---------- main ----------
// Sheets map onto the ERP's main product categories (Chairs, Workstations, Storage, Accessories).
// "Parent > Child" creates a sub-category under the parent on import.
const SHEET_CATEGORY = {
  "premium chairs": "Chairs > Premium Chairs",
  "executive chairs": "Chairs > Executive Chairs",
  "pdu": "Accessories",
  "metal storage": "Storage",
  "negotiation table frame": "Workstations",
  "other accessories": "Accessories",
  "height adjustable frame": "Workstations",
}

;(async () => {
  const products = []
  const issues = []
  const note = (p, issue) => issues.push({ file: p.file, sheet: p.sheet, row: p.row, code: p.code, issue })
  const imageCount = { floating: 0, inCell: 0 }

  for (const file of inputs) {
    const fileName = path.basename(file)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(file)
    const inCell = await readInCellImages(file)

    for (const ws of wb.worksheets) {
      const category = SHEET_CATEGORY[ws.name.trim().toLowerCase()]
      if (!category) continue

      // header row & columns
      let headerRow = 0
      const col = {}
      for (let r = 1; r <= Math.min(15, ws.rowCount) && !headerRow; r++) {
        const row = ws.getRow(r)
        for (let c = 1; c <= ws.columnCount; c++) {
          const h = oneLine(cellText(row.getCell(c).value)).toLowerCase()
          if (h === "item code" || h === "product code") headerRow = r
        }
        if (headerRow) {
          for (let c = 1; c <= ws.columnCount; c++) {
            const h = oneLine(cellText(row.getCell(c).value)).toLowerCase()
            if (h) col[h] = c
          }
        }
      }
      if (!headerRow) continue
      console.log(`[${ws.name}] columns:`, Object.keys(col).join(" | "))
      const get = (row, ...names) => {
        for (const n of names) if (col[n]) return cellText(row.getCell(col[n]).value)
        return ""
      }

      // floating pictures anchored by row
      // A picture is attached to every row it covers substantially, so one photo shared by the
      // White/Black rows of the same product is used for both. Rows keep their best-covering picture.
      const floating = new Map()
      const best = new Map()
      for (const img of ws.getImages()) {
        const tl = img.range.tl, br = img.range.br
        const top = tl.row, bottom = br ? br.row : tl.row + 1 // fractional, 0-based row units
        const media = wb.getImage(Number(img.imageId))
        if (!media?.buffer) continue
        const candidates = []
        for (let r0 = Math.floor(top); r0 < Math.ceil(bottom); r0++) {
          const overlap = Math.min(bottom, r0 + 1) - Math.max(top, r0)
          candidates.push([r0 + 1, overlap])
        }
        const strong = candidates.filter(([, o]) => o >= 0.35)
        const chosen = strong.length ? strong : [candidates.sort((a, b) => b[1] - a[1])[0]]
        for (const [r, overlap] of chosen) {
          if (!best.has(r) || best.get(r) < overlap) {
            best.set(r, overlap)
            floating.set(r, { buffer: media.buffer, ext: media.extension })
          }
        }
      }
      const cellImages = inCell.get(ws.name) || new Map()

      let section = ""
      for (let r = headerRow + 1; r <= ws.rowCount; r++) {
        const row = ws.getRow(r)
        const codeCell = row.getCell(1)
        const code = oneLine(cellText(codeCell.value))
        if (!code) continue
        // merged section headings ("Ergonomic Mesh Chairs", "Leather Custom Models…")
        if (codeCell.isMerged && row.getCell(3).isMerged && row.getCell(3).master.address === codeCell.master.address) {
          section = code
          continue
        }

        const p = { file: fileName, sheet: ws.name, row: r, code, category, section }
        const isPriceList = !!col["price (aed, excl. vat)"]
        p.isChair = isPriceList

        if (isPriceList) {
          const spec = cleanMultiline(get(row, "specifications"))
          const priceRaw = row.getCell(col["price (aed, excl. vat)"]).value
          const price = typeof priceRaw === "number" ? priceRaw : parseFloat(cellText(priceRaw))
          const qtyRaw = clean(get(row, "qty"))
          const availability = clean(get(row, "availability"))
          const remarks = clean(get(row, "remarks"))
          const customisation = clean(get(row, "customisation"))
          const frame = fixColour(get(row, "frame colour"))
          const title = titleFromSpec(spec, code)

          p.name = title ? `${code} – ${title}` : code
          p.shortDescription = title
          p.specifications = spec
          p.sellingPrice = Number.isFinite(price) ? price : 0
          p.dimensions = isPlaceholder(get(row, "dimensions (w×d×h)")) ? "" : clean(get(row, "dimensions (w×d×h)"))
          p.chairType = chairTypeFrom(`${code} ${spec}`)
          p.customisation = customisation
          p.remarks = remarks
          p.seatList = isPlaceholder(get(row, "seat colour")) ? "" : oneLine(get(row, "seat colour"))
          p.backList = isPlaceholder(get(row, "back mesh colour")) ? "" : oneLine(get(row, "back mesh colour"))

          const codeColour = colourFromCode(code)
          let colour = codeColour || frame
          if (!colour && customisation && /,/.test(customisation) && !/\d/.test(customisation)) {
            colour = customisation.split(",").map((s) => titleCase(s.trim())).filter(Boolean).join(", ")
          }
          p.colour = colour
          if (codeColour && frame && codeColour.toLowerCase() !== frame.toLowerCase()) {
            note(p, `Item code says ${codeColour} but Frame Colour column says "${clean(get(row, "frame colour"))}" — used ${codeColour}.`)
          }

          const titleColour = (title.match(/\b(white|black|grey|gray)\b/i) || [])[1]
          if (titleColour && colour && !colour.toLowerCase().includes(titleColour.toLowerCase().replace("gray", "grey"))) {
            note(p, `Description says "${titleColour}" but the item is ${colour} — please check the specification text.`)
          }

          if (qtyRaw === "" || /^[-–—]$/.test(qtyRaw)) {
            p.stock = 0
            note(p, `No stock quantity ("${qtyRaw || "blank"}") — imported as 0. Availability: ${availability || "n/a"}.`)
          } else {
            p.stock = Math.max(0, Math.trunc(Number(qtyRaw)) || 0)
            if (p.stock > 0 && /out of stock/i.test(availability)) note(p, `Qty is ${p.stock} but Availability says "Out of Stock".`)
          }
          if (!p.sellingPrice) note(p, "No price in source — imported at 0.")
          if (/discontinued/i.test(remarks)) note(p, "Marked \"Discontinued\" in Remarks — imported as active; deactivate in ERP if it should not be quoted.")
          if (remarks && !/^(new arrival|ready stock( available)?|new arrival \| ready stock( available)?)\s*\|?$/i.test(remarks)) {
            note(p, `Internal remark not imported: "${remarks}"`)
          }
        } else {
          const product = clean(get(row, "product"))
          const spec = cleanMultiline(get(row, "specification"))
          const colour = colourFromCode(code)
          const stockRaw = get(row, "current stock")
          const status = clean(get(row, "stock status"))

          p.name = colour && !product.toLowerCase().includes(colour.toLowerCase()) ? `${product} – ${colour}` : product || code
          p.shortDescription = product
          p.specifications = spec
          p.sellingPrice = 0
          p.colour = colour
          p.stock = Math.max(0, Math.trunc(Number(stockRaw)) || 0)
          p.dimensions = ""
          p.chairType = ""
          if (/on hold/i.test(status)) note(p, `Stock status "${status}" — imported with stock ${p.stock}.`)
          if (colour === "Black" && /white finish/i.test(spec)) note(p, "Black item but specification says \"White Finish\" — please check the spec text.")
        }

        // picture
        const pic = floating.get(r) || cellImages.get(r)
        if (pic) {
          if (floating.get(r)) imageCount.floating++
          else imageCount.inCell++
          const imageFilename = `IMG-${fileSafe(code)}.jpg`
          await sharp(pic.buffer)
            .rotate()
            .resize(800, 800, { fit: "inside", withoutEnlargement: true })
            .flatten({ background: "#ffffff" })
            .jpeg({ quality: 82, mozjpeg: true })
            .toFile(path.join(imgDir, imageFilename))
          p.imageFilename = imageFilename
        } else {
          p.imageFilename = ""
          note(p, "No product picture found in the source sheet.")
        }

        products.push(p)
      }
    }
  }

  // duplicate codes
  const seen = new Map()
  for (const p of products) {
    const k = p.code.toLowerCase()
    if (seen.has(k)) {
      note(p, `Duplicate item code (also on ${seen.get(k).sheet} row ${seen.get(k).row}) — the import would overwrite the earlier row.`)
    } else seen.set(k, p)
  }

  // ---------- group chair rows into model + chair type (colours become options) ----------
  const chairRows = products.filter((p) => p.isChair)
  const otherRows = products.filter((p) => !p.isChair)
  const chairItems = groupChairs(chairRows, note)

  // ---------- write import workbook (same columns as public/templates/bosq_master_product_bulk_import_template.xlsx) ----------
  const HEADERS = [
    ["Category", 26], ["Product Model", 16], ["Model Code", 12], ["Chair Type", 26], ["Type Code", 10],
    ["Layout", 20], ["Seats per Unit", 10],
    ["Item Code", 22], ["Product Name", 40], ["Selling Price (AED)", 14], ["Base Price (AED)", 14], ["Stock Quantity", 10],
    ["Headrest Colours", 26], ["Backrest Colours", 26], ["Seat Colours", 26], ["Base Types", 22],
    ["Dimension Options", 30], ["Table Top Colours", 22], ["Leg Frame Colours", 20],
    ["Dimensions / Size", 24], ["Color", 14], ["Table Top Finish / Wood", 14], ["Leg Type / Color", 14],
    ["Side Return Option", 14], ["Warranty", 10], ["Short Description", 40], ["Specifications / Details", 70],
    ["Image Filename", 34],
  ]
  const headerNames = HEADERS.map(([h]) => h)
  const out = new ExcelJS.Workbook()
  const sheet = out.addWorksheet("Products")
  sheet.columns = HEADERS.map(([header, width]) => ({ header, width }))
  const addRow = (values) => sheet.addRow(headerNames.map((h) => values[h] ?? ""))
  for (const c of chairItems) {
    addRow({
      "Category": c.category, "Product Model": c.modelName, "Model Code": c.modelCode, "Chair Type": c.chairType, "Type Code": c.typeCode,
      "Item Code": c.itemCode, "Product Name": c.productName, "Selling Price (AED)": c.price || "", "Base Price (AED)": c.price ? "" : 0,
      "Stock Quantity": c.stock, "Headrest Colours": c.headrest, "Backrest Colours": c.backrest, "Seat Colours": c.seat, "Base Types": c.base,
      "Dimensions / Size": c.dimensions, "Short Description": c.shortDescription, "Specifications / Details": c.specifications,
      "Image Filename": c.imageFilename,
    })
  }
  for (const p of otherRows) {
    addRow({
      "Category": p.category, "Item Code": p.code, "Product Name": p.name, "Selling Price (AED)": p.sellingPrice || "",
      "Base Price (AED)": p.sellingPrice ? "" : 0, "Stock Quantity": p.stock, "Dimensions / Size": p.dimensions, "Color": p.colour,
      "Short Description": p.shortDescription, "Specifications / Details": p.specifications, "Image Filename": p.imageFilename,
    })
  }
  sheet.getRow(1).font = { bold: true }
  sheet.views = [{ state: "frozen", ySplit: 1 }]
  sheet.getColumn(headerNames.indexOf("Specifications / Details") + 1).alignment = { wrapText: true, vertical: "top" }
  const importFile = path.join(outDir, "BOSQ_ERP_Product_Import_16-10-2026.xlsx")
  await out.xlsx.writeFile(importFile)

  // ---------- write review report ----------
  const rep = new ExcelJS.Workbook()
  const rs = rep.addWorksheet("Review")
  rs.columns = [
    { header: "Source File", width: 44 }, { header: "Sheet", width: 22 }, { header: "Row", width: 6 },
    { header: "Item Code", width: 28 }, { header: "Note", width: 110 },
  ]
  for (const i of issues) rs.addRow([i.file, i.sheet, i.row, i.code, i.issue])
  rs.getRow(1).font = { bold: true }
  rs.views = [{ state: "frozen", ySplit: 1 }]
  await rep.xlsx.writeFile(path.join(outDir, "Conversion_Review_Notes.xlsx"))

  // ---------- console summary ----------
  const byCat = {}
  for (const p of products) byCat[p.category] = (byCat[p.category] || 0) + 1
  console.log("Products:", products.length, byCat)
  console.log("Images:", imageCount, "missing:", products.filter((p) => !p.imageFilename).length)
  console.log("Zero-price:", products.filter((p) => !p.sellingPrice).length, " Issues:", issues.length)
  console.log("Headers seen:", JSON.stringify([...new Set(products.map((p) => p.sheet))]))
  console.log(`Chairs: ${chairRows.length} price-list rows → ${chairItems.length} model/type items in ${new Set(chairItems.map((c) => c.modelKey)).size} models`)
  console.log("\nCHAIR ITEMS:")
  for (const c of chairItems) {
    console.log(`  ${(c.modelName + " — " + c.modelCode).padEnd(22)} | ${c.chairType.padEnd(30)} | ${c.itemCode.padEnd(20)} | ${String(c.price).padStart(5)} | stk ${String(c.stock).padStart(4)} | H: ${c.headrest} | B: ${c.backrest} | S: ${c.seat} | Base: ${c.base}`)
  }
  console.log("\nISSUES:")
  for (const i of issues) console.log(`  [${i.sheet} r${i.row}] ${i.code}: ${i.issue}`)
})().catch((e) => { console.error(e); process.exit(1) })
