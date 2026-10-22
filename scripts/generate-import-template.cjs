// Generates the product bulk import templates used by Products → Bulk Upload:
//   public/templates/bosq_master_product_bulk_import_template.xlsx  (Products sheet + Guide sheet)
//   public/templates/bosq_product_bulk_import_template.csv
// Usage: node scripts/generate-import-template.cjs
const path = require("path")
const fs = require("fs")
const ExcelJS = require(path.join(process.cwd(), "node_modules", "exceljs"))

// [header, width, help, group] — group highlights the chair / workstation configurator columns
const COLUMNS = [
  ["Category", 26, "Required. Use \"Parent > Child\" to file under a parent, e.g. \"Chairs > Executive Chairs\". Main categories: Chairs, Workstations, Storage, Accessories."],
  ["Product Model", 18, "Chairs & workstations. Groups the types/layouts of one model in the quotation selector, e.g. \"Ace\" or \"Zen X\". Leave blank for other products.", "both"],
  ["Model Code", 12, "Chairs & workstations. Short model/series code, e.g. \"HCY\" → \"Ace — HCY\".", "both"],
  ["Chair Type", 16, "Chairs: High Back, Mid Back, Low Back, Visitor Chair, … Headrest colours are only offered for High Back.", "chair"],
  ["Type Code", 10, "Chairs: shown with the type, e.g. 101 → \"High Back — 101\".", "chair"],
  ["Layout", 22, "Workstations: seater and layout, e.g. Single Seater, 2 Seater Linear, 2 Seater Face To Face, Cluster Of 4, Cluster Of 6, Cluster Of 8.", "ws"],
  ["Seats per Unit", 10, "Workstations: seating positions in one unit (Cluster Of 4 = 4). Quantity on a quotation counts complete units.", "ws"],
  ["Item Code", 18, "Unique product code. Re-importing the same code updates that product. Leave blank to auto-generate."],
  ["Product Name", 34, "Required. Name shown in search results and quotations."],
  ["Selling Price (AED)", 14, "List price excl. VAT, used as-is for every customer segment. Use this OR Base Price. For a configurable product this is the price of its smallest/standard option."],
  ["Base Price (AED)", 14, "Cost price. Segment prices are calculated from the pricing margins in Settings."],
  ["Stock Quantity", 10, "Whole number, 0 or more."],
  ["Headrest Colours", 22, "Chairs (High Back only). Comma-separated. Add a customization charge in brackets: \"Black, Grey (+50)\".", "chair"],
  ["Backrest Colours", 22, "Chairs. Comma-separated options with optional charges, e.g. \"Black, Grey, Beige (+40)\".", "chair"],
  ["Seat Colours", 22, "Chairs. Comma-separated options with optional charges.", "chair"],
  ["Base Types", 22, "Chairs. e.g. \"Nylon, Aluminium (+75), Chrome (+120)\".", "chair"],
  ["Dimension Options", 34, "Workstations: overall L × W × H in mm for this layout, comma-separated, with optional charges, e.g. \"2400x1200x750, 2800x1200x750 (+450)\".", "ws"],
  ["Table Top Colours", 24, "Workstations: available tabletop colours, e.g. \"White, Oak (+120), Walnut (+150)\".", "ws"],
  ["Leg Frame Colours", 22, "Workstations: available leg frame colours, e.g. \"White, Black\".", "ws"],
  ["Dimensions / Size", 20, "Single size for non-configurable products, e.g. W70 × D70 × H123-130 cm."],
  ["Color", 14, "Non-configurable products: finish colour, e.g. White, Black."],
  ["Table Top Finish / Wood", 14, "Non-configurable workstation products: top finish."],
  ["Leg Type / Color", 14, "Non-configurable workstation products: leg/frame type."],
  ["Side Return Option", 14, "Workstations/Storage: storage or side-return option."],
  ["Warranty", 10, "e.g. 3 Years. If blank the importer uses 5 Years."],
  ["Short Description", 34, "One-line description used as the product description."],
  ["Specifications / Details", 50, "Full specification text (one feature per line)."],
  ["Image Filename", 26, "File name of the product photo, uploaded in the importer's picture step, e.g. HCY-101.jpg."],
]

// Example rows (illustrative values — replace with real products, sizes, colours and prices)
const chair = (type, code, typeCode, price, headrest, extra = {}) => ({
  "Category": "Chairs > Executive Chairs", "Product Model": "Ace", "Model Code": "HCY", "Chair Type": type, "Type Code": typeCode,
  "Item Code": code, "Product Name": `Ace ${type} Chair`, "Selling Price (AED)": price, "Stock Quantity": 10,
  "Headrest Colours": headrest ? "Black, Grey, Beige" : "", "Backrest Colours": "Black, Grey, Beige", "Seat Colours": "Black, Grey, Beige",
  "Base Types": "Nylon, Aluminium (+75), Chrome (+120)", "Warranty": "3 Years", "Image Filename": `${code}.jpg`, ...extra,
})
const zenx = (layout, code, seats, dims, price) => ({
  "Category": "Workstations", "Product Model": "Zen X", "Model Code": "ZENX", "Layout": layout, "Seats per Unit": seats,
  "Item Code": code, "Product Name": `Zen X Workstation — ${layout}`, "Selling Price (AED)": price, "Stock Quantity": 0,
  "Dimension Options": dims, "Table Top Colours": "White, Grey Laminate, Oak (+120), Walnut (+150)", "Leg Frame Colours": "White, Black",
  "Warranty": "5 Years", "Short Description": `Zen X workstation, ${layout.toLowerCase()}`, "Image Filename": `${code}.jpg`,
})
const EXAMPLES = [
  chair("High Back", "HCY-101", "101", 1102, true, { "Dimensions / Size": "W70 × D70 × H123-130 cm", "Short Description": "Executive swivel chair, high back" }),
  chair("Mid Back", "HCY-201", "201", 1054, false, { "Dimensions / Size": "W70 × D70 × H118-125 cm", "Short Description": "Executive swivel chair, medium back" }),
  chair("Low Back", "HCY-301", "301", 823, false, { "Base Types": "Chrome", "Dimensions / Size": "W70 × D58 × H97 cm", "Short Description": "Visitor chair, low back" }),
  zenx("Single Seater", "ZENX-1S", 1, "1200x600x750, 1400x700x750 (+80), 1600x800x750 (+160)", 1450),
  zenx("2 Seater Linear", "ZENX-2L", 2, "2400x600x750, 2800x700x750 (+160), 3200x800x750 (+320)", 2650),
  zenx("2 Seater Face To Face", "ZENX-2F", 2, "1200x1200x750, 1400x1400x750 (+160), 1600x1600x750 (+320)", 2700),
  zenx("Cluster Of 4", "ZENX-C4", 4, "2400x1200x750, 2800x1400x750 (+320), 3200x1600x750 (+640)", 5100),
  zenx("Cluster Of 6", "ZENX-C6", 6, "3600x1200x750, 4200x1400x750 (+480), 4800x1600x750 (+960)", 7500),
  zenx("Cluster Of 8", "ZENX-C8", 8, "4800x1200x750, 5600x1400x750 (+640), 6400x1600x750 (+1280)", 9900),
  { "Category": "Storage", "Item Code": "STEEREX-3D-B", "Product Name": "3 Drawer Metal Pedestal – Black", "Base Price (AED)": 0, "Stock Quantity": 198,
    "Dimensions / Size": "390L × 500D × 600H mm", "Color": "Black", "Short Description": "3 drawer metal pedestal", "Specifications / Details": "Metal craft drawer pedestal\nCentral locking" },
]

const FILL = { chair: "FFFDE9D9", ws: "FFDDEBF7", both: "FFEDE7F6" }

;(async () => {
  const outDir = path.join(process.cwd(), "public", "templates")
  fs.mkdirSync(outDir, { recursive: true })
  const headers = COLUMNS.map(([h]) => h)

  const wb = new ExcelJS.Workbook()
  const sheet = wb.addWorksheet("Products")
  sheet.columns = COLUMNS.map(([header, width]) => ({ header, width }))
  for (const ex of EXAMPLES) sheet.addRow(headers.map((h) => ex[h] ?? ""))
  sheet.getRow(1).font = { bold: true }
  sheet.views = [{ state: "frozen", ySplit: 1 }]
  COLUMNS.forEach(([, , , group], i) => {
    if (group) sheet.getCell(1, i + 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL[group] } }
  })
  sheet.getColumn(headers.indexOf("Specifications / Details") + 1).alignment = { wrapText: true, vertical: "top" }

  const guide = wb.addWorksheet("Guide")
  guide.columns = [{ header: "Column", width: 26 }, { header: "How to fill it", width: 120 }]
  for (const [name, , help] of COLUMNS) guide.addRow([name, help])
  guide.addRow([])
  guide.addRow(["Chairs", "One row per chair model + chair type (e.g. Ace High Back, Ace Mid Back). Fill the red-tinted chair columns. The quotation chair selector shows the model, its types and the colour/base options."])
  guide.addRow(["Workstations", "One row per workstation model + layout (e.g. Zen X Cluster Of 4). Fill the blue-tinted workstation columns. Quantity on a quotation counts complete units (2 × Cluster Of 4 = 8 seats)."])
  guide.addRow(["Other products", "Leave the chair and workstation columns blank. Storage and Accessories are chosen with the catalog search on the quotation page."])
  guide.addRow(["Option charges", "Any option may carry a customization charge in brackets, e.g. \"Oak (+120)\". The charge is added to the unit price when that option is chosen."])
  guide.addRow(["Example rows", "The rows on the Products sheet are examples — replace them with your products before importing."])
  guide.getRow(1).font = { bold: true }
  guide.getColumn(2).alignment = { wrapText: true, vertical: "top" }

  const xlsxPath = path.join(outDir, "bosq_master_product_bulk_import_template.xlsx")
  await wb.xlsx.writeFile(xlsxPath)

  const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`
  const csv = [headers, ...EXAMPLES.map((ex) => headers.map((h) => ex[h] ?? ""))].map((r) => r.map(csvCell).join(",")).join("\n")
  const csvPath = path.join(outDir, "bosq_product_bulk_import_template.csv")
  fs.writeFileSync(csvPath, "﻿" + csv)

  console.log("Wrote", xlsxPath)
  console.log("Wrote", csvPath)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
