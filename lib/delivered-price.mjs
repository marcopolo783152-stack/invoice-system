import {dimensions} from './rug-discovery.mjs';
export function deliveryRate(rug){
 const category=String(rug.sizeCategory||'').toLowerCase();
 if(/extra large|oversiz|palace/.test(category))return 4.5;
 if(/large/.test(category))return 3.5;
 if(/medium/.test(category))return 3;
 if(/small|runner/.test(category))return 2;
 const d=dimensions(rug);
 if(!d)return null;
 return d[0]>=9.5||d[1]>=13.5?4.5:d[0]>=7?3.5:d[0]>=4.5?3:2;
}
export function deliveredCents(rug){
 const weight=/\bmushwani\b/i.test([rug.name,rug.type,rug.category,rug.collection].join(' '))?9:Number(rug.weightLbs);
 const rate=deliveryRate(rug);
 if(rate===null||!Number.isFinite(weight)||weight<=0||!Number.isFinite(rug.price)||rug.price<=0)return null;
 return Math.round(rug.price*100)+Math.round(weight*rate*100);
}
export const salePrice=rug=>{const cents=deliveredCents(rug);return cents===null?rug.price:cents/100;};

export const saleLabel=rug=>{const cents=deliveredCents(rug);return cents===null?'Contact for delivered price':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);};
