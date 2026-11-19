import * as transport from '../../lib/service-transport.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';import * as products from '../../lib/service-products.mjs';
const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/calculations.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:(name)=>name.includes('service-transport')?transport:products});const calc=exports.calculateInvoice;
const base={invoiceNumber:'TEST',date:'2026-10-05',terms:'',soldTo:{name:'Test'},mode:'wash',documentType:'WASH',items:[{id:'rug',sku:'MPW0001',description:'Washing',shape:'rectangle',widthFeet:1,widthInches:0,lengthFeet:1,lengthInches:0,fixedPrice:100}]};const pad={id:'pad',description:'Padding',quantity:1,unitPrice:50,taxable:true};
test('mixed service invoice charges tax only on separately priced products',()=>{const r=calc({...base,serviceProducts:[pad]});assert.equal(r.subtotal,150);assert.equal(r.salesTax,3);assert.equal(r.totalDue,153);assert.equal(r.balanceDue,153);assert.equal(r.items.length,1);assert.equal(base.items[0].sku,'MPW0001');});
test('service discounts and lump sums never silently change product price or tax',()=>{const r=calc({...base,serviceProducts:[pad],discountValue:10,discountType:'percentage'});assert.equal(r.discount,10);assert.equal(r.totalDue,143);const lump=calc({...base,isLumpSum:true,lumpSumAmount:80,serviceProducts:[pad]});assert.equal(lump.totalDue,133);});
test('quantities, tax exemption, returns and payments remain correct',()=>{assert.equal(calc({...base,serviceProducts:[{...pad,quantity:2}]}).totalDue,206);assert.equal(calc({...base,serviceProducts:[{...pad,taxable:false}]}).totalDue,150);const r=calc({...base,serviceProducts:[{...pad,returned:true}],payments:[{amount:100}]});assert.equal(r.netTotalDue,100);assert.equal(r.returnedAmount,53);assert.equal(r.balanceDue,0);});
test('product amounts round in cents and invalid quantities or prices cannot become totals',()=>{assert.equal(products.calculateServiceProducts([{...pad,unitPrice:19.99,quantity:3}]).tax,3.6);for(const p of [{...pad,quantity:0},{...pad,quantity:1.5},{...pad,unitPrice:NaN},{...pad,unitPrice:-1}])assert.throws(()=>products.calculateServiceProducts([p]));});
test('old service invoices retain zero tax and old retail invoices keep their existing tax',()=>{assert.equal(calc(base).totalDue,100);assert.equal(calc(base).salesTax,0);assert.equal(calc({...base,serviceProducts:[]}).totalDue,100);assert.equal(calc({...base,mode:'retail',documentType:'INVOICE'}).totalDue,106);});
test('customer invoice includes products and hides private product metadata',async()=>{const {customerInvoice}=await import('../../lib/server/invoice-share.mjs');const d=customerInvoice({...base,serviceProducts:[{...pad,internalCost:10}]});assert.equal(d.serviceProducts[0].unitPrice,50);assert.equal(d.serviceProducts[0].internalCost,undefined);assert.equal(calc(d).totalDue,153);});
test('pickup and delivery fees are separate from rug discount and product tax',()=>{
 const serviceTransport={method:'pickup_delivery',pickup:{pricing:'charge',amount:20},delivery:{pricing:'charge',amount:30}};
 const r=calc({...base,serviceTransport,serviceProducts:[pad],discountValue:10,discountType:'percentage',downpayment:25,payments:[{amount:10}]});
 assert.equal(r.totalDue,193);assert.equal(r.salesTax,3);assert.equal(r.totalAdditionalCharges,50);assert.equal(r.balanceDue,158);
 assert.equal(calc({...base,serviceTransport,isLumpSum:true,lumpSumAmount:80}).totalDue,130);
 assert.equal(calc({...base,mode:'retail',documentType:'INVOICE',serviceTransport}).totalDue,106);
});
test('each arrangement bills only its active legs and free never adds stale amounts',()=>{
 const pickup={pricing:'charge',amount:12.34},delivery={pricing:'charge',amount:20};
 for(const [method,total] of [['pickup_delivery',132.34],['pickup_only',112.34],['showroom_dropoff_delivery',120],['showroom_dropoff_pickup',100]])assert.equal(calc({...base,serviceTransport:{method,pickup,delivery}}).totalDue,total);
 assert.equal(calc({...base,serviceTransport:{method:'pickup_delivery',pickup:{pricing:'free',amount:999},delivery:{pricing:'free',amount:999}}}).totalDue,100);
});
test('invalid transport fees fail invoice validation; old invoices remain valid',()=>{
 const d={...base,pickupDate:'2026-10-30'};
 assert.equal(exports.validateInvoiceData(d).length,0);
 for(const amount of [-1,0,NaN,Infinity,1.001,1000001])assert.ok(exports.validateInvoiceData({...d,serviceTransport:{method:'pickup_only',pickup:{pricing:'charge',amount}}}).length);
 assert.ok(exports.validateInvoiceData({...d,serviceTransport:{method:'unknown'}}).length);
 assert.equal(exports.validateInvoiceData({...d,serviceTransport:{method:'pickup_only',pickup:{pricing:'charge',amount:12.34}}}).length,0);
});
test('shared invoice preserves fees and hides private or inactive leg metadata',async()=>{
 const {customerInvoice}=await import('../../lib/server/invoice-share.mjs');
 const d=customerInvoice({...base,serviceTransport:{method:'pickup_only',internalCost:2,pickup:{pricing:'charge',amount:25,staffNotes:'private'},delivery:{pricing:'charge',amount:999}}});
 assert.deepEqual(d.serviceTransport,{method:'pickup_only',pickup:{pricing:'charge',amount:25}});
 assert.equal(calc(d).totalDue,125);
 const returned=calc({...d,items:d.items.map(i=>({...i,returned:true})),payments:[{amount:25}]});
 assert.equal(returned.netTotalDue,25);assert.equal(returned.returnedAmount,100);assert.equal(returned.balanceDue,0);
});
