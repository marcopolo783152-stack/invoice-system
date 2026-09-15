import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path,mocks={},extras={}) {
  const module={exports:{}};
  const js=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(js,{module,exports:module.exports,require:name=>{if(name in mocks)return mocks[name];throw Error('Unexpected dependency '+name);},URL,Request,Response,Buffer,AbortSignal,Set,Date,console,process:{env:{}},...extras},{filename:path});
  return module.exports;
}
const next={NextResponse:class extends Response {static json(value,options){return new Response(JSON.stringify(value),{...options,headers:{'Content-Type':'application/json'}});}}};
test('image proxy rejects local, credential-bearing, non-HTTPS and API URLs without fetching',async()=>{
  let requests=0;
  const route=load('app/api/proxy-image/route.ts',{'next/server':next},{fetch:async()=>{requests++;throw Error('must not fetch');}});
  for(const url of ['http://127.0.0.1/admin','https://localhost/a','https://images.unsplash.com.evil.test/a','https://user:pass@images.unsplash.com/a','https://www.marcopolorugs.com/api/chat','file:///etc/passwd']){
    const result=await route.GET(new Request('https://www.marcopolorugs.com/api/proxy-image?url='+encodeURIComponent(url)));
    assert.equal(result.status,400);
  }
  assert.equal(requests,0);
});
test('image proxy accepts raster image only and disables redirects',async()=>{
  let init;
  const route=load('app/api/proxy-image/route.ts',{'next/server':next},{fetch:async(_,options)=>{init=options;return new Response('pixels',{headers:{'content-type':'image/png'}});}});
  const result=await route.GET(new Request('https://www.marcopolorugs.com/api/proxy-image?url=https://images.unsplash.com/rug'));
  assert.equal(result.status,200);assert.equal(await result.text(),'pixels');assert.equal(init.redirect,'error');assert.equal(result.headers.get('x-content-type-options'),'nosniff');
});
test('image proxy rejects HTML and oversized images',async()=>{
  for(const headers of [{'content-type':'text/html'},{'content-type':'image/png','content-length':String(20*1024*1024)}]){
    const route=load('app/api/proxy-image/route.ts',{'next/server':next},{fetch:async()=>new Response('bad',{headers})});
    const result=await route.GET(new Request('https://www.marcopolorugs.com/api/proxy-image?url=https://images.unsplash.com/rug'));
    assert.ok([400,413].includes(result.status));
  }
});
test('shipping purchase and refund deny unauthenticated callers before provider calls',async()=>{
  for(const path of ['create-label','refund-label']){
    let providerCalls=0;
    const route=load(`app/api/shipping/${path}/route.ts`,{'next/server':next,'node:crypto':{createHash(){}},shippo:{Shippo:class{constructor(){providerCalls++;}}},'@/lib/server/firebase-admin':{serverDb(){throw Error('must not access');}},'@/lib/server/staff-permission':{requireStaff:async()=>{throw Error('SIGN_IN_REQUIRED');}}});
    assert.equal((await route.POST(new Request('https://www.marcopolorugs.com/api/shipping/'+path,{method:'POST',body:'{}'}))).status,403);
    assert.equal(providerCalls,0);
  }
});
test('staff gate rejects disabled, unverified, mismatched and non-owner admin identities',async()=>{
  const policy=load('lib/access-policy.ts');
  for(const [user,role] of [
    [{uid:'a',email:'a@example.com',email_verified:false},{active:true,role:'general_manager',email:'a@example.com'}],
    [{uid:'a',email:'a@example.com',email_verified:true},{active:false,role:'general_manager',email:'a@example.com'}],
    [{uid:'a',email:'a@example.com',email_verified:true},{active:true,role:'general_manager',email:'b@example.com'}],
    [{uid:'a',email:'a@example.com',email_verified:true},{active:true,role:'admin',email:'a@example.com'}]
  ]){
    const auth=load('lib/server/staff-permission.ts',{'server-only':{},'./firebase-admin':{caller:async()=>user,serverDb:()=>({doc:()=>({get:async()=>({data:()=>role})})})},'@/lib/access-policy':policy});
    await assert.rejects(auth.requireStaff(new Request('https://example.com'),'orders'));
  }
});
test('staff gate respects seller section boundaries',async()=>{
  const policy=load('lib/access-policy.ts');
  const auth=load('lib/server/staff-permission.ts',{'server-only':{},'./firebase-admin':{caller:async()=>({uid:'seller',email:'s@example.com',email_verified:true}),serverDb:()=>({doc:()=>({get:async()=>({data:()=>({active:true,role:'seller',email:'s@example.com'})})})})},'@/lib/access-policy':policy});
  assert.equal((await auth.requireStaff(new Request('https://example.com'),'orders')).uid,'seller');
  await assert.rejects(auth.requireStaff(new Request('https://example.com'),'users'));
});
test('shipping returns rates without purchase and blocks a repeated purchase operation',async()=>{
  const crypto=await import('node:crypto');
  const docs=new Map([['showroom_orders/MPR-existing',{status:'Confirmed',customerInfo:{name:'Test',street:'123 Main St',city:'Alexandria',state:'VA',zip:'22314'}}]]);
  const reference=key=>({key,get:async()=>snapshot(key),set:async data=>docs.set(key,data),update:async data=>docs.set(key,{...docs.get(key),...data})});
  const snapshot=key=>({exists:docs.has(key),data:()=>docs.get(key)});
  const db={collection:name=>({doc:id=>reference(name+'/'+id)}),runTransaction:async fn=>fn({getAll:async(...refs)=>refs.map(r=>snapshot(r.key)),create:(ref,data)=>docs.set(ref.key,data)}),batch:()=>{const writes=[];return {update:(ref,data)=>writes.push([ref,data]),commit:async()=>writes.forEach(([ref,data])=>docs.set(ref.key,{...docs.get(ref.key),...data}))};}};
  let purchases=0;
  const route=load('app/api/shipping/create-label/route.ts',{'next/server':next,'node:crypto':crypto,'@/lib/server/staff-permission':{requireStaff:async()=>({uid:'staff'})},'@/lib/server/firebase-admin':{serverDb:()=>db},shippo:{Shippo:class {shipments={create:async()=>({rates:[{objectId:'rate-1',provider:'USPS',currency:'USD',amount:'12.00',servicelevel:{name:'Ground'}}]})};transactions={create:async()=>{purchases++;return {status:'SUCCESS',objectId:'tx-1',trackingNumber:'12345678'};}};}}},{process:{env:{SHIPPO_API_KEY:'test-placeholder'}}});
  const body={orderId:'MPR-existing',dimensions:{length:10,width:4,height:4,weight:3}};
  const call=details=>route.POST(new Request('https://www.marcopolorugs.com/api/shipping/create-label',{method:'POST',body:JSON.stringify(details)}));
  const quote=await call(body);assert.equal(quote.status,200);assert.equal((await quote.json()).rates.length,1);assert.equal(purchases,0);
  const purchase=await call({...body,selectedRate:'rate-1'});assert.equal(purchase.status,200);assert.equal(purchases,1);
  assert.equal(docs.get('showroom_orders/MPR-existing').status,'Preparing for Shipping');
  assert.equal((await call({...body,selectedRate:'rate-1'})).status,409);assert.equal(purchases,1);
});

test('catalog fallback distinguishes unavailable server, missing rug and existing rug',async()=>{
  for(const state of ['unavailable','missing','exists']) {
    const catalog=load('lib/server/catalog.ts',{'server-only':{},react:{cache:fn=>fn},'./firebase-admin':{serverDb:()=>{
      if(state==='unavailable')throw Error('SERVER_NOT_CONFIGURED');
      return {collection:()=>({doc:id=>({get:async()=>({exists:state==='exists',id,data:()=>({name:'Existing rug'})})})})};
    }}},{console:{error(){}}});
    const result=await catalog.catalogRugForPage('rug-1783703539224');
    if(state==='unavailable')assert.equal(result,undefined);
    if(state==='missing')assert.equal(result,null);
    if(state==='exists')assert.equal(result.name,'Existing rug');
    assert.equal(await catalog.catalogRugForPage('../invalid'),null);
  }
});
