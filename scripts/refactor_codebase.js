const fs = require('fs');
const path = require('path');

const directory = path.join(__dirname, '../src');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace pricing fields
  content = content.replace(/\bdirectPrice\b/g, 'projectPrice');
  content = content.replace(/\bonlinePrice\b/g, 'specialPrice');

  // Replace segment hardcoded strings (case sensitive to preserve exact matches)
  content = content.replace(/"Direct"/g, '"Project"');
  content = content.replace(/'Direct'/g, "'Project'");
  content = content.replace(/"Online"/g, '"Special"');
  content = content.replace(/'Online'/g, "'Special'");
  
  // Also fix lowercase variations in roles / settings if any
  content = content.replace(/\bdirectVisible\b/g, 'projectVisible');
  content = content.replace(/\bonlineVisible\b/g, 'specialVisible');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function walk(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      walk(file);
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
        replaceInFile(file);
      }
    }
  });
}

console.log("Starting refactor in src directory...");
walk(directory);
console.log("Refactor Complete!");
