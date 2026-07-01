const fs = require('fs');

const apiFile = 'app/api/notify-order/route.ts';
let content = fs.readFileSync(apiFile, 'utf8').replace(/\r\n/g, '\n');

// Replace the Order ID text box with a clickable link
const searchBlock = `<div style="background: white; border: 1px dashed #ccc; padding: 10px; text-align: center;">
                  <p style="font-size: 24px; font-weight: bold; margin: 0; letter-spacing: 3px; color: #000;">\${order.id}</p>
                </div>`;

// Use the production domain if available from headers, or fallback to their main domain
// Since it's a backend route, it might be safer to hardcode their URL or just use the window origin (but it's a backend).
// "https://marcopoloorientalrugs.com" is their production domain based on the context.
const replacementBlock = `<div style="background: white; border: 1px dashed #ccc; padding: 10px; text-align: center;">
                  <p style="font-size: 24px; font-weight: bold; margin: 0; letter-spacing: 3px; color: #000;">\${order.id}</p>
                </div>
                <div style="text-align: center; margin-top: 20px;">
                  <a href="https://marcopoloorientalrugs.com/?track=\${order.id}" style="display: inline-block; background-color: #8E7453; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; letter-spacing: 2px; border-radius: 4px; text-transform: uppercase;">Track Order Instantly</a>
                </div>`;

if (content.includes(searchBlock) && !content.includes('Track Order Instantly')) {
    // We will use split/join in case there are multiple occurrences (there are two in the file: receipt and track)
    content = content.split(searchBlock).join(replacementBlock);
    fs.writeFileSync(apiFile, content);
    console.log('Patched notify-order route to include direct tracking link');
} else {
    console.log('Target string not found or already patched.');
}
