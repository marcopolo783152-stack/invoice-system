export function calculateServiceProducts(products=[]){
 const rows=products.map(p=>{const quantity=Number(p.quantity),price=Number(p.unitPrice);if(!Number.isInteger(quantity)||quantity<1||quantity>10000||!Number.isFinite(price)||price<0||price>1000000)throw Error('Product quantity or price is invalid.');const amountCents=Math.round(price*100)*quantity,taxCents=p.taxable===false?0:Math.round(amountCents*.06);return {...p,amount:amountCents/100,tax:taxCents/100,total:(amountCents+taxCents)/100};});
 const sum=(key,net=false)=>rows.filter(p=>!net||!p.returned).reduce((n,p)=>n+Math.round(p[key]*100),0)/100;
 return {rows,subtotal:sum('amount'),tax:sum('tax'),total:sum('total'),netSubtotal:sum('amount',true),netTax:sum('tax',true),netTotal:sum('total',true)};
}
