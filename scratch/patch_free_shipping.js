import * as fs from 'fs';
import * as path from 'path';

// 1. types.ts
const typesFile = 'types.ts';
let typesContent = fs.readFileSync(typesFile, 'utf8');
typesContent = typesContent.replace(
  'discountType: "percentage" | "fixed";',
  'discountType: "percentage" | "fixed" | "free_shipping";'
);
fs.writeFileSync(typesFile, typesContent);

// 2. AdminDashboard.tsx
const adminFile = 'components/public/AdminDashboard.tsx';
let adminContent = fs.readFileSync(adminFile, 'utf8');
adminContent = adminContent.replace(
  '<option value="fixed">Fixed Amount ($)</option>',
  '<option value="fixed">Fixed Amount ($)</option>\n                      <option value="free_shipping">Free Shipping</option>'
);
adminContent = adminContent.replace(
  '{p.discountType === "percentage" ? p.discountValue + "%" : "$" + p.discountValue}',
  '{p.discountType === "free_shipping" ? "Free Shipping" : p.discountType === "percentage" ? p.discountValue + "%" : "$" + p.discountValue}'
);
fs.writeFileSync(adminFile, adminContent);

// 3. CartView.tsx
const cartFile = 'components/public/CartView.tsx';
let cartContent = fs.readFileSync(cartFile, 'utf8');
// Fix discount applied display
cartContent = cartContent.replace(
  '<span>-${discount.toLocaleString()}</span>',
  '<span>{appliedPromo.discountType === "free_shipping" ? "Free Shipping" : `-$${discount.toLocaleString()}`}</span>'
);
// Fix shipping logic
const oldShippingLogic = `let shipping = 0;
    if (deliveryOption === "Delivery") {
      if (totalWeightLbs <= 1.9) {
        shipping = 8;
      } else if (totalWeightLbs >= 2 && totalWeightLbs <= 5) {
        shipping = 16;
      } else {
        shipping = 45; // heavier luxury items
      }
    }`;
const newShippingLogic = `let shipping = 0;
    if (deliveryOption === "Delivery") {
      if (appliedPromo?.discountType === "free_shipping") {
        shipping = 0;
      } else if (totalWeightLbs <= 1.9) {
        shipping = 8;
      } else if (totalWeightLbs >= 2 && totalWeightLbs <= 5) {
        shipping = 16;
      } else {
        shipping = 45; // heavier luxury items
      }
    }`;
cartContent = cartContent.replace(oldShippingLogic, newShippingLogic);

// Fix shipping display
const oldShippingDisplay = `{deliveryOption === "Pickup" ? (
                        <span className="text-green-700 font-sans uppercase text-sm font-semibold">Free Pickup</span>
                      ) : (
                        \`\$\${shipping.toFixed(2)}\`
                      )}`;
const newShippingDisplay = `{deliveryOption === "Pickup" ? (
                        <span className="text-green-700 font-sans uppercase text-sm font-semibold">Free Pickup</span>
                      ) : appliedPromo?.discountType === "free_shipping" ? (
                        <span className="text-green-700 font-sans uppercase text-sm font-semibold">Free Shipping</span>
                      ) : (
                        \`\$\${shipping.toFixed(2)}\`
                      )}`;
cartContent = cartContent.replace(oldShippingDisplay, newShippingDisplay);

fs.writeFileSync(cartFile, cartContent);
console.log("Done");
