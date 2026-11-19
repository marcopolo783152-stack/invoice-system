import test from 'node:test';
import assert from 'node:assert/strict';
import {assignOrderNumber} from '../../lib/server/order-number.mjs';
function database(initial={}){
 let data=new Map([['showroom_live_orders/a',{id:'a',...initial}],['showroom_live_orders/b',{id:'b'}],['showroom_orders/a',{id:'a'}]]),queue=Promise.resolve();
 return {read:path=>data.get(path),collection:c=>({doc:id=>({path:c+'/'+id})}),runTransaction(fn){const run=queue.then(async()=>{
 const next=new Map(data);const result=await fn({get:async r=>({exists:next.has(r.path),data:()=>next.get(r.path)}),set:(r,v)=>next.set(r.path,v),update:(r,v)=>next.set(r.path,{...next.get(r.path),...v})});data=next;return result;});queue=run.catch(()=>{});return run;}};
}
test('short order numbers are unique under simultaneous allocation and stable across retries',async()=>{
 const db=database(),[a,b]=await Promise.all([assignOrderNumber(db,'a'),assignOrderNumber(db,'b')]);
 assert.match(a.orderNumber,/^MP-[A-Z][A-F0-9]{10}[0-9]$/);assert.match(b.orderNumber,/^MP-[A-Z][A-F0-9]{10}[0-9]$/);assert.notEqual(a.orderNumber,b.orderNumber);
 assert.equal((await assignOrderNumber(db,'a')).orderNumber,a.orderNumber);
 assert.equal(db.read('showroom_orders/a').orderNumber,a.orderNumber);
 assert.equal(db.read('showroom_live_orders/a').id,'a');assert.equal(db.read('showroom_order_references/'+a.orderNumber).orderId,'a');
});

test('existing references remain usable and are never renumbered',async()=>{const db=database({orderNumber:'MP-000015'});assert.equal((await assignOrderNumber(db,'a')).orderNumber,'MP-000015');assert.equal(db.read('showroom_order_references/MP-000015'),undefined);});
