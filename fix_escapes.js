const fs = require('fs');
let content = fs.readFileSync('src/app/(dashboard)/quotations/new/page.tsx', 'utf-8');

// The replacement logic script had literal backslashes we need to remove
content = content.replace(/\\\`/g, '`');
content = content.replace(/\\\$/g, '$');

fs.writeFileSync('src/app/(dashboard)/quotations/new/page.tsx', content);
console.log('Fixed escaping!');
