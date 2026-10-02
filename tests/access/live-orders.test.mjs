import test from 'node:test';
import assert from 'node:assert/strict';
import {createQuote,approveQuote,reservePayment,liveSessionParams,attachSession,settleSession,cancelQuote,fulfillOrder,recordRefund,restockRefund,LIVE_ORDERS,publicOrder} from '../../lib/server/live-orders.mjs';

// Transactional in-memory adapter: serialized commits, staged writes, rollback on failure.
// No Firebase project or Stripe account is contacted by these tests.
function database(seed={}){
  let data=new Map(Object.entries(structuredClone(seed))),queue=Promise.resolve(),sequence=0;
  const ref=path=>({path,id:path.split('/').at(-1),collection:name=>collection(path+'/'+name)});
  const collection=path=>({path,doc:id=>ref(path+'/'+(id||'audit'+(++sequence))),where:(key,op,value)=>({query:true,path,key,value,limit(){return this;}})});
  const snap=(path,map)=>({id:path.split('/').at(-1),exists:map.has(path),data:()=>structuredClone(map.get(path))});
  return {collection,read:path=>structuredClone(data.get(path)),count:path=>[...data.keys()].filter(k=>k.startsWith(path+'/')).length,
    change:(path,fields)=>data.set(path,{...data.get(path),...fields}),
    runTransaction(fn){const run=queue.then(async()=>{
      const next=new Map(structuredClone([...data]));let writing=false;
      const get=async r=>{assert.equal(writing,false,'all reads must precede writes');if(r.query){const docs=[...next.keys()].filter(p=>p.startsWith(r.path+'/')&&!p.slice(r.path.length+1).includes('/')&&next.get(p)[r.key]===r.value).map(p=>snap(p,next));return {docs,size:docs.length};}return snap(r.path,next);};
      const tx={get,getAll:async(...refs)=>Promise.all(refs.map(get)),create(r,value){writing=true;assert.equal(next.has(r.path),false,'create cannot overwrite');next.set(r.path,structuredClone(value));},set(r,value){writing=true;next.set(r.path,structuredClone(value));},update(r,value){writing=true;assert.ok(next.has(r.path),'update needs an existing record');next.set(r.path,{...next.get(r.path),...structuredClone(value)});},delete(r){writing=true;next.delete(r.path);}};
      const result=await fn(tx);data=next;return result;
    });queue=run.catch(()=>{});return run;}
  };
}
const now=1790700000000,attempt='12345678-1234-1234-1234-123456789012';
const rug={name:'Afghan runner',sku:'T123',origin:'Afghanistan',availability:'In Stock',price:100.01,sizeCategory:'Runner',dimensions:"2' x 6'",images:[]};
const body=(deliveryOption='Pickup',extra={})=>({items:[{id:'rug-1',quantity:1}],deliveryOption,customerInfo:{name:'Test Customer',email:'customer@example.com',phone:'7035550100',billingCountry:'US',shippingCountry:'US',billingAddress:'10 Example St, Alexandria, VA 22314',shippingAddress:'3260 Duke St, Alexandria, VA 22314',notes:''},...extra});
const db=()=>database({'showroom_rugs/rug-1':rug});
async function quote(database,mode='Pickup',uid='customer'){return createQuote(database,uid,'customer@example.com',body(mode),attempt,now);}
async function reserved(database){const o=await quote(database);return reservePayment(database,o.id,'customer',o.version,now+1000);}
function session(o,changes={}){return {id:'cs_live_fake',livemode:true,metadata:{purpose:'marcopolo_rug_live',orderId:o.id,version:String(o.version)},client_reference_id:o.id,amount_total:o.total,currency:'usd',status:'complete',payment_status:'paid',payment_intent:'pi_fake',customer_details:{address:{country:'US'}},...changes};}

test('pickup uses server prices, exact cents and free pickup; no inventory mutation on quote',async()=>{
 const d=db(),o=await createQuote(d,'customer','customer@example.com',body('Pickup',{total:1,tax:0}),attempt,now);
 assert.equal(o.subtotal,10001);assert.equal(o.tax,600);assert.equal(o.shipping,0);assert.equal(o.total,10601);assert.equal(o.status,'Ready for payment');assert.equal(d.read('showroom_rugs/rug-1').availability,'In Stock');
});
test('delivery leaves tax, shipping and total unquoted until staff approves',async()=>{
 const d=db(),o=await quote(d,'Delivery');assert.equal(o.total,null);assert.equal(o.tax,null);assert.equal(o.shipping,null);
 await assert.rejects(reservePayment(d,o.id,'customer',1,now+1),/awaiting approval/);
 const a=await approveQuote(d,o.id,'staff',{shipping:4200,tax:0,taxNote:'Reviewed applicable destination tax',quoteNote:'Ground delivery, curbside',version:1},now+2);
 assert.equal(a.total,14201);assert.equal(a.version,2);assert.equal(d.count(LIVE_ORDERS+'/'+o.id+'/audit'),1);
 await assert.rejects(reservePayment(d,o.id,'customer',1,now+3),/quote changed/);
});
test('retries produce one quote, while changed payload cannot reuse an attempt',async()=>{
 const d=db(),results=await Promise.all([quote(d),quote(d)]);assert.equal(results[0].id,results[1].id);assert.equal(d.count(LIVE_ORDERS),1);
 await assert.rejects(createQuote(d,'customer','customer@example.com',body('Delivery'),attempt,now),/cart changed/);
});
test('wrong email, restricted origin, unknown origin, duplicate rug and invalid prices fail closed',async()=>{
 const d=db();await assert.rejects(createQuote(d,'customer','other@example.com',body(),attempt,now),/verified customer account/);
 for(const fields of [{origin:'Iran'},{origin:'pure silk'},{price:NaN},{availability:'Sold'}]){const d=db();d.change('showroom_rugs/rug-1',fields);await assert.rejects(quote(d));assert.equal(d.count(LIVE_ORDERS),0);}
 await assert.rejects(createQuote(d,'customer','customer@example.com',body('Pickup',{items:[{id:'rug-1',quantity:1},{id:'rug-1',quantity:1}]}),attempt,now));
});
test('competing customers cannot reserve the same unique rug',async()=>{
 const d=db(),a=await quote(d,'Pickup','a'),b=await quote(d,'Pickup','b');
 const results=await Promise.allSettled([reservePayment(d,a.id,'a',1,now+1),reservePayment(d,b.id,'b',1,now+1)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(d.read('showroom_rugs/rug-1').availability,'Reserved');
});
test('quote expiry and price changes cannot create a reservation',async()=>{
 const d=db(),o=await quote(d);await assert.rejects(reservePayment(d,o.id,'customer',1,now+86400001),/expired/);
 d.change('showroom_rugs/rug-1',{price:150});await assert.rejects(reservePayment(d,o.id,'customer',1,now+1),/price changed/);assert.equal(d.read('showroom_rugs/rug-1').availability,'In Stock');
});
test('session parameters sum exactly to approved cents and retries reuse expiration',async()=>{
 const d=db(),o=await reserved(d),r=await reservePayment(d,o.id,'customer',1,now+50000);
 assert.equal(o.sessionExpiresAt,r.sessionExpiresAt);const p=liveSessionParams(o,'https://www.marcopolorugs.com');
 assert.equal(p.line_items.reduce((n,i)=>n+i.price_data.unit_amount*i.quantity,0),o.total);assert.equal(p.branding_settings.display_name,'Marco Polo Rugs');assert.equal(p.expires_at,o.sessionExpiresAt);
});
test('payment verification rejects wrong mode, order, currency, amount and session',async()=>{
 const d=db(),o=await reserved(d);await attachSession(d,o.id,session(o));
 for(const change of [{livemode:false},{amount_total:1},{currency:'eur'},{id:'cs_live_wrong'},{client_reference_id:'another'}, {metadata:{purpose:'wrong'}}])await assert.rejects(settleSession(d,o.id,session(o,change),'test',now+2),/does not match/);
 assert.equal(d.read('showroom_rugs/rug-1').availability,'Reserved');
});
test('duplicate and reordered events create one paid order and never undo paid stock',async()=>{
 const d=db(),o=await reserved(d),s=session(o);
 await settleSession(d,o.id,s,'webhook',now+2);await settleSession(d,o.id,s,'retry',now+3);await settleSession(d,o.id,session(o,{status:'expired',payment_status:'unpaid'}),'late',now+4);
 assert.equal(d.count('showroom_orders'),1);assert.equal(d.read('showroom_rugs/rug-1').availability,'Sold');assert.equal(d.read(LIVE_ORDERS+'/'+o.id).paymentStatus,'Paid');
});
test('an open or unpaid session never fulfills; only confirmed expiry releases its own hold',async()=>{
 const d=db(),o=await reserved(d);await settleSession(d,o.id,session(o,{status:'open',payment_status:'unpaid'}),'return',now+2);
 assert.equal(d.count('showroom_orders'),0);assert.equal(d.read('showroom_rugs/rug-1').availability,'Reserved');
 await assert.rejects(cancelQuote(d,o.id,'customer'),/active checkout/);
 await settleSession(d,o.id,session(o,{status:'expired',payment_status:'unpaid'}),'webhook',now+3);assert.equal(d.read('showroom_rugs/rug-1').availability,'In Stock');assert.equal(d.read('showroom_rugs/rug-1').liveOrderId,null);
});
test('foreign billing country or newly restricted stock records payment but blocks fulfillment',async()=>{
 for(const restricted of [false,true]){const d=db(),o=await reserved(d);if(restricted)d.change('showroom_rugs/rug-1',{origin:'Iran'});
 const paid=await settleSession(d,o.id,session(o,restricted?{}:{customer_details:{address:{country:'CA'}}}),'webhook',now+2);
 assert.equal(paid.paymentStatus,'Paid');assert.equal(paid.status,'Paid — review required');assert.equal(d.read('showroom_rugs/rug-1').availability,'On Hold');await assert.rejects(fulfillOrder(d,o.id,'staff',{fulfillment:'Collected'}),/review hold/);}
});
test('one-time promotion is reserved once, released on expiry and consumed only on payment',async()=>{
 const d=database({'showroom_rugs/rug-1':rug,'showroom_rugs/rug-2':{...rug,sku:'T2'},'showroom_promocodes/promo':{code:'ONCE',isActive:true,oneTimeUse:true,discountType:'fixed',discountValue:10}});
 const a=await createQuote(d,'a','customer@example.com',body('Pickup',{promoCode:'ONCE'}),attempt,now);
 const b=await createQuote(d,'b','customer@example.com',body('Pickup',{items:[{id:'rug-2',quantity:1}],promoCode:'ONCE'}),attempt,now);
 const r=await reservePayment(d,a.id,'a',1,now+1);await assert.rejects(reservePayment(d,b.id,'b',1,now+1),/already reserved/);
 await settleSession(d,r.id,session(r,{status:'expired',payment_status:'unpaid'}),'expiry',now+2);
 const next=await reservePayment(d,b.id,'b',1,now+3);await settleSession(d,next.id,session(next),'webhook',now+4);assert.equal(d.read('showroom_promocodes/promo').isActive,false);
});
test('free shipping promise cannot be replaced with a charge during approval',async()=>{
 const d=db();d.change('showroom_rugs/rug-1',{isFreeShipping:true});const o=await quote(d,'Delivery');await assert.rejects(approveQuote(d,o.id,'staff',{version:1,shipping:100,tax:0,taxNote:'Reviewed',quoteNote:'Delivery'},now+1),/free shipping/);
});
test('paid quote is immutable; private internals never appear in customer summaries',async()=>{
 const d=db(),o=await reserved(d);await settleSession(d,o.id,session(o),'webhook',now+2);await assert.rejects(approveQuote(d,o.id,'staff',{version:1,shipping:100,tax:0,taxNote:'Reviewed',quoteNote:'Delivery'}));
 const result=publicOrder({...o,fingerprint:'secret',sessionId:'cs_private',customerId:'private',paymentIntentId:'pi_private'});for(const key of ['fingerprint','sessionId','customerId','paymentIntentId'])assert.equal(key in result,false);
});
test('refunds are monotonic, block fulfillment and require explicit restocking',async()=>{
 const d=db(),o=await reserved(d);await settleSession(d,o.id,session(o),'webhook',now+2);
 const charge={livemode:true,payment_intent:'pi_fake',currency:'usd',amount:o.total,amount_refunded:100};await recordRefund(d,o.id,charge,now+3);
 await assert.rejects(fulfillOrder(d,o.id,'staff',{fulfillment:'Ready for pickup'}),/refund/);await assert.rejects(restockRefund(d,o.id,'staff'),/full Stripe refund/);
 await recordRefund(d,o.id,{...charge,amount_refunded:o.total},now+4);await recordRefund(d,o.id,charge,now+5);assert.equal(d.read(LIVE_ORDERS+'/'+o.id).refundedAmount,o.total);assert.equal(d.read('showroom_rugs/rug-1').availability,'Sold');
 await restockRefund(d,o.id,'staff',now+6);await restockRefund(d,o.id,'staff',now+7);assert.equal(d.read('showroom_rugs/rug-1').availability,'In Stock');
});
test('fulfillment cannot happen before payment or move backwards after completion',async()=>{
 const d=db(),o=await reserved(d);await assert.rejects(fulfillOrder(d,o.id,'staff',{fulfillment:'Collected'}));await settleSession(d,o.id,session(o),'webhook',now+2);await fulfillOrder(d,o.id,'staff',{fulfillment:'Collected'},now+3);await assert.rejects(fulfillOrder(d,o.id,'staff',{fulfillment:'Ready for pickup'}),/backwards/);
});

test('UPS payment accepts only the saved shipping and verified Stripe automatic tax; settlement saves final total',async()=>{
 const d=db(),o=await quote(d,'Delivery');
 d.change('showroom_rugs/rug-1',{shippingPackage:{length:26,width:6,height:6,weight:8}});
 const parcels=[{length:'26',width:'6',height:'6',weight:'8',distance_unit:'in',mass_unit:'lb'}];
 d.change(LIVE_ORDERS+'/'+o.id,{automaticTax:true,shipping:1200,shippingService:'Ground',shippingParcels:parcels,status:'Ready for payment'});
 const r=await reservePayment(d,o.id,'customer',1,now+10),params=liveSessionParams(r,'https://www.marcopolorugs.com');
 assert.equal(params.automatic_tax.enabled,true);assert.equal(params.shipping_options[0].shipping_rate_data.fixed_amount.amount,1200);assert.equal(params.line_items.length,1);
 const s=session(r,{amount_total:11873,automatic_tax:{enabled:true,status:'complete'},total_details:{amount_tax:672,amount_discount:0,amount_shipping:1200}});
 await assert.rejects(settleSession(d,o.id,{...s,total_details:{...s.total_details,amount_shipping:0}},'test',now+20),/does not match/);
 await assert.rejects(settleSession(d,o.id,{...s,automatic_tax:{enabled:true,status:'failed'}},'test',now+20),/does not match/);
 const paid=await settleSession(d,o.id,s,'test',now+30);assert.equal(paid.total,11873);assert.equal(paid.tax,672);assert.equal(d.read('showroom_orders/'+o.id).total,118.73);
});
test('UPS package edits invalidate payment reservation',async()=>{
 const d=db(),o=await quote(d,'Delivery');d.change(LIVE_ORDERS+'/'+o.id,{automaticTax:true,shipping:1200,status:'Ready for payment',shippingParcels:[]});
 d.change('showroom_rugs/rug-1',{shippingPackage:{length:26,width:6,height:6,weight:8}});
 await assert.rejects(reservePayment(d,o.id,'customer',1,now+10),/measurements changed/);assert.equal(d.read('showroom_rugs/rug-1').availability,'In Stock');
});
test('shipping included prices preserve exact total without a separate Stripe shipping charge',async()=>{
 const d=db(),o=await quote(d);const bundled={...o,automaticTax:true,shippingIncluded:true,shipping:1234,shippingService:'Ground'};const p=liveSessionParams(bundled,'https://www.marcopolorugs.com');
 assert.equal(p.line_items.reduce((n,i)=>n+i.price_data.unit_amount,0),o.subtotal-o.discount+1234);assert.equal(p.shipping_options[0].shipping_rate_data.fixed_amount.amount,0);assert.match(p.line_items[0].price_data.product_data.description,/delivery included/);
});

test('embedded checkout stays on page and retries preserve the original UI mode',async()=>{
 const d=db(),o=await quote(d);
 const r=await reservePayment(d,o.id,'customer',o.version,now+10,'embedded');
 const p=liveSessionParams(r,'https://www.marcopolorugs.com');
 assert.equal(p.ui_mode,'embedded_page');assert.equal(p.redirect_on_completion,'never');
 assert.equal(p.success_url,undefined);assert.equal(p.cancel_url,undefined);
 const retry=await reservePayment(d,o.id,'customer',o.version,now+20,'hosted');
 assert.equal(retry.paymentUi,'embedded');
});

test('inclusive sale price needs no shipping quote and weight changes invalidate payment',async()=>{
 const d=db();d.change('showroom_rugs/rug-1',{price:100,weightLbs:10,sizeCategory:'Small'});
 const o=await createQuote(d,'customer','customer@example.com',body('Delivery'),attempt,now,true);
 assert.equal(o.subtotal,12000);assert.equal(o.shipping,0);assert.equal(o.status,'Ready for payment');
 assert.equal(o.automaticTax,true);assert.equal(o.pricingPolicy,'weight-inclusive-v1');
 const r=await reservePayment(d,o.id,'customer',1,now+10,'embedded');
 const p=liveSessionParams(r,'https://www.marcopolorugs.com');
 assert.equal(p.line_items[0].price_data.unit_amount,12000);assert.equal(p.shipping_options[0].shipping_rate_data.fixed_amount.amount,0);
 const changed=db();changed.change('showroom_rugs/rug-1',{price:100,weightLbs:10,sizeCategory:'Small'});
 const q=await createQuote(changed,'customer','customer@example.com',body('Delivery'),attempt,now,true);
 changed.change('showroom_rugs/rug-1',{weightLbs:20});await assert.rejects(reservePayment(changed,q.id,'customer',1,now+10),/price changed/);
});

test('same customer can resume reserved checkout after reopening cart without duplicating it',async()=>{
 const d=db(),o=await reserved(d);
 const resumed=await createQuote(d,'customer','customer@example.com',body(),'87654321-1234-1234-1234-123456789012',now+2000);
 assert.equal(resumed.id,o.id);assert.equal(resumed.status,'Payment pending');assert.equal(d.count(LIVE_ORDERS),1);
 await assert.rejects(createQuote(d,'other','customer@example.com',body(),'87654321-1234-1234-1234-123456789012',now+2000),/reserved/);
 await assert.rejects(createQuote(d,'customer','customer@example.com',body('Delivery'),'87654321-1234-1234-1234-123456789012',now+2000),/reserved/);
});

test('new checkouts allow Stripe dynamic methods while legacy attempts retain their card parameters',async()=>{
 const d=db(),o=await reserved(d);assert.equal(liveSessionParams(o,'https://www.marcopolorugs.com').payment_method_types,undefined);
 assert.deepEqual(liveSessionParams({...o,paymentMethods:undefined},'https://www.marcopolorugs.com').payment_method_types,['card']);
});

test('new checkout requests a Stripe email receipt without changing older saved requests',async()=>{
 const d=db(),o=await reserved(d);
 assert.equal(liveSessionParams({...o,receiptEmail:true},'https://www.marcopolorugs.com').payment_intent_data.receipt_email,'customer@example.com');
 assert.equal(liveSessionParams({...o,receiptEmail:false},'https://www.marcopolorugs.com').payment_intent_data.receipt_email,undefined);
});
test('pending refund cannot restock a rug even if an earlier total appears fully refunded',async()=>{
 const d=db(),o=await reserved(d);await settleSession(d,o.id,session(o),'test',now+2);
 d.change(LIVE_ORDERS+'/'+o.id,{refundedAmount:o.total,refundPending:true});
 await assert.rejects(restockRefund(d,o.id,'staff'),/full Stripe refund/);
 assert.equal(d.read('showroom_rugs/rug-1').availability,'Sold');
});

test('fulfillment updates preserve purchased label metadata',async()=>{
 const d=db(),o=await reserved(d);await settleSession(d,o.id,session(o),'webhook',now+2);
 const label={labelUrl:'https://carrier.example/label',transactionId:'shippo-transaction',cost:'20'};
 d.change('showroom_orders/'+o.id,{shippingDetails:label});
 await fulfillOrder(d,o.id,'staff',{fulfillment:'Collected'},now+3);
 const saved=d.read('showroom_orders/'+o.id).shippingDetails;
 assert.equal(saved.labelUrl,label.labelUrl);assert.equal(saved.transactionId,label.transactionId);assert.equal(saved.cost,'20');
});
