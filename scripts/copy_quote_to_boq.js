const fs = require('fs');
const path = require('path');

const quoteNewPath = path.join(__dirname, '../src/app/(dashboard)/quotations/new/page.tsx');
const boqNewPath = path.join(__dirname, '../src/app/(dashboard)/boq/new/page.tsx');
const boqEditPath = path.join(__dirname, '../src/app/(dashboard)/boq/[id]/page.tsx');

// Read Quotations New Page
let content = fs.readFileSync(quoteNewPath, 'utf8');

// Basic replacements to switch context from Quotation to BOQ
let boqContent = content.replace(/Quotation/g, 'BOQ');
boqContent = boqContent.replace(/quotation/g, 'boq');
boqContent = boqContent.replace(/NewQuotationForm/g, 'NewBoqForm');
boqContent = boqContent.replace(/\/api\/quotations/g, '/api/boq');

// Write to boq/new
fs.writeFileSync(boqNewPath, boqContent);
console.log('Successfully copied and adapted to boq/new/page.tsx');

// For boq/[id]/page.tsx, we'll use the same base layout but name it EditBoqForm
let boqEditContent = boqContent.replace(/NewBoqForm/g, 'EditBoqForm');
fs.writeFileSync(boqEditPath, boqEditContent);
console.log('Successfully copied and adapted to boq/[id]/page.tsx');
