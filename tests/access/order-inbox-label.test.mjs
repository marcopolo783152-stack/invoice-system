import test from 'node:test';
import assert from 'node:assert/strict';
import {unreadOrderCount} from '../../lib/order-inbox.mjs';
import {labelEligibility,labelAddress} from '../../lib/server/order-label.mjs';
import {publicOrder} from '../../lib/server/live-orders.mjs';
const order={status:'Paid',paymentStatus:'Paid',deliveryOption:'Delivery',fulfillment:'Preparing',customerInfo:{name:'Customer',shippingAddress:'12 Duke St, Alexandria, VA 22314'}};
test('confirmed paid orders count until read; completed orders do not',()=>{assert.equal(unreadOrderCount([{status:'Confirmed',needsAttention:true},{status:'Pending Confirmation',needsAttention:true},{status:'Confirmed',needsAttention:false},{status:'Delivered',needsAttention:true}]),2);});
test('labels allow verified paid delivery and reject unpaid, pickup, review, refund and duplicate labels',()=>{assert.doesNotThrow(()=>labelEligibility(order,true));for(const changes of [{paymentStatus:'Unpaid'},{deliveryOption:'Pickup'},{reviewReason:'Review'},{refundPending:true},{refundRequest:{}},{refundedAmount:1},{fulfillment:'Delivered'},{shippingDetails:{transactionId:'label'}},{trackingNumber:'tracking'}])assert.throws(()=>labelEligibility({...order,...changes},true));assert.throws(()=>labelEligibility(undefined,true));});
test('saved structured delivery address wins over legacy address',()=>{assert.equal(labelAddress(order).zip,'22314');const address=labelAddress({...order,customerInfo:{...order.customerInfo,deliveryAddress:{street1:'99 Main St',city:'Richmond',state:'VA',zip:'23220',country:'US'}}});assert.equal(address.street1,'99 Main St');assert.equal(address.zip,'23220');assert.throws(()=>labelAddress({customerInfo:{}}));});
test('customer projection excludes private label and carrier cost; staff can print saved label',()=>{const value={...order,shippingDetails:{labelUrl:'https://carrier.example/label',cost:'20',transactionId:'private'}};assert.equal(publicOrder(value).shippingDetails,undefined);assert.deepEqual(publicOrder(value,true).shippingDetails,value.shippingDetails);});

import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as labels from '../../lib/server/order-label.mjs';
import {CheckoutError} from '../../lib/server/rug-checkout.mjs';
import {LIVE_ORDERS,validOrderId} from '../../lib/server/live-orders.mjs';
const require=createRequire(import.meta.url);
function shippingRoute(){
 const id='MPR-LIVE-'+'a'.repeat(32),values=new Map([[LIVE_ORDERS+'/'+id,structuredClone(order)],['showroom_orders/'+id,{status:'Confirmed'}]]);let purchases=0,queue=Promise.resolve();
 const snap=p=>({exists:values.has(p),data:()=>structuredClone(values.get(p))});
 const ref=path=>({path,get:async()=>snap(path),set:async v=>values.set(path,v),update:async v=>values.set(path,{...values.get(path),...v})});
 const db={collection:p=>({doc:id=>ref(p+'/'+id)}),runTransaction(fn){const run=queue.then(()=>fn({getAll:async(...rs)=>rs.map(r=>snap(r.path)),create:(r,v)=>{assert.equal(values.has(r.path),false);values.set(r.path,v);},set:(r,v)=>values.set(r.path,{...values.get(r.path),...v}),update:(r,v)=>values.set(r.path,{...values.get(r.path),...v})}));queue=run.catch(()=>{});return run;}};
 class Shippo{shipments={create:async()=>({rates:[{objectId:'rate',currency:'USD',amount:'20',provider:'UPS',servicelevel:{name:'Ground'}}]})};transactions={create:async()=>{purchases++;return {status:'SUCCESS',objectId:'transaction',trackingNumber:'tracking',labelUrl:'https://carrier.example/label'};}};}
 const exports={},code=require('typescript').transpileModule(readFileSync(new URL('../../app/api/shipping/create-label/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:require('typescript').ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{exports,URL,Date,Error,Number,JSON,process:{env:{SHIPPO_API_KEY:'shippo_test_mock'}},require(name){if(name==='next/server')return {NextResponse:{json:(v,o)=>Response.json(v,o)}};if(name==='node:crypto')return require(name);if(name==='shippo')return {Shippo};if(name.endsWith('/live-orders.mjs'))return {LIVE_ORDERS,validOrderId};if(name.endsWith('/order-label.mjs'))return labels;if(name.endsWith('/rug-checkout.mjs'))return {CheckoutError};if(name.endsWith('/firebase-admin'))return {serverDb:()=>db};if(name.endsWith('/staff-permission'))return {requireStaff:async(req,scope,action)=>{assert.equal(scope,'orders');assert.equal(action,'write');if(req.headers.get('authorization')!=='Bearer staff')throw Error('Denied');}};throw Error(name);}});
 const request=extra=>new Request('https://shop.example/api/shipping/create-label',{method:'POST',headers:{authorization:'Bearer staff','content-type':'application/json'},body:JSON.stringify({orderId:id,dimensions:{weight:9,length:27,width:6,height:6},...extra})});
 return {api:exports,id,values,request,purchases:()=>purchases};
}
test('Shippo rates and one purchase persist label in live and showroom orders; duplicate purchase cannot charge',async()=>{
 const h=shippingRoute();assert.equal(validOrderId(h.id),true);
 assert.equal((await h.api.POST(h.request({}))).status,200);
 const results=await Promise.all([h.api.POST(h.request({selectedRate:'rate'})),h.api.POST(h.request({selectedRate:'rate'}))]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal(h.purchases(),1);
 assert.equal(h.values.get(LIVE_ORDERS+'/'+h.id).shippingDetails.labelUrl,'https://carrier.example/label');
 assert.equal(h.values.get('showroom_orders/'+h.id).shippingDetails.transactionId,'transaction');
 assert.equal(h.values.get('showroom_orders/'+h.id).status,'Preparing for Shipping');
});
test('Shippo route rejects unauthorized staff and unpaid orders before provider purchase',async()=>{
 const h=shippingRoute();const r=h.request({});r.headers.delete('authorization');assert.equal((await h.api.POST(r)).status,403);
 h.values.get(LIVE_ORDERS+'/'+h.id).paymentStatus='Unpaid';assert.equal((await h.api.POST(h.request({}))).status,409);assert.equal(h.purchases(),0);
});

test('read markers save separately for each staff member without changing the order',async()=>{
 const original={status:'Confirmed',total:120},values=new Map([['showroom_orders/order1',original]]),exports={};
 const db={doc:path=>({path}),runTransaction:async fn=>fn({get:async r=>({exists:values.has(r.path)}),set:(r,v)=>values.set(r.path,v)})};
 const code=require('typescript').transpileModule(readFileSync(new URL('../../app/api/order-inbox/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:require('typescript').ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{exports,URL,Date,Error,JSON,Set,require(name){if(name==='next/server')return {NextResponse:{json:(v,o)=>Response.json(v,o)}};if(name.endsWith('/firebase-admin'))return {serverDb:()=>db};if(name.endsWith('/staff-permission'))return {requireStaff:async(r,scope,action)=>{assert.equal(scope,'orders');assert.equal(action,'read');const uid=r.headers.get('authorization');if(!['staffA','staffB'].includes(uid))throw Error('Denied');return {uid};}};throw Error(name);}});
 const request=(uid,ids=['order1'])=>new Request('https://shop.example/api/order-inbox',{method:'POST',headers:{authorization:uid},body:JSON.stringify({ids})});
 assert.equal((await exports.POST(request('customer'))).status,403);
 assert.equal((await exports.POST(request('staffA'))).status,200);
 assert.ok(values.has('showroom_order_inboxes/staffA/seen/order1'));assert.equal(values.has('showroom_order_inboxes/staffB/seen/order1'),false);
 assert.deepEqual(values.get('showroom_orders/order1'),original);
 assert.equal((await exports.POST(request('staffB',['missing']))).status,409);assert.equal(values.has('showroom_order_inboxes/staffB/seen/missing'),false);
});
