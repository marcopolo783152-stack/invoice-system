import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
import {CheckoutError} from '../../lib/server/rug-checkout.mjs';import {carrierToken,safeTracking} from '../../lib/shipment-tracking.mjs';
function route(path,{match=true,key='shippo_live_example',carrier='ups',providerNumber='1Z123456',providerCarrier='ups',testData=false,ups=false,upsFails=false}={}){
 let providerCalls=0,dbCalls=0,upsCalls=0;const exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,URL,Date,Error,Map,Promise,AbortSignal,encodeURIComponent,process:{env:{SHIPPO_API_KEY:key,...(ups?{UPS_CLIENT_ID:'id',UPS_CLIENT_SECRET:'secret'}:{})}},fetch:async(url,opts)=>{providerCalls++;assert.equal(url,'https://api.goshippo.com/tracks/'+carrier+'/1Z123456');assert.equal(opts.cache,'no-store');return {ok:true,json:async()=>({carrier:providerCarrier,tracking_number:providerNumber,test:testData,address_to:{street:'private'},tracking_status:{status:'TRANSIT',location:{city:'Richmond'}}})};},require:n=>n==='next/server'?{NextResponse:{json:(body,opts)=>({body,status:opts?.status||200,headers:opts?.headers})}}:n.includes('firebase-admin')?{serverDb:()=>{dbCalls++;return {collection:()=>({where:()=>({limit:()=>({get:async()=>({docs:match?[{data:()=>({shippingDetails:{carrier:'UPS'}})}]:[]})})})})};},caller:async()=>{throw Error('not signed in');}}:n.includes('customer-tracking')?{trackingLimit:async()=>{},findCustomerOrder:async(db,reference,email)=>{if(email!=='buyer@example.com')throw new CheckoutError('Not found',404);return {orderNumber:reference};}}:n.includes('ups-tracking')?{getUpsTracking:async(number)=>{upsCalls++;assert.equal(number,'1Z123456');if(upsFails)throw Error('UPS outage');return {source:'ups_direct',tracking_status:{status:'TRANSIT',status_details:'RFID Confirmed Pickup'}};}}:n.includes('shipment-tracking')?{carrierToken,safeTracking}:n.includes('rug-checkout')?{CheckoutError}:{}});
 return {...exports,providerCalls:()=>providerCalls,upsCalls:()=>upsCalls,dbCalls:()=>dbCalls};
}
test('guest endpoint accepts reference and email without requiring an account and caches no private lookup',async()=>{
 const r=route('app/api/order-tracking/route.ts');const found=await r.POST(new Request('https://example.test/api/order-tracking',{method:'POST',body:JSON.stringify({reference:'MP-000015',email:'buyer@example.com'})}));assert.equal(found.status,200);assert.equal(found.headers['Cache-Control'],'private, no-store');
 const denied=await r.POST(new Request('https://example.test/api/order-tracking',{method:'POST',body:JSON.stringify({reference:'MP-000015',email:'wrong@example.com'})}));assert.equal(denied.status,404);
});
test('cross-origin lookups and excessive bodies are blocked before reading orders',async()=>{
 const r=route('app/api/order-tracking/route.ts');for(const req of [new Request('https://example.test/api/order-tracking',{method:'POST',headers:{origin:'https://evil.test'},body:'{}'}),new Request('https://example.test/api/order-tracking',{method:'POST',body:'a'.repeat(2100)})])assert.ok([403,413].includes((await r.POST(req)).status));assert.equal(r.dbCalls(),0);
});
test('live shipment endpoint uses UPS for UPS, strips private provider fields and caches repeats',async()=>{
 const r=route('app/api/shipping/track/route.ts'),req=new Request('https://example.test/api/shipping/track?carrier=UPS&trackingNumber=1Z123456');const result=await r.GET(req);assert.equal(result.status,200);assert.equal(result.body.tracking_status.location.city,'Richmond');assert.equal(result.body.address_to,undefined);await r.GET(req);assert.equal(r.providerCalls(),1);
});
test('wrong carrier, missing shipment, test key, test response and mismatched tracking cannot produce a live update',async()=>{
 for(const [params,query,status] of [[{match:false},'UPS',404],[{},'FedEx',404],[{key:'shippo_test_example'},'UPS',503],[{testData:true},'UPS',502],[{providerNumber:'OTHER123'},'UPS',502],[{providerCarrier:'usps'},'UPS',502]]){const r=route('app/api/shipping/track/route.ts',params);assert.equal((await r.GET(new Request('https://example.test/api/shipping/track?carrier='+query+'&trackingNumber=1Z123456'))).status,status);}
 const r=route('app/api/shipping/track/route.ts');assert.equal((await r.GET(new Request('https://example.test/api/shipping/track?carrier=ups%2F..&trackingNumber=1Z123456'))).status,400);assert.equal(r.providerCalls(),0);
});

test('configured UPS is preferred even without a Shippo key, and outages retain the existing feed',async()=>{
 const req=new Request('https://example.test/api/shipping/track?carrier=UPS&trackingNumber=1Z123456');
 const direct=route('app/api/shipping/track/route.ts',{ups:true,key:''});const result=await direct.GET(req);assert.equal(result.status,200);assert.equal(result.body.source,'ups_direct');assert.equal(direct.upsCalls(),1);assert.equal(direct.providerCalls(),0);
 const fallback=route('app/api/shipping/track/route.ts',{ups:true,upsFails:true});assert.equal((await fallback.GET(req)).status,200);assert.equal(fallback.upsCalls(),1);assert.equal(fallback.providerCalls(),1);
 const missing=route('app/api/shipping/track/route.ts',{ups:true,match:false});assert.equal((await missing.GET(req)).status,404);assert.equal(missing.upsCalls(),0);
});
