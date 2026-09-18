import test from 'node:test';
import assert from 'node:assert/strict';
import {isRugOnReviewHold} from '../../lib/catalog-visibility.mjs';
test('hold follows origin and flagged IDs without changing records',()=>{
 for(const origin of ['Iran',' IRAN ','Persia (Iran)','Persian','ایران']) assert.equal(isRugOnReviewHold({origin}),true);
 for(const origin of ['Afghanistan','India','Turkey']) assert.equal(isRugOnReviewHold({origin,name:'Persian design'}),false);
 assert.equal(isRugOnReviewHold({id:'rug-1783796714385',origin:'Unknown'}),true);
 const record={origin:'Iran',name:'Kashan'};isRugOnReviewHold(record);assert.deepEqual(record,{origin:'Iran',name:'Kashan'});
});
