import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {database} from './helpers/database.mjs';
import * as catalog from '../../lib/auction/catalog.mjs';
function setup(seed={},allowed=true){
 const db=database(seed);const json=(body,init)=>({body,status:init?.status||200});
 const visibility={VISIBILITY_PATH:'auction_visibility/current',PAGE_MODES:['under_construction','coming_soon','open'],auctionVisibility:async()=>{const d=db.read('auction_visibility/current');return {mode:d?.mode||'under_construction',version:d?.version||0};}};
 const route=path=>{const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,Error,Date,URL,Promise,require:n=>n==='next/server'?{NextResponse:{json}}:n.includes('staff-permission')?{requireStaff:async()=>{if(!allowed)throw Error('FORBIDDEN');return {uid:'admin'};}}:n.includes('firebase-admin')?{serverDb:()=>db}:n.includes('auction-errors')?{auctionFailure:()=>json({error:'Forbidden'},{status:403})}:n.includes('visibility')?visibility:catalog});return exports;};
 const control=route('app/api/auction/visibility/route.ts'),publicApi=route('app/api/auction/catalog/route.ts');
 return {db,control,publicApi,post:b=>control.POST(new Request('https://example.test/api/auction/visibility',{method:'POST',body:JSON.stringify(b)}))};
}
test('only authorized staff may change visibility; changes are versioned and retry-safe',async()=>{
 const denied=setup({},false);assert.equal((await denied.post({mode:'open',version:0,requestId:'x'})).status,403);assert.equal(denied.db.keys().length,0);
 const s=setup(),b={mode:'coming_soon',version:0,requestId:'change-1'};
 assert.equal((await s.post(b)).status,200);assert.equal((await s.post(b)).status,200);assert.equal(s.db.read('auction_visibility/current').version,1);
 assert.equal((await s.post({...b,mode:'open'})).status,409);assert.equal((await s.post({...b,requestId:'stale'})).status,409);
 assert.equal((await s.post({mode:'open',version:1,requestId:'change-2'})).status,200);
 assert.equal((await s.post({mode:'under_construction',version:2,requestId:'close'})).status,200);
});
test('closed pages hide all lots including direct ID requests; open publishes only eligible preview lots',async()=>{
 const seed={'showroom_rugs/rug':{availability:'In Stock',name:'Rug',sku:'MP1',images:['https://example.test/rug.jpg']},'auction_lots/chosen':{status:'preview',title:'Chosen rug',reserveCents:10000,snapshot:{rugId:'rug'},createdBy:'private-staff'},'auction_lots/draft':{status:'draft',snapshot:{rugId:'rug'}},'auction_sandbox_lots/test':{status:'sold',mode:'sandbox'}};
 const s=setup(seed),req=id=>new Request('https://example.test/api/auction/catalog'+(id?'?id='+id:''));
 assert.equal((await s.publicApi.GET(req('chosen'))).body.lots.length,0);
 await s.post({mode:'open',version:0,requestId:'open'});
 const open=(await s.publicApi.GET(req())).body;assert.equal(open.lots.length,1);assert.equal(open.lots[0].id,'chosen');assert.equal(open.lots[0].reserveCents,undefined);assert.equal(open.lots[0].createdBy,undefined);assert.equal(open.biddingEnabled,false);
 s.db.change('showroom_rugs/rug',{availability:'Sold'});assert.equal((await s.publicApi.GET(req('chosen'))).body.lots.length,0);
 await s.post({mode:'coming_soon',version:1,requestId:'close'});assert.equal((await s.publicApi.GET(req())).body.status,'coming_soon');assert.equal((await s.publicApi.GET(req('chosen'))).body.lots.length,0);
});
