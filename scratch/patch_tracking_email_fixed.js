const fs = require('fs');

const apiFile = 'app/api/notify-order/route.ts';
let content = fs.readFileSync(apiFile, 'utf8').replace(/\r\n/g, '\n');

// Replace the Order ID text box with a clickable link
const searchBlock = `<div style="background: white; border: 1px dashed #ccc; padding: 10px; text-align: center;">
                <p style="font-size: 24px; font-weight: bold; margin: 0; letter-spacing: 3px; color: #000;">\${order.id}</p>
              </div>`;

const replacementBlock = `<div style="background: white; border: 1px dashed #ccc; padding: 10px; text-align: center;">
                <p style="font-size: 24px; font-weight: bold; margin: 0; letter-spacing: 3px; color: #000;">\${order.id}</p>
              </div>
              <div style="text-align: center; margin-top: 20px;">
                <a href="https://marcopoloorientalrugs.com/?track=\${order.id}" style="display: inline-block; background-color: #8E7453; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; letter-spacing: 2px; border-radius: 4px; text-transform: uppercase;">Track Order Instantly</a>
              </div>`;

if (content.includes(searchBlock)) {
    content = content.split(searchBlock).join(replacementBlock);
    fs.writeFileSync(apiFile, content);
    console.log('Patched notify-order route to include direct tracking link');
} else {
    // try removing indentation
    const altSearchBlock = `<div style="background: white; border: 1px dashed #ccc; padding: 10px; text-align: center;">
                  <p style="font-size: 24px; font-weight: bold; margin: 0; letter-spacing: 3px; color: #000;">\${order.id}</p>
                </div>`;
    const altReplacementBlock = `<div style="background: white; border: 1px dashed #ccc; padding: 10px; text-align: center;">
                  <p style="font-size: 24px; font-weight: bold; margin: 0; letter-spacing: 3px; color: #000;">\${order.id}</p>
                </div>
                <div style="text-align: center; margin-top: 20px;">
                  <a href="https://marcopoloorientalrugs.com/?track=\${order.id}" style="display: inline-block; background-color: #8E7453; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; letter-spacing: 2px; border-radius: 4px; text-transform: uppercase;">Track Order Instantly</a>
                </div>`;
                
    if (content.includes(altSearchBlock)) {
        content = content.split(altSearchBlock).join(altReplacementBlock);
        fs.writeFileSync(apiFile, content);
        console.log('Patched notify-order route (alt indent) to include direct tracking link');
    } else {
        console.log('Target string still not found.');
    }
}
