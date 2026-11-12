import test from 'node:test';import assert from 'node:assert/strict';
import {rugArea,weightFor,weightPatch,matchesBatch,batchOptions} from '../../lib/inventory/weight.mjs';
import {inventoryChange,bulkInput,validateProfiles,previewInventoryBatch,applyInventoryBatch} from '../../lib/server/inventory-bulk.mjs';
import {isRugOnReviewHold} from '../../lib/catalog-visibility.mjs';
import {deliveredCents} from '../../lib/delivered-price.mjs';
const rug={id:'rug1',name:'Blue rug',sku:'M.001',dimensions:'8 x 10',shape:'Rectangular',manufacturingType:'Machine-made',origin:'Turkey',material:'Synthetic',condition:'Very Good',images:['https://test.test/rug.jpg'],availability:'In Stock',price:100,weightLbs:10};
test('per-square-foot weights use exact feet/inches and correct shape area',()=>{
 for(const [dimensions,expected] of [['8 x 10',40],['2 x 3',3],['5 x 7',17.5],[`8'6" x 10'`,42.5]])assert.equal(weightFor({...rug,dimensions,weightMode:'sqft',weightPerSqft:.5}),expected);
 assert.ok(Math.abs(rugArea({...rug,dimensions:'6 ft Round',shape:'Round'})-9*Math.PI)<1e-8);
 for(const dimensions of ['',`8'15" x 10'`,'bad','0 x 10'])assert.equal(weightFor({...rug,dimensions,weightMode:'sqft',weightPerSqft:.5}),null);
 assert.equal(weightFor({...rug,weightMode:'sqft',weightPerSqft:-1}),null);
});
test('manual overrides and packed weight stay independent; defaults apply to new rugs',()=>{
 assert.equal(weightFor({...rug,weightMode:'manual',shippingPackage:{weight:20}}, {'Machine-made':.5}),10);
 assert.equal(weightFor({...rug,weightLbs:undefined},{'Machine-made':.5}),40);
 const changed={...rug,...weightPatch({...rug,weightMode:'sqft',weightPerSqft:.5}),shippingPackage:{length:30,width:8,height:8,weight:45}};
 assert.equal(changed.weightLbs,40);assert.equal(changed.shippingPackage.weight,45);assert.equal(weightFor({...changed,dimensions:'2 x 3'}),3);
 assert.equal(deliveredCents({...changed,sizeCategory:'Large'}),24000);
});
test('bulk prices round in cents and discounts never stack; invalid inputs fail',()=>{
 assert.deepEqual(inventoryChange(rug,'discount',{value:10}),{price:90,originalPrice:100});assert.equal(inventoryChange({...rug,price:90,originalPrice:100},'discount',{value:10}).price,90);
 assert.equal(inventoryChange(rug,'price',{value:123.45}).price,123.45);
 for(const value of ['',-1,Infinity,'bad'])assert.throws(()=>inventoryChange(rug,'price',{value}));
 assert.throws(()=>bulkInput({operation:'price',ids:['a','a']}));assert.throws(()=>bulkInput({operation:'price',ids:['../x']}));assert.throws(()=>bulkInput({operation:'price',ids:Array(101).fill('a')}));
});
test('checkout and auction links are protected; manual weights require explicit replacement',()=>{
 for(const field of ['liveOrderId','auctionLotId'])for(const operation of ['price','availability','publish','weight_sqft'])assert.throws(()=>inventoryChange({...rug,[field]:'link'},operation,{value:1}));
 assert.throws(()=>inventoryChange(rug,'weight_sqft',{value:.5}),/Manual weight/);assert.equal(inventoryChange(rug,'weight_sqft',{value:.5,replaceManual:true}).weightLbs,40);
});
test('unpublication hides public listings without bypassing existing review holds',()=>{
 assert.equal(isRugOnReviewHold({...rug,published:false}),true);assert.equal(isRugOnReviewHold({...rug,published:true}),false);assert.equal(isRugOnReviewHold({...rug,published:true,origin:'Iran'}),true);
 assert.deepEqual(inventoryChange(rug,'unpublish'),{published:false});assert.throws(()=>inventoryChange({...rug,published:false},'auction',{value:1}));
});
test('batch filters retain known timestamps and do not invent old dates',()=>{
 const uploaded={...rug,uploadBatchId:'u1',uploadedAt:'2026-10-24',uploadBatchLabel:'Collection',publishBatchId:'p1',publishedAt:'2026-10-25'};
 assert.equal(matchesBatch(uploaded,'upload:u1'),true);assert.equal(matchesBatch(uploaded,'publish:p1'),true);assert.equal(matchesBatch(uploaded,'legacy'),false);assert.equal(matchesBatch(rug,'legacy'),true);assert.equal(batchOptions([uploaded],'upload')[0].label,'Collection');
 assert.deepEqual(validateProfiles({'Machine-made':.5,Handmade:''}),{'Machine-made':.5});assert.throws(()=>validateProfiles({'Machine-made':-1}));
});
function database(){let clock=1;const docs=new Map([['showroom_rugs/rug1',{data:structuredClone(rug),v:clock}],['showroom_rugs/rug2',{data:{...rug,id:'rug2',sku:'M.002'},v:clock}]]);const ref=path=>({path,id:path.split('/').at(-1)});const snap=r=>({id:r.id,exists:docs.has(r.path),data:()=>structuredClone(docs.get(r.path)?.data),updateTime:docs.has(r.path)?{seconds:docs.get(r.path).v,nanoseconds:0}:null});
 return {docs,doc:ref,getAll:async(...refs)=>refs.map(snap),runTransaction:async fn=>{const pending=[];const result=await fn({get:async r=>snap(r),update:(r,patch)=>pending.push(()=>docs.set(r.path,{data:{...docs.get(r.path).data,...patch},v:++clock})),create:(r,data)=>pending.push(()=>{assert.equal(docs.has(r.path),false);docs.set(r.path,{data:structuredClone(data),v:++clock});})});pending.forEach(f=>f());return result;}};
}
async function prepared(db,operation='price',params={value:120}){const b={operation,params,ids:['rug1','rug2']};const p=await previewInventoryBatch(db,b);return {...b,requestId:'test-operation-01',expected:p.rows.map(r=>r.expected)};}
test('preview is read-only; apply is idempotent and reports stale records instead of overwriting',async()=>{
 const db=database(),b=await prepared(db);assert.equal(db.docs.size,2);db.docs.get('showroom_rugs/rug2').v=50;
 const result=await applyInventoryBatch(db,b,'staff');assert.equal(result.updated,1);assert.equal(result.skipped,1);assert.equal(db.docs.get('showroom_rugs/rug2').data.price,100);assert.equal(db.docs.get('showroom_rugs/rug1').data.price,120);
 assert.deepEqual(await applyInventoryBatch(db,b,'staff'),result);await assert.rejects(()=>applyInventoryBatch(db,b,'other'),/conflict/);
});
test('publish batches save dates; auctions create private drafts and never reserve inventory',async()=>{
 const db=database(),b=await prepared(db,'publish',{label:'New collection'});await applyInventoryBatch(db,b,'staff','2026-10-24T12:00:00Z');const published=db.docs.get('showroom_rugs/rug1').data;assert.equal(published.publishedAt,'2026-10-24T12:00:00Z');assert.equal(published.publishBatchLabel,'New collection');
 const auction={...await prepared(db,'auction',{title:'October collection',value:10}),requestId:'auction-operation-01'};const result=await applyInventoryBatch(db,auction,'staff');const draft=db.docs.get('auction_workspaces_v1/'+result.auctionId).data;
 assert.equal(draft.publicEnabled,false);assert.equal(draft.status,'draft');assert.equal(draft.rows.length,2);assert.equal(draft.rows[0].starting,10);assert.equal(db.docs.get('showroom_rugs/rug1').data.availability,'In Stock');
});
test('invalid draft creation fails before any writes',async()=>{const db=database(),b=await prepared(db,'auction',{title:'x',value:10});await assert.rejects(()=>applyInventoryBatch(db,b,'staff'));assert.equal(db.docs.size,2);});
