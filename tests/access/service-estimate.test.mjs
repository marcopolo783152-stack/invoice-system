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
