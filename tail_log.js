const fs = require('fs');
const lines = fs.readFileSync('C:/Users/MIBZ/.gemini/antigravity-ide/brain/7c56e775-2860-41f1-9cda-4f0e40a9f60d/.system_generated/tasks/task-1533.log', 'utf8').split('\n');
console.log(lines.slice(-100).join('\n'));
