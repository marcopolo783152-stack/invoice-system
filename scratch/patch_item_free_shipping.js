import * as fs from 'fs';

// 1. AdminDashboard.tsx
const adminFile = 'components/public/AdminDashboard.tsx';
let adminContent = fs.readFileSync(adminFile, 'utf8');

// Add state
const oldState = 'const [rugWeight, setRugWeight] = useState<number | "">("");';
const newState = 'const [rugWeight, setRugWeight] = useState<number | "">("");\n    const [rugIsFreeShipping, setRugIsFreeShipping] = useState<boolean>(false);';
if (adminContent.includes(oldState) && !adminContent.includes('setRugIsFreeShipping')) {
  adminContent = adminContent.replace(oldState, newState);
}

// Add to handleOpenRugModal
const oldInit = 'setRugWeight(r.weightLbs || 3.5);';
const newInit = 'setRugWeight(r.weightLbs || 3.5);\n        setRugIsFreeShipping(r.isFreeShipping || false);';
if (adminContent.includes(oldInit) && !adminContent.includes('setRugIsFreeShipping(r.isFreeShipping || false)')) {
  adminContent = adminContent.replace(oldInit, newInit);
}

// Add to handleOpenRugModal else
const oldInitElse = 'setRugWeight("");';
const newInitElse = 'setRugWeight("");\n        setRugIsFreeShipping(false);';
if (adminContent.includes(oldInitElse) && !adminContent.includes('setRugIsFreeShipping(false)')) {
  adminContent = adminContent.replace(oldInitElse, newInitElse);
}

// Add to payload
const oldPayload = 'weightLbs: Number(rugWeight) || 3.5,';
const newPayload = 'weightLbs: Number(rugWeight) || 3.5,\n        isFreeShipping: rugIsFreeShipping,';
if (adminContent.includes(oldPayload) && !adminContent.includes('isFreeShipping: rugIsFreeShipping')) {
  adminContent = adminContent.replace(oldPayload, newPayload);
}

// Add to UI
const oldUI = `                  <div className="space-y-1">
                    <label className="block text-neutral-500 font-semibold uppercase">Shipping Weight (lbs)</label>`;
const newUI = `                  <div className="space-y-1">
                    <label className="block text-neutral-500 font-semibold uppercase">Free Shipping</label>
                    <label className="flex items-center gap-2 cursor-pointer pt-2">
                      <input
                        type="checkbox"
                        checked={rugIsFreeShipping}
                        onChange={(e) => setRugIsFreeShipping(e.target.checked)}
                        className="rounded accent-editorial-accent border-gray-300 h-5 w-5"
                      />
                      <span className="text-sm font-bold text-gray-700">Yes, ship for free</span>
                    </label>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-neutral-500 font-semibold uppercase">Shipping Weight (lbs)</label>`;
if (adminContent.includes(oldUI) && !adminContent.includes('setRugIsFreeShipping(e.target.checked)')) {
  adminContent = adminContent.replace(oldUI, newUI);
}

fs.writeFileSync(adminFile, adminContent);

// 2. CartView.tsx
const cartFile = 'components/public/CartView.tsx';
let cartContent = fs.readFileSync(cartFile, 'utf8');

const oldCartShippingLogic = `let shipping = 0;
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
const newCartShippingLogic = `let shipping = 0;
    const hasFreeShippingItem = cart.some(item => item.rug.isFreeShipping);
    if (deliveryOption === "Delivery") {
      if (appliedPromo?.discountType === "free_shipping" || hasFreeShippingItem) {
        shipping = 0;
      } else if (totalWeightLbs <= 1.9) {
        shipping = 8;
      } else if (totalWeightLbs >= 2 && totalWeightLbs <= 5) {
        shipping = 16;
      } else {
        shipping = 45; // heavier luxury items
      }
    }`;
if (cartContent.includes(oldCartShippingLogic) && !cartContent.includes('hasFreeShippingItem')) {
  cartContent = cartContent.replace(oldCartShippingLogic, newCartShippingLogic);
}

const oldCartUI = `) : appliedPromo?.discountType === "free_shipping" ? (
                        <span className="text-green-700 font-sans uppercase text-sm font-semibold">Free Shipping</span>`;
const newCartUI = `) : appliedPromo?.discountType === "free_shipping" || hasFreeShippingItem ? (
                        <span className="text-green-700 font-sans uppercase text-sm font-semibold">Free Shipping</span>`;
if (cartContent.includes(oldCartUI) && !cartContent.includes('|| hasFreeShippingItem')) {
  cartContent = cartContent.replace(oldCartUI, newCartUI);
}

fs.writeFileSync(cartFile, cartContent);

// 3. ShopView.tsx
const shopFile = 'components/public/ShopView.tsx';
let shopContent = fs.readFileSync(shopFile, 'utf8');

const oldShopUI = `{rug.isSpecialSale && (
                            <span className="px-2 py-0.5 bg-[#A68B67] text-xs text-white font-bold uppercase tracking-wider rounded-none shadow-sm flex items-center gap-1">
                              <Sparkles size={10} /> SPECIAL SALE
                            </span>
                          )}`;
const newShopUI = `{rug.isSpecialSale && (
                            <span className="px-2 py-0.5 bg-[#A68B67] text-xs text-white font-bold uppercase tracking-wider rounded-none shadow-sm flex items-center gap-1">
                              <Sparkles size={10} /> SPECIAL SALE
                            </span>
                          )}
                          {rug.isFreeShipping && (
                            <span className="px-2 py-0.5 bg-green-700 text-xs text-white font-bold uppercase tracking-wider rounded-none shadow-sm flex items-center gap-1">
                              FREE SHIPPING
                            </span>
                          )}`;
if (shopContent.includes(oldShopUI) && !shopContent.includes('FREE SHIPPING')) {
  shopContent = shopContent.replace(oldShopUI, newShopUI);
}
fs.writeFileSync(shopFile, shopContent);

// 4. ProductDetail.tsx
const prodFile = 'components/public/ProductDetail.tsx';
let prodContent = fs.readFileSync(prodFile, 'utf8');
const oldProdUI = `<h1 className="text-3xl md:text-5xl font-serif text-editorial-text font-light tracking-tight">{rug.name}</h1>`;
const newProdUI = `<h1 className="text-3xl md:text-5xl font-serif text-editorial-text font-light tracking-tight">{rug.name}</h1>
            {rug.isFreeShipping && (
              <div className="inline-block px-3 py-1 bg-green-700 text-white text-xs font-bold uppercase tracking-widest mt-2">
                Eligible for Free Shipping
              </div>
            )}`;
if (prodContent.includes(oldProdUI) && !prodContent.includes('Eligible for Free Shipping')) {
  prodContent = prodContent.replace(oldProdUI, newProdUI);
}
fs.writeFileSync(prodFile, prodContent);

console.log("Item free shipping patched.");
