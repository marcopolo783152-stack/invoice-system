const fs = require('fs');

const routeFile = 'app/api/notify-order/route.ts';
let content = fs.readFileSync(routeFile, 'utf8').replace(/\r\n/g, '\n');

const target = `    const { order, shopProfile } = await request.json();`;
const replacement = `    const { order, shopProfile, type = 'confirmation' } = await request.json();`;

content = content.replace(target, replacement);

const targetEmail = `            subject: \`Order Confirmation - \${shopProfile?.name || 'Marco Polo'} (\${order.id})\`
          }],
          from: { email: shopProfile?.email || 'noreply@marcopolorugs.com', name: shopProfile?.name || 'Marco Polo' },
          content: [{
            type: 'text/html',
            value: \`
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #8E7453;">Thank you for your order!</h2>
                <p>Dear \${customerInfo.name},</p>
                <p>We have successfully received your order <strong>\${order.id}</strong>. Our curators are currently reviewing the inventory holds.</p>
                <p><strong>Total amount:</strong> $\${order.total.toLocaleString()}</p>
                <p>You can track your order status anytime on our website using your Tracking ID: <strong>\${order.id}</strong></p>
                <br/>
                <p>Warm Regards,</p>
                <p><strong>\${shopProfile?.name || 'Marco Polo'}</strong></p>
              </div>
            \`
          }]`;

const replacementEmail = `            subject: type === 'invoice' 
              ? \`Official Invoice - \${shopProfile?.name || 'Marco Polo'} (\${order.id})\`
              : \`Order Confirmation - \${shopProfile?.name || 'Marco Polo'} (\${order.id})\`
          }],
          from: { email: shopProfile?.email || 'noreply@marcopolorugs.com', name: shopProfile?.name || 'Marco Polo' },
          content: [{
            type: 'text/html',
            value: type === 'invoice' ? \`
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #8E7453;">Official Invoice</h2>
                <p>Dear \${customerInfo.name},</p>
                <p>Your official invoice for order <strong>\${order.id}</strong> is ready for your records.</p>
                <p><strong>Total amount:</strong> $\${order.total.toLocaleString()}</p>
                <p>You can view, print, or download your full PDF receipt anytime by visiting the Tracking page on our website and entering your Tracking ID: <strong>\${order.id}</strong></p>
                <br/>
                <p>Warm Regards,</p>
                <p><strong>\${shopProfile?.name || 'Marco Polo'}</strong></p>
              </div>
            \` : \`
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #8E7453;">Thank you for your order!</h2>
                <p>Dear \${customerInfo.name},</p>
                <p>We have successfully received your order <strong>\${order.id}</strong>. Our curators are currently reviewing the inventory holds.</p>
                <p><strong>Total amount:</strong> $\${order.total.toLocaleString()}</p>
                <p>You can track your order status anytime on our website using your Tracking ID: <strong>\${order.id}</strong></p>
                <br/>
                <p>Warm Regards,</p>
                <p><strong>\${shopProfile?.name || 'Marco Polo'}</strong></p>
              </div>
            \`
          }]`;

content = content.replace(targetEmail, replacementEmail);
fs.writeFileSync(routeFile, content);
console.log('notify-order patched');

const adminFile = 'components/public/AdminDashboard.tsx';
let adminContent = fs.readFileSync(adminFile, 'utf8').replace(/\r\n/g, '\n');

const targetAdminClick = `                            onClick={() => {
                              const subject = encodeURIComponent(\`Invoice for Order \${o.id} - Marco Polo Oriental Rugs\`);
                              const body = encodeURIComponent(\`Dear \${o.customerInfo.name},\\n\\nAttached is your invoice for order \${o.id}.\\n\\nTotal: $\${o.total?.toLocaleString()}\\n\\nThank you for choosing Marco Polo Oriental Rugs.\`);
                              window.open(\`mailto:\${o.customerInfo.email}?subject=\${subject}&body=\${body}\`);
                            }}`;

const replacementAdminClick = `                            onClick={async () => {
                              try {
                                alert('Sending invoice via SendGrid...');
                                const res = await fetch('/api/notify-order', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ order: o, shopProfile, type: 'invoice' })
                                });
                                if (res.ok) alert('Invoice Email Sent Successfully!');
                                else alert('Failed to send email.');
                              } catch(e) {
                                alert('Error sending email.');
                              }
                            }}`;

if (adminContent.includes(targetAdminClick)) {
    adminContent = adminContent.replace(targetAdminClick, replacementAdminClick);
    fs.writeFileSync(adminFile, adminContent);
    console.log('AdminDashboard patched');
} else {
    console.log('Target not found in AdminDashboard');
}
