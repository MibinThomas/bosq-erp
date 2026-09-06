const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

async function generateExcelTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Bosq ERP Catalog System";
  workbook.created = new Date();

  // 1. SHEET: Instructions & Guidelines
  const guideSheet = workbook.addWorksheet("Instructions & Guidelines", {
    views: [{ showGridLines: true }],
  });

  guideSheet.columns = [
    { header: "Step / Section", key: "section", width: 25 },
    { header: "Sheet Name", key: "sheet", width: 20 },
    { header: "Column / Field Name", key: "field", width: 25 },
    { header: "Required?", key: "required", width: 12 },
    { header: "Description & Example Value", key: "description", width: 65 },
  ];

  const guideRows = [
    { section: "Overview", sheet: "-", field: "Master Model Concept", required: "-", description: "Products are organized into Master Models (e.g. Avon Chair, Zenith Workstation) with Sub-models (High Back, Mid Back) and Variants (Color, Finish) beneath them." },
    { section: "Sheet 1: Base Products", sheet: "product_base", field: "title", required: "YES", description: "Name of the Master Product Series (e.g. 'Avon', 'Monarch', 'Zenith Workstation', 'Kube Pedestal')." },
    { section: "Sheet 1: Base Products", sheet: "product_base", field: "category", required: "YES", description: "Category name (e.g. 'Chairs', 'Workstations', 'Desks', 'Sofas', 'Storages', 'Pedestals', 'Accessories')." },
    { section: "Sheet 1: Base Products", sheet: "product_base", field: "description", required: "NO", description: "General description of the product series." },
    { section: "Sheet 1: Base Products", sheet: "product_base", field: "warranty", required: "NO", description: "Default warranty period (e.g. '3 Years', '5 Years')." },
    
    { section: "Sheet 2: Sub-Models", sheet: "product_models", field: "base_title", required: "YES", description: "Must match the 'title' from product_base (e.g. 'Avon')." },
    { section: "Sheet 2: Sub-Models", sheet: "product_models", field: "title", required: "YES", description: "Sub-model line title (e.g. 'High Back', 'Mid Back', '4-Seater Cluster', '3-Drawer Pedestal')." },
    { section: "Sheet 2: Sub-Models", sheet: "product_models", field: "code", required: "NO", description: "Sub-model code prefix (e.g. 'AV-HB', 'AV-MB', 'ZEN-4S')." },

    { section: "Sheet 3: Variants", sheet: "product_variants", field: "base_title", required: "YES", description: "Must match the Master Product 'title' from product_base (e.g. 'Avon')." },
    { section: "Sheet 3: Variants", sheet: "product_variants", field: "model_title", required: "YES", description: "Sub-model line title matching product_models (e.g. 'High Back')." },
    { section: "Sheet 3: Variants", sheet: "product_variants", field: "sku", required: "YES", description: "Unique Item SKU Code (e.g. 'AV-HB-TAN-BROWN', 'ZEN-4S-WALNUT')." },
    { section: "Sheet 3: Variants", sheet: "product_variants", field: "title", required: "YES", description: "Full canonical product title (e.g. 'Avon High Back Premium Chair - Tan Brown')." },
    { section: "Sheet 3: Variants", sheet: "product_variants", field: "cost_price", required: "YES", description: "Base cost price in AED (e.g. 200.00). Segment prices auto-calculate based on margins." },
    { section: "Sheet 3: Variants", sheet: "product_variants", field: "stock", required: "YES", description: "Initial stock quantity (e.g. 15)." },
    { section: "Sheet 3: Variants", sheet: "product_variants", field: "color", required: "NO", description: "Color option name (e.g. 'Tan Brown', 'Cream', 'Black', 'Walnut')." },
    { section: "Sheet 3: Variants", sheet: "product_variants", field: "finish_material", required: "NO", description: "Upholstery or frame finish (e.g. 'PU Leather', 'Mesh', 'Powder-coated Steel')." },
    { section: "Sheet 3: Variants", sheet: "product_variants", field: "dimensions", required: "NO", description: "Product dimensions (e.g. 'W63 x D62 x H123-134 cm')." },
    { section: "Sheet 3: Variants", sheet: "product_variants", field: "specifications", required: "NO", description: "Key technical features & mechanism details." },
    { section: "Sheet 3: Variants", sheet: "product_variants", field: "cover_image", required: "NO", description: "Image filename or upload path (e.g. 'uploads/products/avon-tan.jpg')." },
  ];

  guideSheet.addRows(guideRows);

  // Style Header Row for Guide
  guideSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFF" } };
  guideSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "1E293B" }, // Slate 800
  };

  // 2. SHEET: product_base
  const baseSheet = workbook.addWorksheet("product_base", {
    views: [{ showGridLines: true }],
  });

  baseSheet.columns = [
    { header: "title", key: "title", width: 25 },
    { header: "category", key: "category", width: 20 },
    { header: "description", key: "description", width: 45 },
    { header: "warranty", key: "warranty", width: 15 },
    { header: "sort_order", key: "sort_order", width: 12 },
    { header: "status", key: "status", width: 12 },
  ];

  baseSheet.addRows([
    {
      title: "Avon",
      category: "Chairs",
      description: "Avon High & Mid Back Executive Seating Range",
      warranty: "3 Years",
      sort_order: 1,
      status: "ACTIVE",
    },
    {
      title: "Monarch",
      category: "Chairs",
      description: "Monarch Premium Executive Office Chair Series",
      warranty: "3 Years",
      sort_order: 2,
      status: "ACTIVE",
    },
    {
      title: "Zenith Workstation",
      category: "Workstations",
      description: "Zenith Modular Workstation System with Integrated Cable Management",
      warranty: "5 Years",
      sort_order: 3,
      status: "ACTIVE",
    },
    {
      title: "Kube Storage",
      category: "Storages",
      description: "Kube Lockable Mobile Pedestal and Storage Solution",
      warranty: "5 Years",
      sort_order: 4,
      status: "ACTIVE",
    },
  ]);

  baseSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFF" } };
  baseSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "0F766E" }, // Teal 700
  };

  // 3. SHEET: product_models
  const modelsSheet = workbook.addWorksheet("product_models", {
    views: [{ showGridLines: true }],
  });

  modelsSheet.columns = [
    { header: "base_title", key: "base_title", width: 25 },
    { header: "title", key: "title", width: 25 },
    { header: "code", key: "code", width: 15 },
    { header: "sort_order", key: "sort_order", width: 12 },
    { header: "status", key: "status", width: 12 },
  ];

  modelsSheet.addRows([
    { base_title: "Avon", title: "High Back", code: "AV-HB", sort_order: 1, status: "ACTIVE" },
    { base_title: "Avon", title: "Mid Back", code: "AV-MB", sort_order: 2, status: "ACTIVE" },
    { base_title: "Avon", title: "Low Back", code: "AV-LB", sort_order: 3, status: "ACTIVE" },
    { base_title: "Monarch", title: "High Back", code: "MON-HB", sort_order: 1, status: "ACTIVE" },
    { base_title: "Zenith Workstation", title: "4-Seater Cluster", code: "ZEN-4S", sort_order: 1, status: "ACTIVE" },
    { base_title: "Zenith Workstation", title: "Linear 2-Seater", code: "ZEN-2S", sort_order: 2, status: "ACTIVE" },
    { base_title: "Kube Storage", title: "3-Drawer Pedestal", code: "KUB-3D", sort_order: 1, status: "ACTIVE" },
  ]);

  modelsSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFF" } };
  modelsSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "0369A1" }, // Sky 700
  };

  // 4. SHEET: product_variants
  const variantsSheet = workbook.addWorksheet("product_variants", {
    views: [{ showGridLines: true }],
  });

  variantsSheet.columns = [
    { header: "base_title", key: "base_title", width: 22 },
    { header: "model_title", key: "model_title", width: 20 },
    { header: "sku", key: "sku", width: 22 },
    { header: "title", key: "title", width: 42 },
    { header: "price without vat", key: "price_without_vat", width: 18 },
    { header: "stock", key: "stock", width: 12 },
    { header: "color", key: "color", width: 15 },
    { header: "finish_material", key: "finish_material", width: 20 },
    { header: "dimensions", key: "dimensions", width: 28 },
    { header: "specifications", key: "specifications", width: 50 },
    { header: "cover_image", key: "cover_image", width: 35 },
  ];

  variantsSheet.addRows([
    {
      base_title: "Avon",
      model_title: "High Back",
      sku: "AV-HB-TAN-BROWN",
      title: "Avon High Back Premium Chair - Tan Brown",
      price_without_vat: 200,
      stock: 15,
      color: "Tan Brown",
      finish_material: "PU Leather",
      dimensions: "W63 x D62 x H123-134 cm",
      specifications: "High Back, Donati multi-functional mechanism, 3-position tilt lock, SGS gas lift, polished aluminium base",
      cover_image: "uploads/products/avon-tan-brown.webp",
    },
    {
      base_title: "Avon",
      model_title: "High Back",
      sku: "AV-HB-CREAM",
      title: "Avon High Back Premium Chair - Cream",
      price_without_vat: 200,
      stock: 12,
      color: "Cream",
      finish_material: "PU Leather",
      dimensions: "W63 x D62 x H123-134 cm",
      specifications: "High Back, Donati multi-functional mechanism, 3-position tilt lock, SGS gas lift, polished aluminium base",
      cover_image: "uploads/products/avon-cream.webp",
    },
    {
      base_title: "Avon",
      model_title: "Mid Back",
      sku: "AV-MB-TAN-BROWN",
      title: "Avon Mid Back Premium Chair - Tan Brown",
      price_without_vat: 180,
      stock: 10,
      color: "Tan Brown",
      finish_material: "PU Leather",
      dimensions: "W63 x D62 x H105-115 cm",
      specifications: "Mid Back, sync mechanism, 3-position tilt lock, chrome gas lift",
      cover_image: "uploads/products/avon-mb-tan.webp",
    },
    {
      base_title: "Monarch",
      model_title: "High Back",
      sku: "MON-HB-DARK-BLUE",
      title: "Monarch High Back Premium Chair - Dark Blue",
      price_without_vat: 220,
      stock: 8,
      color: "Dark Blue",
      finish_material: "Leather Upholstery",
      dimensions: "W65 x D65 x H125-135 cm",
      specifications: "High Back, wire-controlled mechanism, aluminium alloy base",
      cover_image: "uploads/products/monarch-blue.webp",
    },
    {
      base_title: "Zenith Workstation",
      model_title: "4-Seater Cluster",
      sku: "ZEN-4S-WALNUT",
      title: "Zenith 4-Seater Cluster Workstation - Walnut",
      price_without_vat: 1250,
      stock: 5,
      color: "Walnut",
      finish_material: "Laminate Top & Steel Frame",
      dimensions: "W280 x D140 x H75 cm",
      specifications: "4-seater cluster, cable trunking system, powder-coated steel legs, acrylic divider screens",
      cover_image: "uploads/products/zenith-4s-walnut.jpg",
    },
    {
      base_title: "Kube Storage",
      model_title: "3-Drawer Pedestal",
      sku: "KUB-3D-WHITE",
      title: "Kube 3-Drawer Mobile Pedestal - White",
      price_without_vat: 350,
      stock: 20,
      color: "White",
      finish_material: "Powder-coated Steel",
      dimensions: "W40 x D50 x H60 cm",
      specifications: "Central lock system, anti-tilt mechanism, 5 castor wheels including anti-topple wheel",
      cover_image: "uploads/products/kube-3d-white.jpg",
    },
  ]);

  variantsSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFF" } };
  variantsSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "4338CA" }, // Indigo 700
  };

  // Ensure directories exist
  const publicTemplatesDir = path.join(process.cwd(), "public", "templates");
  const publicUploadsDir = path.join(process.cwd(), "public", "uploads");

  if (!fs.existsSync(publicTemplatesDir)) {
    fs.mkdirSync(publicTemplatesDir, { recursive: true });
  }
  if (!fs.existsSync(publicUploadsDir)) {
    fs.mkdirSync(publicUploadsDir, { recursive: true });
  }

  const templateFile1 = path.join(publicTemplatesDir, "bosq_master_product_bulk_import_template.xlsx");
  const templateFile2 = path.join(publicUploadsDir, "bosq_master_product_bulk_import_template.xlsx");

  await workbook.xlsx.writeFile(templateFile1);
  await workbook.xlsx.writeFile(templateFile2);

  console.log("Excel template successfully created at:");
  console.log("1.", templateFile1);
  console.log("2.", templateFile2);
}

generateExcelTemplate().catch(console.error);
