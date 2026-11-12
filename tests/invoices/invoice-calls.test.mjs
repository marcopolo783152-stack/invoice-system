import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareCall,appendCall,serviceInvoice,callReference} from '../../lib/server/invoice-calls.mjs';
const actor={uid:'staff-uid',name:'Nazif'},at='2026-10-23T21:00:00.000Z';
const input={id:'call-reference-0001',result:'answered',pickupDate:'2026-10-25',pickupTime:'14:30',notes:'Will collect after lunch'};
function database(record={data:{documentType:'WASH',payments:[{amount:50}],serviceTransport:{method:'pickup_only'},items:[{sku:'MPW0001'}]}}){
 const records=new Map(record?[['invoices/invoice-1',structuredClone(record)]]:[]);const writes=[];
 const ref=path=>({path,collection:name=>({doc:id=>ref(path+'/'+name+'/'+id)})});let tail=Promise.resolve();
 return {records,writes,doc:ref,runTransaction(fn){const run=tail.then(async()=>{const pending=[];const result=await fn({get:async r=>({exists:records.has(r.path),data:()=>structuredClone(records.get(r.path))}),create:(r,data)=>pending.push([r.path,data])});for(const [path,data] of pending){assert.equal(records.has(path),false);records.set(path,structuredClone(data));writes.push(path);}return result;});tail=run.catch(()=>{});return run;}};
}
test('answered calls record customer pickup plans and trusted actor/time',()=>{
 const call=prepareCall({...input,calledBy:'Fake',calledByUid:'Fake',calledAt:'Fake'},actor,at);
 assert.equal(call.calledBy,'Nazif');assert.equal(call.calledByUid,'staff-uid');assert.equal(call.calledAt,at);assert.equal(call.pickupDate,'2026-10-25');assert.equal(call.pickupTime,'14:30');assert.equal(call.outcome,'');
});
test('no-answer outcomes retain voicemail/message/no-message and ignore hidden pickup fields',()=>{
 for(const outcome of ['voicemail','message','none']){const call=prepareCall({...input,result:'no_answer',outcome},actor,at);assert.equal(call.outcome,outcome);assert.equal(call.pickupDate,'');assert.equal(call.pickupTime,'');}
});
test('unconfirmed pickup is allowed; malformed dates, times, results and notes are rejected',()=>{
 assert.equal(prepareCall({...input,pickupDate:'',pickupTime:''},actor,at).pickupDate,'');
 for(const patch of [{result:'bad'},{result:'no_answer',outcome:''},{pickupDate:'2026-02-30'},{pickupTime:'25:00'},{pickupDate:'',pickupTime:'12:00'},{notes:'x'.repeat(2001)},{id:'../x'}])assert.throws(()=>prepareCall({...input,...patch},actor,at));
});
test('invoice references reject traversal and other collections',()=>{
 assert.equal(callReference('invoices','invoice-1'),'invoices/invoice-1');assert.equal(callReference('store_invoices','a'),'store_invoices/a');
 for(const [collection,id] of [['users','a'],['invoices','../x'],['invoices/a','b'],['invoices','']])assert.throws(()=>callReference(collection,id));
});
test('each call appends separately without touching payments, rugs, charges, or invoice status',async()=>{
 const db=database(),before=structuredClone(db.records.get('invoices/invoice-1'));
 const result=await appendCall(db,{collection:'invoices',id:'invoice-1',input,actor,at});
 assert.equal(result.fingerprint,undefined);assert.equal(result.calledBy,'Nazif');assert.deepEqual(db.records.get('invoices/invoice-1'),before);assert.deepEqual(db.writes,['invoices/invoice-1/customerCalls/'+input.id]);
});
test('simultaneous staff attempts are retained and retries are idempotent',async()=>{
 const db=database();const args={collection:'invoices',id:'invoice-1',input,actor,at};
 await Promise.all([appendCall(db,args),appendCall(db,{...args,input:{...input,id:'call-reference-0002'},actor:{uid:'other',name:'Other staff'}})]);
 const retry=await appendCall(db,{...args,at:'later-time'});assert.equal(retry.calledAt,at);assert.equal(db.writes.length,2);
 await assert.rejects(()=>appendCall(db,{...args,input:{...input,notes:'Different content'}}),/already used/);assert.equal(db.writes.length,2);
});
test('missing and non-service invoices reject call writes',async()=>{
 assert.equal(serviceInvoice({data:{mode:'repair'}}),true);assert.equal(serviceInvoice({data:{mode:'wash'}}),true);
 for(const db of [database(null),database({data:{documentType:'INVOICE',mode:'retail'}})]){await assert.rejects(()=>appendCall(db,{collection:'invoices',id:'invoice-1',input,actor,at}));assert.equal(db.writes.length,0);}
});
test('failed database writes propagate; UI cannot report success from an unconfirmed save',async()=>{
 const db={doc:()=>({collection:()=>({doc:()=>({})})}),runTransaction:async()=>{throw Error('offline');}};
 await assert.rejects(()=>appendCall(db,{collection:'invoices',id:'invoice-1',input,actor,at}),/offline/);
});
