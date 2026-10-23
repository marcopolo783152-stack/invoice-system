import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesSearch,matchesSize,filterRugs,SHOP_SIZE_OPTIONS} from '../../lib/rug-discovery.mjs';
const rug={name:'Blue rug',material:'Wool',dimensions:`7'10 × 10'2`,availability:'In Stock',origin:'Turkey'};
test('nominal sizes match actual measurements within six inches in either orientation',()=>{
 assert.ok(matchesSize(rug,'8 × 10'));assert.ok(matchesSize(rug,'10x8'));
 assert.ok(matchesSize({...rug,dimensions:`8'6 × 10'6`},'8x10'));
 assert.equal(matchesSize({...rug,dimensions:`8'7 × 10'6`},'8x10'),false);
 assert.equal(matchesSize({...rug,dimensions:''},'8x10'),false);
 assert.ok(SHOP_SIZE_OPTIONS.includes('10 × 11'));
});
test('size queries combine with text and reject other sizes',()=>{
 for(const q of ['8x10','8 X 10','8 × 10','blue wool 8x10','8ft x 10ft'])assert.ok(matchesSearch(rug,q),q);
 assert.equal(matchesSearch(rug,'red 8x10'),false);
 assert.equal(matchesSearch(rug,'9x12'),false);
 assert.equal(filterRugs([rug],{size:'8 × 10'}).length,1);
 assert.equal(filterRugs([{...rug,availability:'Sold'}],{size:'8 × 10'}).length,0);
});

test('feet and inch search preserves both full measurements',()=>{
 assert.ok(matchesSearch({...rug,dimensions:`8'11 × 11'11`},`8'11 x 11'11`));
 assert.equal(matchesSearch(rug,`8'11 x 11'11`),false);
});
