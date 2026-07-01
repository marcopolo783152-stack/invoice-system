const fs = require('fs');

const routeFile = 'app/api/notify-order/route.ts';
let content = fs.readFileSync(routeFile, 'utf8').replace(/\r\n/g, '\n');

// Replace order.total with order.total?
content = content.replace(/\$\{order\.total\.toLocaleString\(\)\}/g, '${order.total?.toLocaleString()}');

fs.writeFileSync(routeFile, content);
console.log('notify-order patched to handle missing total');
