import test from 'node:test';import assert from 'node:assert/strict';
import {deliveredCents,deliveryRate} from '../../lib/delivered-price.mjs';
test('all four weight rates are included once in the sale price',()=>{
 for(const [sizeCategory,rate] of [['Small',2],['Medium',3],['Large',3.5],['Extra Large',4.5],['Oversized',4.5],['Runner',2]]){
 const rug={price:100,weightLbs:10,sizeCategory};assert.equal(deliveryRate(rug),rate);assert.equal(deliveredCents(rug),10000+rate*1000);
 }
 assert.equal(deliveredCents({price:100,weightLbs:10,sizeCategory:'Small'}),12000);
 assert.equal(deliveredCents({price:100,weightLbs:1.25,sizeCategory:'Large'}),10438);
});
test('missing inputs do not silently create a delivery price; Mushwani weight is confirmed',()=>{
 assert.equal(deliveredCents({price:100,sizeCategory:'Small'}),null);
 assert.equal(deliveredCents({price:100,weightLbs:10}),null);
 assert.equal(deliveredCents({price:100,name:'Mushwani Runner',sizeCategory:'Runner'}),11800);
});
