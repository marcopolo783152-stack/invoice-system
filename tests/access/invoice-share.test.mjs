import test from 'node:test';import assert from 'node:assert/strict';import {customerInvoice,tokenHash} from '../../lib/server/invoice-share.mjs';
test('invoice links require unguessable tokens, not invoice IDs',()=>{assert.throws(()=>tokenHash('invoice123'));assert.throws(()=>tokenHash(null));assert.equal(tokenHash('a'.repeat(64)).length,64);assert.notEqual(tokenHash('a'.repeat(64)),tokenHash('b'.repeat(64)));});
test('customer invoice projection excludes costs, warehouse and internal payment metadata',()=>{
 const view=customerInvoice({invoiceNumber:'123',items:[{sku:'A',fixedPrice:100,importCost:10,totalCost:20,zone:'vault',secret:'hidden'}],soldTo:{name:'Test',internalFlag:true},payments:[{amount:50,date:'2026-09-29',reference:'private',note:'staff-only'}],internalNotes:'private'});
 assert.equal(view.items[0].fixedPrice,100);for(const k of ['importCost','totalCost','zone','secret'])assert.equal(view.items[0][k],undefined);assert.equal(view.payments[0].reference,undefined);assert.equal(view.soldTo.internalFlag,undefined);assert.equal(view.internalNotes,undefined);
});
