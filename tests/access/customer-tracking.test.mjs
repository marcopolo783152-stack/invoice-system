import test from 'node:test';import assert from 'node:assert/strict';
import {findCustomerOrder,trackingLimit} from '../../lib/server/customer-tracking.mjs';
import {carrierToken,carrierTrackingUrl,safeTracking,shipmentCarrier,shipmentCarrierName} from '../../lib/shipment-tracking.mjs';
function database(){
 const values=new Map([['showroom_orders/MPR-LIVE-abc',{orderNumber:'MP-000015',customerId:'guest-session',customerInfo:{name:'Buyer',email:'buyer@example.com',phone:'private',shippingAddress:'private'},shippingDetails:{carrier:'UPS',trackingNumber:'1Z123456789',labelUrl:'private',transactionId:'private'},status:'Shipped',total:100,cartItems:[],paymentDetails:{secret:'private'}}]]);let queue=Promise.resolve();
 const doc=(c,id)=>({id,path:c+'/'+id,get:async()=>({id,exists:values.has(c+'/'+id),data:()=>values.get(c+'/'+id)})});
 return {
  collection(c){return {doc:id=>doc(c,id),where(field,op,value){return {limit(){return {async get(){return {docs:[...values].filter(([k,v])=>k.startsWith(c+'/')&&v[field]===value).map(([k])=>({id:k.slice(c.length+1),data:()=>values.get(k)}))};}};}};}};},
  runTransaction(fn){const p=queue.then(()=>fn({get:r=>r.get(),set:(r,v)=>values.set(r.path,v)}));queue=p.catch(()=>{});return p;}
 };
}
test('guest can find the existing short number or original receipt ID with exact checkout email',async()=>{
 const db=database();for(const reference of ['mp-000015','MPR-LIVE-abc']){const o=await findCustomerOrder(db,reference,' BUYER@example.com ');assert.equal(o.orderNumber,'MP-000015');assert.equal(o.shippingDetails.carrier,'UPS');assert.equal(o.shippingDetails.trackingNumber,'1Z123456789');assert.equal(o.trackingReadOnly,true);assert.equal(o.customerInfo.phone,undefined);assert.equal(o.customerInfo.shippingAddress,undefined);assert.equal(o.paymentDetails,undefined);assert.equal(o.shippingDetails.labelUrl,undefined);}
});
test('wrong email, partial email, wrong reference and anonymous caller cannot see an order',async()=>{
 const db=database();for(const [r,e,u] of [['MP-000015','other@example.com'],['MP-000015','buyer'],['MP-000099','buyer@example.com'],['MP-000015','',{uid:'guest-session',email_verified:false}]])await assert.rejects(()=>findCustomerOrder(db,r,e,u),e=>[400,404].includes(e.status));
});
test('verified owner or matching verified email can look up a previous guest purchase',async()=>{
 const db=database();assert.equal((await findCustomerOrder(db,'MP-000015','',{uid:'new-account',email:'buyer@example.com',email_verified:true})).status,'Shipped');await assert.rejects(()=>findCustomerOrder(db,'MP-000015','',{uid:'other',email:'other@example.com',email_verified:true}),e=>e.status===404);
});
test('lookup limit is shared, counts concurrent requests and resets next minute',async()=>{
 const db=database(),r=new Request('https://example.test',{headers:{'x-real-ip':'127.0.0.1'}});const results=await Promise.allSettled(Array.from({length:15},()=>trackingLimit(db,r,'lookup',12,1000)));assert.equal(results.filter(r=>r.status==='fulfilled').length,12);assert.equal(results.filter(r=>r.status==='rejected'&&r.reason.status===429).length,3);await trackingLimit(db,r,'lookup',12,61000);
});
test('carrier mapping and official links follow the saved carrier without USPS fallback',()=>{
 assert.equal(carrierToken('DHL Express'),'dhl_express');assert.equal(carrierToken('UPS'),'ups');assert.equal(carrierToken('UPS/../../'),null);
 for(const [carrier,domain] of [['UPS','ups.com'],['USPS','usps.com'],['FedEx','fedex.com'],['DHL Express','dhl.com']]){const url=carrierTrackingUrl(carrier,'TRACK12345');assert.ok(new URL(url).hostname.endsWith(domain));assert.ok(url.includes('TRACK12345'));}assert.equal(carrierTrackingUrl('unknown','123','javascript:alert(1)'),null);assert.equal(carrierTrackingUrl('unknown','123','https://ups.com.evil.test/track'),null);
});
test('carrier response exposes scans and ETA but excludes addresses, metadata and label IDs',()=>{
 const safe=safeTracking({carrier:'ups',tracking_number:'1Z12345',eta:'2026-10-08',address_to:{street:'private'},metadata:'private',transaction:'private',tracking_status:{status:'TRANSIT',status_date:'2026-10-06',location:{city:'Richmond',state:'VA',zip:'private',street:'private'}},tracking_history:[{status:'PRE_TRANSIT'}]});assert.equal(safe.tracking_status.location.city,'Richmond');assert.equal(safe.address_to,undefined);assert.equal(safe.metadata,undefined);assert.equal(safe.tracking_status.location.zip,undefined);assert.equal(safe.tracking_history.length,1);
});

test('distinctive UPS number repairs an old USPS link and carrier display',()=>{const n='1Z1V17X50397684151';assert.equal(shipmentCarrier('USPS',n,'https://tools.usps.com/track'),'ups');assert.equal(shipmentCarrierName('USPS',n),'UPS');assert.equal(new URL(carrierTrackingUrl('USPS',n)).hostname,'www.ups.com');});
test('label service names and known links resolve carriers without guessing ambiguous digits',()=>{assert.equal(shipmentCarrier('UPS Ground','123456789012'),'ups');assert.equal(shipmentCarrier('FedEx Home Delivery','123456789012'),'fedex');assert.equal(shipmentCarrier('', '9400100000000000000000'),'usps');assert.equal(shipmentCarrier('', 'CA000588895US'),'usps');assert.equal(shipmentCarrier('', '123456789012'),null);assert.equal(shipmentCarrier('', '123456789012','https://www.fedex.com/fedextrack'),'fedex');assert.equal(shipmentCarrier('', '123456789012','https://ups.com.evil.test'),null);assert.equal(new URL(carrierTrackingUrl('FedEx','123456789012','https://tools.usps.com/track')).hostname,'www.fedex.com');});
