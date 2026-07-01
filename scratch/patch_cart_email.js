const fs = require('fs');

const file = 'components/public/CartView.tsx';
let content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

const target = `    const order = checkout(customerInfo, paymentDetails, deliveryOption, shipping, tax, totalWeightLbs, appliedPromo || undefined, discount);
    setCreatedOrder(order);
    setCheckoutStep("success");
  };`;

const replacement = `    const order = checkout(customerInfo, paymentDetails, deliveryOption, shipping, tax, totalWeightLbs, appliedPromo || undefined, discount);
    setCreatedOrder(order);
    setCheckoutStep("success");

    // Automatically fire off confirmation email
    fetch('/api/notify-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order, shopProfile, type: 'confirmation' })
    }).catch(console.error);
  };`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content);
    console.log('CartView patched with automated email');
} else {
    console.log('Target not found in CartView');
}
