import test from 'node:test';
import assert from 'node:assert/strict';
import {assignOrderNumber} from '../../lib/server/order-number.mjs';
function database(){
 let data=new Map([['showroom_live_orders/a',{id:'a'}],['showroom_live_orders/b',{id:'b'}],['showroom_orders/a',{id:'a'}]]),queue=Promise.resolve();
 return {read:path=>data.get(path),collection:c=>({doc:id=>({path:c+'/'+id})}),runTransaction(fn){const run=queue.then(async()=>{
 const next=new Map(data);const result=await fn({get:async r=>({exists:next.has(r.path),data:()=>next.get(r.path)}),set:(r,v)=>next.set(r.path,v),update:(r,v)=>next.set(r.path,{...next.get(r.path),...v})});data=next;return result;});queue=run.catch(()=>{});return run;}};
}
test('short order numbers are unique under simultaneous allocation and stable across retries',async()=>{
 const db=database(),[a,b]=await Promise.all([assignOrderNumber(db,'a'),assignOrderNumber(db,'b')]);
 assert.equal(a.orderNumber,'MP-000001');assert.equal(b.orderNumber,'MP-000002');
 assert.equal((await assignOrderNumber(db,'a')).orderNumber,a.orderNumber);
 assert.equal(db.read('showroom_orders/a').orderNumber,a.orderNumber);
 assert.equal(db.read('showroom_live_orders/a').id,'a');assert.equal(db.read('showroom_counters/online_orders').last,2);
});
