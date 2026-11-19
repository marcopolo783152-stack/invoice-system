import test from 'node:test';
import assert from 'node:assert/strict';
import {submitServiceEstimate} from '../../lib/service-estimate.mjs';
const formData={name:'Guest customer',email:'guest@example.com',phone:'7035550100',zip:'22314',widthFeet:10,widthInches:0,lengthFeet:14,lengthInches:0,service:'Rug Cleaning'};
function input(overrides={}) {return {formData,files:[],createReference:()=>({id:'firebase-generated-id'}),uploadImages:async()=>[],write:async()=>{},now:()=> '2026-10-11T16:23:00.000Z',...overrides};}
test('guest request includes its exact document ID and fields required by the existing rules',async()=>{
 let stored;const id=await submitServiceEstimate(input({write:async(ref,data)=>{
  assert.equal(data.id,ref.id);assert.equal(data.status,'New');
  assert.ok(typeof data.name==='string'&&data.name.length>0);assert.equal(typeof data.email,'string');assert.equal(typeof data.phone,'string');stored=data;
 }}));
 assert.equal(id,'firebase-generated-id');assert.equal(stored.createdAt,'2026-10-11T16:23:00.000Z');assert.equal(stored.dimensions,`10' 0" × 14' 0"`);assert.deepEqual(stored.images,[]);
});
test('five selected photos are retained before the request is saved',async()=>{
 const images=['a','b','c','d','e'];let written=false;
 await submitServiceEstimate(input({files:images,uploadImages:async()=>images,write:async(ref,data)=>{written=true;assert.deepEqual(data.images,images);}}));assert.equal(written,true);
});
test('failed or incomplete photo uploads never silently save a request without photos',async()=>{
 for(const uploadImages of [async()=>{throw Error('permission-denied');},async()=>['one']]){
 let written=false;await assert.rejects(()=>submitServiceEstimate(input({files:['a','b'],uploadImages,write:async()=>{written=true;}})),/photos.*uploaded/i);assert.equal(written,false);
 }
});
test('permission denied writes fail instead of displaying success',async()=>{
 const failure=Object.assign(Error('permission denied'),{code:'permission-denied'});
 await assert.rejects(()=>submitServiceEstimate(input({write:async()=>{throw failure;}})),e=>e===failure);
});
test('submission waits for Firestore confirmation',async()=>{
 let confirm;let completed=false;const pending=submitServiceEstimate(input({write:()=>new Promise(resolve=>{confirm=resolve;})})).then(()=>{completed=true;});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(completed,false);confirm();await pending;assert.equal(completed,true);
});

const rug=(id,overrides={})=>({id,service:'Rug Cleaning',rugType:'Wool',widthFeet:8,widthInches:3,lengthFeet:10,lengthInches:1,description:'First rug',files:[],...overrides});
test('different rugs and their photos are grouped into exactly one request with shared contacts',async()=>{
 let writes=0,stored;const uploaded=[];
 await submitServiceEstimate(input({rugs:[rug('one',{files:['front','back']}),rug('two',{service:'Rug Repair',description:'Fix fringe',files:['fringe'],widthFeet:3,lengthFeet:5})],uploadImages:async files=>{uploaded.push([...files]);return files.map(f=>'https://photos.test/'+f);},write:async(ref,data)=>{writes++;stored=data;}}));
 assert.equal(writes,1);assert.equal(stored.rugCount,2);assert.equal(stored.name,formData.name);assert.equal(stored.id,'firebase-generated-id');assert.equal(stored.status,'New');assert.deepEqual(uploaded,[['front','back'],['fringe']]);
 assert.deepEqual(stored.rugs[0].images,['https://photos.test/front','https://photos.test/back']);assert.deepEqual(stored.rugs[1].images,['https://photos.test/fringe']);assert.equal(stored.rugs[1].service,'Rug Repair');assert.equal(stored.rugs[1].description,'Fix fringe');assert.equal(stored.rugs[0].dimensions,`8' 3" × 10' 1"`);assert.equal(stored.rugs[0].files,undefined);
});
test('a later rug photo failure never writes a partial estimate',async()=>{let writes=0;await assert.rejects(()=>submitServiceEstimate(input({rugs:[rug('one',{files:['ok']}),rug('two',{files:['fail']})],uploadImages:async files=>{if(files[0]==='fail')throw Error('upload failed');return ['https://photos.test/ok'];},write:async()=>{writes++;}})),/rug 2.*uploaded/);assert.equal(writes,0);});
test('all rug sizes, counts, references and photo limits are checked before any upload or write',async()=>{
 const invalid=[[],Array.from({length:21},(_,i)=>rug(String(i))),[rug('same'),rug('same')],[rug('one',{widthInches:12})],[rug('one',{widthFeet:-1})],[rug('one',{files:Array(6).fill('photo')})],[rug('one',{files:[{size:11*1024*1024,type:'image/jpeg'}]})],[rug('one',{files:[{size:10,type:'application/pdf'}]})]];
 for(const rugs of invalid){let uploads=0,writes=0;await assert.rejects(()=>submitServiceEstimate(input({rugs,uploadImages:async()=>{uploads++;return [];},write:async()=>{writes++;}})));assert.equal(uploads,0);assert.equal(writes,0);}
});
test('removed rugs do not reappear, and the remaining rug keeps its own details',async()=>{let stored;const drafts=[rug('one'),rug('two',{description:'Keep this rug'})];await submitServiceEstimate(input({rugs:drafts.filter(r=>r.id!=='one'),write:async(ref,data)=>{stored=data;}}));assert.equal(stored.rugs.length,1);assert.equal(stored.rugs[0].id,'two');assert.equal(stored.description,'Keep this rug');});
test('twenty rugs without photos fit in one confirmed request',async()=>{let stored;await submitServiceEstimate(input({rugs:Array.from({length:20},(_,i)=>rug(String(i))),write:async(ref,data)=>{stored=data;}}));assert.equal(stored.rugs.length,20);assert.equal(stored.rugCount,20);assert.equal(stored.images.length,0);});
test('admin reads old single-rug requests and new multi-rug requests without changing the originals',async()=>{const {estimateRugs}=await import('../../lib/service-estimate.mjs');const legacy={service:'Rug Repair',rugType:'Silk',dimensions:'4 x 6',description:'Old request',images:['legacy-photo']};const before=JSON.stringify(legacy);const read=estimateRugs(legacy);assert.equal(read.length,1);assert.equal(read[0].service,'Rug Repair');assert.deepEqual(read[0].images,['legacy-photo']);assert.equal(JSON.stringify(legacy),before);const modern={rugs:[{id:'a',images:['a']},{id:'b',images:['b']}]};assert.equal(estimateRugs(modern),modern.rugs);});
