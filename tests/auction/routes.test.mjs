import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import ts from 'typescript';
import * as engine from '../../lib/auction/engine.mjs';
function setup(allowed=true){
 const records=new Map();let queue=Promise.resolve();
 const snapshot=path=>({exists:records.has(path),data:()=>records.get(path),id:path.split('/').at(-1)});
 const ref=path=>({path,get:async()=>snapshot(path),collection:name=>collection(path+'/'+name)});
 const collection=path=>({path,doc:id=>ref(path+'/'+id),get:async()=>({docs:[...records.keys()].filter(k=>k.startsWith(path+'/')&&k.slice(path.length+1).indexOf('/')<0).map(k=>snapshot(k))})});
 const db={doc:ref,collection,runTransaction:fn=>{const next=queue.then(async()=>{const writes=[];const result=await fn({get:async r=>r.get(),create:(r,v)=>{if(records.has(r.path))throw Error('exists');writes.push([r.path,v]);},set:(r,v)=>writes.push([r.path,v]),update:(r,v)=>writes.push([r.path,{...records.get(r.path),...v}])});for(const [p,v]of writes)records.set(p,v);return result;});queue=next.catch(()=>{});return next;}};
 const output={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/auction/sandbox/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:output,Error,console:{error:()=>{}},Date,require:name=>name==='next/server'?{NextResponse:{json:(body,init)=>({body,status:init?.status||200})}}:name==='crypto'?crypto:name.includes('staff-permission')?{requireStaff:async()=>{if(!allowed)throw Error('FORBIDDEN');return {uid:'staff'};}}:name.includes('firebase-admin')?{serverDb:()=>db}:engine});
 const post=body=>output.POST(new Request('https://example.test/api/auction/sandbox',{method:'POST',body:JSON.stringify(body)}));
 return {records,post};
}
const requestId=()=>crypto.randomUUID();
const fixture=()=>({...engine.validateLot({title:'Rug test',condition:'Worn fringes described.',startAt:Date.now()-60000,endAt:Date.now()+600000,startingCents:5000},Date.now()),status:'scheduled'});
test('unauthorized staff cannot create auction records',async()=>{const {records,post}=setup(false);assert.equal((await post({action:'create'})).status,403);assert.equal(records.size,0);});
test('concurrent bids preserve both bidders, resolve leader, and retain activity',async()=>{const {records,post}=setup();records.set('auction_sandbox_lots/lot',fixture());const bid=(bidderId,maximumCents)=>({action:'bid',id:'lot',requestId:requestId(),bidderId,maximumCents,delivery:{method:'pickup_self'}});const a=bid('test-a',50000),b=bid('test-b',10000);const results=await Promise.all([post(a),post(b)]);assert.ok(results.every(r=>r.status===200));assert.equal(records.get('auction_sandbox_lots/lot').bidCount,2);assert.equal(records.get('auction_sandbox_lots/lot').leaderId,'test-a');assert.equal(records.get('auction_sandbox_lots/lot').currentCents,11000);assert.equal((await post(a)).status,200);assert.equal(records.get('auction_sandbox_lots/lot').bidCount,2);assert.equal((await post({...a,maximumCents:60000})).status,400);assert.ok([...records.keys()].every(p=>p.startsWith('auction_sandbox_lots/')));});
test('failed payment cannot fulfill a winning lot; successful simulation can',async()=>{const {records,post}=setup();records.set('auction_sandbox_lots/lot',{...fixture(),status:'sold',paymentStatus:'unpaid',fulfillmentStatus:'not_ready'});const act=action=>post({action,id:'lot',requestId:requestId(),reference:'Test pickup by bidder A'});assert.equal((await act('payment_failed')).status,200);assert.equal((await act('fulfill')).status,400);assert.equal((await act('payment_paid')).status,200);assert.equal((await act('fulfill')).status,200);assert.equal(records.get('auction_sandbox_lots/lot').fulfillmentStatus,'complete');});
test('draft creation copies inventory without changing it and rejects duplicate operation changes',async()=>{const {records,post}=setup();const rug={name:'Original rug',images:[],price:500};records.set('showroom_rugs/rug',rug);const body={action:'create',requestId:requestId(),rugId:'rug',title:'Test auction',condition:'Good with fringe wear.',startAt:Date.now(),endAt:Date.now()+600000,startingCents:5000};assert.equal((await post(body)).status,200);assert.equal((await post(body)).status,200);assert.equal((await post({...body,title:'Changed'})).status,400);assert.deepEqual(records.get('showroom_rugs/rug'),rug);});
test('public bid endpoint stays closed without accessing auth or payments',async()=>{
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/auction/bid/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:name=>{assert.equal(name,'next/server');return {NextResponse:{json:(body,init)=>({body,status:init.status})}};}});
 assert.equal((await exports.POST()).status,423);
});
test('profile API stores only allowed fields and uses authenticated email',async()=>{
 const writes=[];const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/auction/profile/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,Error,Date,require:name=>name==='next/server'?{NextResponse:{json:(body,init)=>({body,status:init?.status||200})}}:name.includes('firebase-admin')?{caller:async()=>({uid:'customer',email:'actual@example.test',firebase:{sign_in_provider:'password'}}),serverAuth:()=>({getUser:async()=>({uid:'customer',email:'actual@example.test'})}),serverDb:()=>({doc:path=>({set:async value=>writes.push({path,value})})})}:engine});
 const input={firstName:'A',lastName:'B',phone:'+17035551234',address1:'123 Main St',city:'Alexandria',region:'VA',postalCode:'22314',country:'US',email:'forged@example.test',paymentVerified:true,phoneVerified:true,acceptedPolicyVersion:engine.POLICY_VERSION};
 assert.equal((await exports.POST(new Request('https://example.test',{method:'POST',body:JSON.stringify(input)}))).status,200);
 assert.equal(writes[0].path,'auction_profiles/customer');assert.equal(writes[0].value.email,'actual@example.test');assert.equal(writes[0].value.paymentVerified,undefined);assert.equal(writes[0].value.phoneVerified,undefined);assert.equal(writes[0].value.acceptedPolicyVersion,undefined);
});
