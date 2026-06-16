const fs = require('fs');

const file = 'src/app/(dashboard)/quotations/new/page.tsx';
const content = fs.readFileSync(file, 'utf-8');
const lines = content.split('\n');

const startStr = '              {/* Financial Calculation Footer */}';
const endStr = '              </CardFooter>';

const startIdx = lines.findIndex(l => l.includes(startStr));
let endIdx = -1;
for (let i = startIdx; i < lines.length; i++) {
  if (lines[i].includes(endStr)) {
    endIdx = i;
    break;
  }
}

console.log('Start:', startIdx, 'End:', endIdx);
if (startIdx === -1 || endIdx === -1) {
  process.exit(1);
}

const replacement = fs.readFileSync('C:/Users/MIBZ/.gemini/antigravity/brain/45896946-413f-44de-bee9-96edc061001d/scratch/footer_redesign.tsx', 'utf-8');
const repLines = replacement.replace(/\r/g, '').split('\n');

const newLines = [
  ...lines.slice(0, startIdx),
  ...repLines,
  ...lines.slice(endIdx + 1)
];

fs.writeFileSync(file, newLines.join('\n'));
console.log('Replaced footer successfully!');
