const fs = require('fs');
const content = fs.readFileSync('src/app/(dashboard)/quotations/new/page.tsx', 'utf-8');
const lines = content.split('\n');

const startIndex = 1320 - 1; // 0-indexed
const endIndex = 2079 - 1;

const customDraft = fs.readFileSync('C:/Users/MIBZ/.gemini/antigravity/brain/45896946-413f-44de-bee9-96edc061001d/scratch/layout_rewrite_custom.tsx', 'utf-8');
const standardDraft = fs.readFileSync('C:/Users/MIBZ/.gemini/antigravity/brain/45896946-413f-44de-bee9-96edc061001d/scratch/layout_rewrite_standard.tsx', 'utf-8');

const cleanCustom = customDraft.substring(customDraft.indexOf('`') + 1, customDraft.lastIndexOf('`')).replace(/\r/g, '');
const cleanStandard = standardDraft.substring(standardDraft.indexOf('`') + 1, standardDraft.lastIndexOf('`')).replace(/\r/g, '');

const customLines = cleanCustom.split('\n');
const standardLines = cleanStandard.split('\n');

const newLines = [
  ...lines.slice(0, startIndex),
  ...customLines,
  ...standardLines,
  ...lines.slice(endIndex + 1)
];

fs.writeFileSync('src/app/(dashboard)/quotations/new/page.tsx', newLines.join('\n'));
console.log('Done replacing exactly from 1320 to 2079');
