import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';import crypto from 'node:crypto';import * as catalog from '../../lib/auction/catalog.mjs';import * as engine from '../../lib/auction/engine.mjs';
function setup(){
 const records=new Map();let queue=Promise.resolve();
 const ref=path=>({path,id:path.split('/').at(-1),collection:name=>collection(path+'/'+name)});const collection=path=>({doc:id=>ref(path+'/'+id)});
 const db={doc:ref,collection,runTransaction:fn=>{const work=queue.then(async()=>{const writes=[];await fn({get:async r=>({exists:records.has(r.path),id:r.id,data:()=>records.get(r.path)}),set:(r,v)=>writes.push([r.path,{...records.get(r.path),...v}]),create:(r,v)=>{assert.ok(!records.has(r.path));writes.push([r.path,v]);}});for(const [p,v]of writes)records.set(p,v);});queue=work.catch(()=>{});return work;}};
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/auction/manage/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,Error,Date,console,require:name=>name==='next/server'?{NextResponse:{json:(body,init)=>({body,status:init?.status||200})}}:name==='crypto'?crypto:name.includes('staff-permission')?{requireStaff:async()=>({uid:'owner'})}:name.includes('firebase-admin')?{serverDb:()=>db}:name.includes('auction-errors')?{auctionFailure:()=>({status:503})}:name.includes('catalog.mjs')?catalog:engine});
 const post=body=>exports.POST(new Request('https://example.test',{method:'POST',body:JSON.stringify(body)}));return {records,post};
}
const operation=()=>crypto.randomUUID();
const rug={name:'Afghan rug',origin:'Afghanistan',availability:'In Stock',images:['https://example.test/rug.jpg']};
const draft=()=>({action:'create',requestId:operation(),rugId:'rug1',title:'Afghan rug',eventTitle:'Autumn rugs',condition:'Good condition with some wear.',startingCents:10000});
test('draft publication is explicit, records are preserved and stale edits fail',async()=>{
 const {post,records}=setup();records.set('showroom_rugs/rug1',rug);const input=draft();assert.equal((await post(input)).status,200);assert.equal(records.get('auction_lots/'+input.requestId).status,'draft');
 const publish={action:'publish',requestId:operation(),id:input.requestId,version:1};assert.equal((await post(publish)).status,200);assert.equal((await post(publish)).status,200);assert.equal(records.get('auction_lots/'+input.requestId).version,2);
 assert.equal((await post({...input,action:'edit',id:input.requestId,requestId:operation(),version:1})).status,400);assert.deepEqual(records.get('showroom_rugs/rug1'),rug);
});
test('publishing rejects an inventory rug sold after draft creation',async()=>{
 const {post,records}=setup();records.set('showroom_rugs/rug1',rug);const input=draft();await post(input);records.set('showroom_rugs/rug1',{...rug,availability:'Sold'});assert.equal((await post({action:'publish',requestId:operation(),id:input.requestId,version:1})).status,400);assert.equal(records.get('auction_lots/'+input.requestId).status,'draft');
});
