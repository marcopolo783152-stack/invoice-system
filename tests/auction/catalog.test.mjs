import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibleRug,lotFields,publicLot} from '../../lib/auction/catalog.mjs';
const rug={id:'rug-1',name:'Afghan rug',availability:'In Stock',origin:'Afghanistan',images:['https://example.test/rug.jpg'],sku:'101',dimensions:"8' x 10'",material:'Wool'};
const input={title:'Afghan rug',eventTitle:'Autumn auction',condition:'Good condition with minor fringe wear.',startingCents:10000,reserveCents:50000,loadingCents:1000,shippingOffered:true};
test('public catalog excludes drafts, archived, sold inventory and review holds',()=>{
 for(const status of ['draft','archived','sold'])assert.equal(publicLot('lot',{...lotFields(input),status},rug),null);
 assert.equal(publicLot('lot',{...lotFields(input),status:'preview'},{...rug,availability:'Sold'}),null);
 assert.equal(publicLot('lot',{...lotFields(input),status:'preview'},{...rug,origin:'Iran'}),null);
 assert.equal(eligibleRug({...rug,id:'rug-1783796414468'}),false);
});
test('public lot uses allowlisted fields, hides reserve and staff/customer data',()=>{
 const lot={...lotFields(input),status:'preview',lotNumber:'MP-1',createdBy:'private',maximumCents:99000,email:'private@example.test'};
 const result=publicLot('lot',lot,rug);assert.equal(result.startingCents,10000);assert.equal(result.hasReserve,true);assert.equal(result.reserveCents,undefined);assert.equal(result.createdBy,undefined);assert.equal(result.email,undefined);assert.equal(result.maximumCents,undefined);assert.equal(result.biddingEnabled,false);assert.equal(result.snapshot.dimensions,"8' x 10'");
});
test('lot field validation ignores supplied live flags and checks planned dates and prices',()=>{
 const fields=lotFields({...input,biddingEnabled:true,status:'live',buyerPremiumBps:9999});assert.equal(fields.biddingEnabled,undefined);assert.equal(fields.status,undefined);assert.equal(fields.buyerPremiumBps,0);
 assert.throws(()=>lotFields({...input,reserveCents:5000}));assert.throws(()=>lotFields({...input,startingCents:1.5}));assert.throws(()=>lotFields({...input,startAt:200,endAt:100}));assert.throws(()=>lotFields({...input,startAt:200}));
});
