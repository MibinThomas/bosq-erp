const fs = require('fs');
const path = require('path');

const targetDirs = [
  path.join(__dirname, '../src'),
  path.join(__dirname, '../prisma')
];

const targetFiles = [
  path.join(__dirname, '../README.md')
];

function scanDirectory(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(scanDirectory(fullPath));
    } else {
      if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.md')) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

let allFiles = [];
targetDirs.forEach(dir => {
  allFiles = allFiles.concat(scanDirectory(dir));
});
allFiles = allFiles.concat(targetFiles.filter(f => fs.existsSync(f)));

let updatedCount = 0;

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  content = content.replace(/\"DESIGN_CONSULTANT\"/g, '"INTERIOR_DESIGN_CONSULTANT"');
  content = content.replace(/\'DESIGN_CONSULTANT\'/g, "'INTERIOR_DESIGN_CONSULTANT'");
  content = content.replace(/\| \*\*`DESIGN_CONSULTANT`\*\*/g, '| **`INTERIOR_DESIGN_CONSULTANT`**');
  content = content.replace(/name: "DESIGN_CONSULTANT"/g, 'name: "INTERIOR_DESIGN_CONSULTANT"');
  
  content = content.replace(/(?<!Interior )Design Consultant/gi, match => {
    return 'Interior ' + match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated: ${file}`);
    updatedCount++;
  }
});

console.log(`\nSuccess! Updated ${updatedCount} files.`);
