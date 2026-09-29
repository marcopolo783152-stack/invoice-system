import {CheckoutError} from './rug-checkout.mjs';
export function packedRug(rug){
  // Owner-confirmed on 2026-09-29 for this exact test SKU only; never infer from flat rug dimensions.
  const p=rug.shippingPackage===undefined && String(rug.sku).trim()==='H.17022' ? {length:26,width:6,height:6,weight:8} : rug.shippingPackage;
  if(!p||!['length','width','height','weight'].every(k=>typeof p[k]==='number'&&Number.isFinite(p[k])&&p[k]>0&&p[k]<=1000))throw new CheckoutError('Packed measurements are missing for SKU '+rug.sku+'. Choose pickup or contact Marco Polo Rugs.',409);
  return {length:String(p.length),width:String(p.width),height:String(p.height),weight:String(p.weight),distance_unit:'in',mass_unit:'lb'};
}
export function upsRates(shipment){
  if(shipment.test!==false)throw new CheckoutError('Live UPS shipping is not configured. Contact Marco Polo Rugs.',503);
  return (shipment.rates||[]).filter(r=>r.provider==='UPS'&&r.currency==='USD'&&r.test===false&&r.object_id&&/^\d+(\.\d{1,2})?$/.test(r.amount)).map(r=>({id:r.object_id,amount:Math.round(Number(r.amount)*100),service:r.servicelevel?.name||'UPS',days:r.estimated_days||null})).filter(r=>Number.isSafeInteger(r.amount)&&r.amount>=0).sort((a,b)=>a.amount-b.amount);
}
