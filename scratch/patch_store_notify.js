const fs = require('fs');

const storeFile = 'context/StoreContext.tsx';
let content = fs.readFileSync(storeFile, 'utf8').replace(/\r\n/g, '\n');

const target = `    // Add new order to Firebase
    addShowroomDoc(SHOWROOM_ORDERS, newOrder);`;

const replacement = `    // Add new order to Firebase
    addShowroomDoc(SHOWROOM_ORDERS, newOrder);
    
    // Trigger Email/SMS notifications automatically
    fetch('/api/notify-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: newOrder, shopProfile })
    }).catch(err => console.error('Notification trigger failed:', err));`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(storeFile, content);
    console.log('StoreContext patched successfully');
} else {
    console.log('Target not found in StoreContext');
}
