const fs = require('fs');
let code = fs.readFileSync('context/StoreContext.tsx', 'utf8');
code = code.replace('setCurrentUser(adminUser);', 'setCurrentUser(adminUser as any);');
fs.writeFileSync('context/StoreContext.tsx', code);
console.log("Fixed TypeScript error");
