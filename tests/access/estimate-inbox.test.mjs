import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateBucket,estimateCounts,filterEstimates,saveEstimateRead,saveEstimateStatus} from '../../lib/estimate-inbox.mjs';
const request={id:'request-1',name:'Customer',email:'customer@example.com',phone:'7035550123',createdAt:'2026-10-21T12:00:00Z',status:'New',rugs:[{id:'rug-1',service:'Rug Repair',description:'Blue fringe',images:['photo']} ]};
test('only untouched requests appear in New; reading does not change their section',async()=>{
 let saved={...request};await saveEstimateRead({id:saved.id,write:async(id,patch)=>{assert.equal(id,saved.id);saved={...saved,...patch};},now:()=> 'read-time'});
 assert.equal(saved.readAt,'read-time');assert.equal(estimateBucket(saved),'new');assert.equal(estimateCounts([saved]).new,1);assert.equal(saved.status,'New');assert.equal(saved.rugs,request.rugs);
});
test('contact, estimate and service actions move to In progress; terminal actions go to Closed',()=>{
 for(const status of ['Contacted','Estimate Provided','Pickup Scheduled','In Service','Ready'])assert.equal(estimateBucket({...request,status}),'progress');
 for(const status of ['Delivered','Completed','Declined','Closed','Cancelled','Canceled'])assert.equal(estimateBucket({...request,status}),'closed');
 assert.equal(estimateBucket({...request,status:undefined}),'new');assert.equal(estimateBucket({...request,status:'Legacy action'}),'progress');
});
test('status saves are confirmed, preserve request contents and can reopen a closed request',async()=>{
 let saved={...request};const write=async(id,patch)=>{assert.deepEqual(Object.keys(patch).sort(),['status','statusUpdatedAt']);saved={...saved,...patch};};
 await saveEstimateStatus({id:saved.id,status:'Estimate Provided',write,now:()=> 'action-time'});
 assert.equal(estimateBucket(saved),'progress');assert.equal(saved.statusUpdatedAt,'action-time');assert.equal(saved.email,request.email);assert.equal(saved.rugs,request.rugs);
 await saveEstimateStatus({id:saved.id,status:'Completed',write});assert.equal(estimateBucket(saved),'closed');
 await saveEstimateStatus({id:saved.id,status:'New',write});assert.equal(estimateBucket(saved),'new');
});
test('failed writes propagate and invalid actions never write',async()=>{
 let writes=0;await assert.rejects(()=>saveEstimateStatus({id:'x',status:'Bad',write:async()=>{writes++;}}));assert.equal(writes,0);
 await assert.rejects(()=>saveEstimateStatus({id:'x',status:'Contacted',write:async()=>{throw Error('permission-denied');}}),/permission-denied/);
 await assert.rejects(()=>saveEstimateRead({id:'x',write:async()=>{throw Error('offline');}}),/offline/);
});
test('section counts and filtered search include contacts and individual rug descriptions',()=>{
 const all=[request,{...request,id:'two',name:'Other',status:'Estimate Provided',createdAt:'2026-10-22T12:00:00Z'},{...request,id:'three',status:'Delivered'}];
 assert.deepEqual(estimateCounts(all),{new:1,progress:1,closed:1,all:3});
 assert.deepEqual(filterEstimates(all,'new').map(r=>r.id),['request-1']);assert.equal(filterEstimates(all,'progress','blue fringe').length,1);assert.equal(filterEstimates(all,'all','7035550123').length,3);assert.equal(filterEstimates(all,'new','missing').length,0);assert.equal(filterEstimates(all,'all')[0].id,'two');
});
