const fs = require('fs');

const cartFile = 'components/public/CartView.tsx';
let content = fs.readFileSync(cartFile, 'utf8').replace(/\r\n/g, '\n');

// 1. Exclude free shipping items from totalWeightLbs
const weightCalcOld = `const totalWeightLbs = cart.reduce((sum, item) => {
    const rugWeight = item.rug.weightLbs || (`;
const weightCalcNew = `const totalWeightLbs = cart.reduce((sum, item) => {
    if (item.rug.isFreeShipping) return sum; // Free shipping items don't add to freight weight
    const rugWeight = item.rug.weightLbs || (`;
    
if (content.includes(weightCalcOld)) {
  content = content.replace(weightCalcOld, weightCalcNew);
}

// 2. Add Free Shipping badge in cart item summary
const cartItemTitleOld = `<h4 className="font-serif text-sm font-light uppercase tracking-wider">{item.rug.name}</h4>`;
const cartItemTitleNew = `<h4 className="font-serif text-sm font-light uppercase tracking-wider flex items-center gap-2">
                            {item.rug.name}
                            {item.rug.isFreeShipping && (
                              <span className="bg-[#8E7453] text-white text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm">Free Ship</span>
                            )}
                          </h4>`;
if (content.includes(cartItemTitleOld)) {
  content = content.replace(cartItemTitleOld, cartItemTitleNew);
}

// 3. Just in case, add it to the other render where cart items are listed (like checkout steps)
const checkoutItemTitleOld = `<h4 className="font-serif text-xs font-bold text-editorial-text">{item.rug.name}</h4>`;
const checkoutItemTitleNew = `<div className="flex items-center justify-between w-full">
                                <h4 className="font-serif text-xs font-bold text-editorial-text">{item.rug.name}</h4>
                                {item.rug.isFreeShipping && (
                                  <span className="bg-[#8E7453] text-white text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm ml-2">Free Ship</span>
                                )}
                              </div>`;
if (content.includes(checkoutItemTitleOld)) {
  content = content.replace(checkoutItemTitleOld, checkoutItemTitleNew);
}

fs.writeFileSync(cartFile, content);
console.log('Patched CartView.tsx successfully');
