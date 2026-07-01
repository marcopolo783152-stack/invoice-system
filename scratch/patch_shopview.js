const fs = require('fs');

const shopFile = 'components/public/ShopView.tsx';
let content = fs.readFileSync(shopFile, 'utf8').replace(/\r\n/g, '\n');

const priceBlockOld = `<div className="flex items-center gap-2">
                            {rug.originalPrice && rug.originalPrice > rug.price && (
                              <span className="text-xs text-gray-400 line-through">$\${rug.originalPrice.toLocaleString()}</span>
                            )}
                            <span className="font-serif text-sm font-light text-editorial-text">$\${rug.price.toLocaleString()}</span>
                          </div>`;

const priceBlockNew = `<div className="flex items-center gap-2">
                            {rug.originalPrice && rug.originalPrice > rug.price && (
                              <span className="text-xs text-gray-400 line-through">$\${rug.originalPrice.toLocaleString()}</span>
                            )}
                            <span className="font-serif text-sm font-light text-editorial-text">$\${rug.price.toLocaleString()}</span>
                            {rug.isFreeShipping && (
                              <span className="bg-[#8E7453] text-white text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm ml-1">Free Ship</span>
                            )}
                          </div>`;

if (content.includes(priceBlockOld)) {
  content = content.replace(priceBlockOld, priceBlockNew);
  fs.writeFileSync(shopFile, content);
  console.log('Patched ShopView.tsx successfully');
} else {
  console.log('Could not find price block in ShopView');
}
