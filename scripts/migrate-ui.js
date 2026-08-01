const fs = require('fs');

const settingsPath = 'd:\\MIBIN\\bosq-erp\\src\\app\\(dashboard)\\settings\\page.tsx';
const accessControlPath = 'd:\\MIBIN\\bosq-erp\\src\\app\\(dashboard)\\settings\\access-control\\page.tsx';

let settingsCode = fs.readFileSync(settingsPath, 'utf8');

// 1. Remove Users from TabsList
settingsCode = settingsCode.replace(
  /<TabsTrigger value="users".*?>[\s\S]*?<\/TabsTrigger>/,
  ''
);

// 2. Remove TabsContent value="users"
const tabStartStr = '{/* Tab 2: Users Management Console */}';
const tabEndStr = '{/* Tab 3: Default Terms & Conditions */}';

if (settingsCode.includes(tabStartStr) && settingsCode.includes(tabEndStr)) {
  const startIdx = settingsCode.indexOf(tabStartStr);
  const endIdx = settingsCode.indexOf(tabEndStr);
  settingsCode = settingsCode.slice(0, startIdx) + settingsCode.slice(endIdx);
}

// 3. Remove Add User Modal
const addModalStart = '{/* Add User Modal */}';
const editModalStart = '{/* Edit User Modal */}';
const addPaymentModalStart = '{/* Add Payment Term Modal */}';

if (settingsCode.includes(addModalStart) && settingsCode.includes(editModalStart)) {
  const startIdx = settingsCode.indexOf(addModalStart);
  const endIdx = settingsCode.indexOf(addPaymentModalStart);
  
  // Extract Modals for injection
  const modalsCode = settingsCode.slice(startIdx, endIdx);
  
  settingsCode = settingsCode.slice(0, startIdx) + settingsCode.slice(endIdx);
  
  // Now we have the modals. We need to inject them into accessControlPath
  let acCode = fs.readFileSync(accessControlPath, 'utf8');
  
  // Inject before the last closing div/main tag
  // The structure is usually </div> at the end.
  const injectIdx = acCode.lastIndexOf('</div>');
  acCode = acCode.slice(0, injectIdx) + '\n' + modalsCode + '\n' + acCode.slice(injectIdx);
  
  fs.writeFileSync(accessControlPath, acCode);
}

fs.writeFileSync(settingsPath, settingsCode);
console.log("Migration script ran successfully.");
