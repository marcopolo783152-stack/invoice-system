const fs = require('fs');

const routeFile = 'app/api/notify-order/route.ts';
let content = fs.readFileSync(routeFile, 'utf8').replace(/\r\n/g, '\n');

// Replace both occurrences of the from email logic
const target1 = `from: { email: shopProfile?.email || 'noreply@marcopolorugs.com', name: shopProfile?.name || 'Marco Polo' },`;
const replacement1 = `from: { email: 'marcopolorugs@aol.com', name: shopProfile?.name || 'Marco Polo' },`;

content = content.replace(target1, replacement1);
content = content.replace(target1, replacement1); // There might be two occurrences depending on the previous patch

fs.writeFileSync(routeFile, content);
console.log('notify-order patched to use marcopolorugs@aol.com');
