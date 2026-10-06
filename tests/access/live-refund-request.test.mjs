import test from 'node:test';
import assert from 'node:assert/strict';
import {claimRefundRequest} from '../../lib/server/live-refund-request.mjs';
function database(seed){
 let data=structuredClone(seed),queue=Promise.resolve(),audits=0;
 const ref={collection:()=>({doc:()=>({audit:true})})};
 return {collection:()=>({doc:()=>ref}),read:()=>structuredClone(data),audits:()=>audits,runTransaction(fn){const run=queue.then(async()=>{
 const next=structuredClone(data);let count=0;
 const result=await fn({get:async()=>({data:()=>next}),update:(_,patch)=>Object.assign(next,patch),create:()=>count++});
 data=next;audits+=count;return result;});queue=run.catch(()=>{});return run;}};
}
const paid={paymentStatus:'Paid',paymentIntentId:'pi_test',total:2014,refundedAmount:0};
test('simultaneous admin refunds and retries share one immutable request',async()=>{
 const d=database(paid),results=await Promise.all([claimRefundRequest(d,'order','admin-a',10),claimRefundRequest(d,'order','admin-b',11)]);
 assert.deepEqual(results[0],results[1]);assert.equal(results[0].amount,2014);assert.equal(d.audits(),1);
 assert.deepEqual(await claimRefundRequest(d,'order','admin-a',99),results[0]);
});
test('refund is limited to remaining confirmed funds; unpaid, pending and fully refunded orders fail',async()=>{
 assert.equal((await claimRefundRequest(database({...paid,refundedAmount:1000}),'order','admin')).amount,1014);
 for(const patch of [{paymentStatus:'Unpaid'},{refundPending:true},{refundedAmount:2014}])await assert.rejects(claimRefundRequest(database({...paid,...patch}),'order','admin'));
});
