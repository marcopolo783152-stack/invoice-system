import test from 'node:test';import assert from 'node:assert/strict';
import {suggestRugCategory,categorizeRug,categoryMeasurements} from '../../lib/rug-categorization.mjs';
test('common and reversed measurements select a nominal category without changing exact size',()=>{
 for(const dimensions of ["8' 2\" x 10' 3\"","10ft 3in × 8ft 2in","8’2” x 10’3”"]){const r=categorizeRug({dimensions,name:'Wool rug',price:100,weightLbs:20,availability:'In Stock'});assert.equal(r.sizeCategory,'8x10');assert.equal(r.dimensions,dimensions);assert.equal(r.price,100);assert.equal(r.weightLbs,20);assert.equal(r.availability,'In Stock');assert.equal(r.categoryMode,'auto');}
});
test('long narrow runners, round, square and oval rugs select existing categories',()=>{
 for(const [dimensions,shape,category] of [['2 x 8','','Runner'],['3 x 12','Rectangular','Runner'],['6 ft','Round','6 ft Round'],['5 x 5','Square','5 ft Square'],['4 x 6','Oval','4x6 Oval']])assert.equal(suggestRugCategory({dimensions,shape}).sizeCategory,category);
 assert.equal(suggestRugCategory({dimensions:'12 x 30'}).shape,'Rectangular');
});
test('odd sizes use a size group and do not pretend to be a standard size',()=>{assert.equal(suggestRugCategory({dimensions:'7.2 x 8.4'}).sizeCategory,'Large');assert.equal(suggestRugCategory({dimensions:'15 x 19'}).sizeCategory,'Oversized');});
test('manual choices and old saved classifications are not changed when manual mode is selected',()=>{const r={categoryMode:'manual',sizeCategory:'Custom',shape:'Rectangular',dimensions:'8 x 10'};assert.deepEqual(categorizeRug(r),r);});
test('automatic updates recompute a stale category without overwriting unrelated rug details',()=>{const r=categorizeRug({categoryMode:'auto',sizeCategory:'2x3',dimensions:'9 x 12',sku:'KEEP',images:['photo'],originalPrice:150});assert.equal(r.sizeCategory,'9x12');assert.equal(r.sku,'KEEP');assert.deepEqual(r.images,['photo']);assert.equal(r.originalPrice,150);});
test('missing measurements, metric units and malformed feet and inches require review',()=>{for(const dimensions of ['', 'unknown','240cm x 300cm','8ft 13in x 10ft','8 x bad','8']){assert.equal(suggestRugCategory({dimensions}).sizeCategory,null);assert.throws(()=>categorizeRug({dimensions}),/measurements/);}});
test('tag style feet and inches are parsed while the original value is preserved',()=>{assert.deepEqual(categoryMeasurements("4'1'' X 6'5''"),[4+1/12,6+5/12]);assert.equal(categorizeRug({dimensions:"4'1'' X 6'5''"}).sizeCategory,'4x6');});
