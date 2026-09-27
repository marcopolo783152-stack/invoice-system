import test from 'node:test';
import assert from 'node:assert/strict';
import {highestWashSku,reserveWashSkus} from '../../lib/server/wash-sku.mjs';
function database(records=new Map()){
 let queue=Promise.resolve();const ref=path=>({path,collection:name=>({doc:id=>ref(path+'/'+name+'/'+id)})});
 return {records,doc:ref,runTransaction:fn=>{const task=queue.then(async()=>{const writes=[];const result=await fn({get:async r=>({exists:records.has(r.path),data:()=>records.get(r.path)}),set:(r,v)=>writes.push([r.path,v]),create:(r,v)=>{assert.ok(!records.has(r.path));writes.push([r.path,v]);}});writes.forEach(([p,v])=>records.set(p,v));return result;});queue=task.catch(()=>{});return task;}};
}
const request=(id,extra={})=>({requestId:id,count:1,uid:'staff1',observedMax:1270,...extra});
test('first new SKU follows MPW 1270 and supports a batch',async()=>{
 const db=database();assert.deepEqual(await reserveWashSkus(db,request('a',{count:2})),['MPW1271','MPW1272']);
});
test('existing higher invoice numbers override baseline, including spaced and legacy SKUs',()=>{
 assert.equal(highestWashSku([{data:{items:[{sku:'MPW 1310'},{sku:'mpw001400'}]}},{items:[{sku:'MPW1412'},{sku:'MP123456'}]}]),1412);
});
test('simultaneous staff requests receive distinct increasing numbers',async()=>{
 const db=database();const [a,b]=await Promise.all([reserveWashSkus(db,request('a')),reserveWashSkus(db,request('b',{uid:'staff2'}))]);assert.deepEqual([...a,...b],['MPW1271','MPW1272']);
});
test('retry returns same reservation and cannot change actor or batch size',async()=>{
 const db=database();const first=await reserveWashSkus(db,request('a'));assert.deepEqual(await reserveWashSkus(db,request('a')),first);await assert.rejects(()=>reserveWashSkus(db,request('a',{count:2})));await assert.rejects(()=>reserveWashSkus(db,request('a',{uid:'other'})));assert.equal(db.records.get('system_counters/wash_sku').lastUsed,1271);
});
test('fresh server instance continues database counter even if older invoices disappear',async()=>{
 const first=database();await reserveWashSkus(first,request('a',{observedMax:1500}));const afterDeploy=database(first.records);assert.deepEqual(await reserveWashSkus(afterDeploy,request('b')),['MPW1502']);
});
test('invalid stored counter fails closed instead of resetting',async()=>{
 const db=database(new Map([['system_counters/wash_sku',{lastUsed:'broken'}]]));await assert.rejects(()=>reserveWashSkus(db,request('a')));assert.equal(db.records.size,1);
});
