const fs = require('fs');
const content = fs.readFileSync('src/app/(dashboard)/quotations/new/page.tsx', 'utf-8');
const lines = content.split('\n');

const startIndex = lines.indexOf('                        if (isCustom) {');
const endIndexIife = lines.indexOf('                      })()}', startIndex);
const endIndex = endIndexIife - 1;

console.log('Start Index:', startIndex);
console.log('End Index IIFE:', endIndexIife);
console.log('End Index:', endIndex);

if (startIndex === -1 || endIndexIife === -1) {
  console.error("Could not find start or end index! Aborting.");
  process.exit(1);
}

const customDraft = fs.readFileSync('C:/Users/MIBZ/.gemini/antigravity/brain/45896946-413f-44de-bee9-96edc061001d/scratch/layout_rewrite_custom.tsx', 'utf-8');
const standardDraft = fs.readFileSync('C:/Users/MIBZ/.gemini/antigravity/brain/45896946-413f-44de-bee9-96edc061001d/scratch/layout_rewrite_standard.tsx', 'utf-8');

const cleanCustom = customDraft.substring(customDraft.indexOf('`') + 1, customDraft.lastIndexOf('`'));
const cleanStandard = standardDraft.substring(standardDraft.indexOf('`') + 1, standardDraft.lastIndexOf('`'));

// The drafts are strings, but we need to insert them as lines, otherwise line numbers get completely corrupted in our array
const customLines = cleanCustom.split('\n');
const standardLines = cleanStandard.split('\n');

const newLines = [
  ...lines.slice(0, startIndex),
  ...customLines,
  ...standardLines,
  ...lines.slice(endIndex + 1)
];

fs.writeFileSync('src/app/(dashboard)/quotations/new/page.tsx', newLines.join('\n'));
console.log('Done replacing layout safely!');
