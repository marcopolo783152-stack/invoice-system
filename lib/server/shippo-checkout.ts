import 'server-only';
import {serverDb} from './firebase-admin';
import {CheckoutError} from './rug-checkout.mjs';
import {packedRug,upsRates} from './shipping-package.mjs';
import {LIVE_ORDERS} from './live-orders.mjs';
import {isRugOnReviewHold} from '../catalog-visibility.mjs';
import {checkoutOriginKnown} from './checkout-region.mjs';

export async function shippingRates(o:any){
  if(o.deliveryOption!=='Delivery'||o.sessionAttemptedAt||!['Awaiting quote','Ready for payment'].includes(o.status))throw new CheckoutError('This order cannot change shipping.',409);
  const a=o.customerInfo.deliveryAddress;
  if(!a)throw new CheckoutError('Start a new checkout and enter your complete delivery address.',409);
  const db=serverDb(),ref=db.collection(LIVE_ORDERS).doc(o.id),cacheRef=ref.collection('private').doc('shipping');
  const cache=(await cacheRef.get()).data();
  if(cache&&cache.expiresAt>Date.now()&&cache.version===o.version)return cache;
  // Bound carrier requests per order, including failed requests.
  await db.runTransaction(async tx=>{const s=(await tx.get(cacheRef)).data();if(s?.requestedAt>Date.now()-30000)throw new CheckoutError('Please wait 30 seconds before refreshing UPS rates.',429);tx.set(cacheRef,{requestedAt:Date.now()});});
  const key=process.env.SHIPPO_API_KEY?.trim().replace(/^ShippoToken /,'');
  if(!key?.startsWith('shippo_live_'))throw new CheckoutError('Live Shippo rates are not configured. Please contact the showroom.',503);
  const rugs=await db.getAll(...o.items.map((i:any)=>db.collection('showroom_rugs').doc(i.id)));
  const parcels=rugs.map((d:any)=>{const r=d.data();if(!r||r.availability!=='In Stock'||r.liveOrderId||isRugOnReviewHold(r)||!checkoutOriginKnown(r))throw new CheckoutError('A rug is unavailable. Refresh your cart.',409);return packedRug(r);});
  const response=await fetch('https://api.goshippo.com/shipments/',{method:'POST',headers:{Authorization:'ShippoToken '+key,'Content-Type':'application/json'},body:JSON.stringify({address_from:{name:'Marco Polo Rugs',street1:'3260 Duke St',city:'Alexandria',state:'VA',zip:'22314',country:'US',phone:'7034610207'},address_to:{...a,name:o.customerInfo.name,phone:o.customerInfo.phone,email:o.customerInfo.email},parcels,async:false}),signal:AbortSignal.timeout(20000),cache:'no-store'});
  if(!response.ok)throw new CheckoutError('UPS could not calculate shipping. Check your address or try again shortly.',503);
  const shipment=await response.json(),rates=upsRates(shipment);
  if(!rates.length)throw new CheckoutError('UPS has no service for this package and address. Choose pickup or contact Marco Polo Rugs.',409);
  const result={rates,shipmentId:shipment.object_id,parcels,version:o.version,expiresAt:Date.now()+15*60000,requestedAt:Date.now()};await cacheRef.set(result);return result;
}
export async function selectShipping(o:any,rateId:string,version:number){
  const db=serverDb(),ref=db.collection(LIVE_ORDERS).doc(o.id);
  return db.runTransaction(async tx=>{
    const [order,quote]=await tx.getAll(ref,ref.collection('private').doc('shipping'));const current=order.data(),q=quote.data();
    if(!current||current.sessionAttemptedAt||!['Awaiting quote','Ready for payment'].includes(current.status)||current.version!==version||q?.version!==version||q.expiresAt<=Date.now())throw new CheckoutError('Shipping rates expired. Refresh the rates and try again.',409);
    const rate=q.rates.find((r:any)=>r.id===rateId);if(!rate)throw new CheckoutError('Choose an available UPS service.',400);
    const shipping=current.freeShipping?0:rate.amount;
    const update={shipping,tax:null,total:null,automaticTax:true,shippingIncluded:true,shippingRateId:rate.id,shippingShipmentId:q.shipmentId,shippingParcels:q.parcels,shippingService:rate.service,shippingCarrierCost:rate.amount,status:'Ready for payment',version:version+1,quoteExpiresAt:q.expiresAt,quoteNote:'UPS '+rate.service+'. Shipping address is fixed for this checkout. Contact us to change it.',taxNote:'Applicable tax and final total are calculated by Stripe before payment.'};
    tx.update(ref,update);return {...current,...update};
  });
}
