import test from 'node:test';
import assert from 'node:assert/strict';
import {invoiceEmailFields} from '../../lib/invoice-email-fields.mjs';
test('invoice template renders customer, invoice number, button and copyable URL', () => {
  const params = invoiceEmailFields('Nazif', 'MPR-123', 'https://www.marcopolorugs.com/?track=MPR-123');
  const template = 'Invoice #{{invoice_number}} Dear {{to_name}}, {{customer_name}} <a href="{{invoice_url}}">View</a> {{invoice_link}}';
  const rendered = template.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? '');
  assert.ok(rendered.includes('Invoice #MPR-123 Dear Nazif, Nazif'));
  assert.ok(rendered.includes('href="https://www.marcopolorugs.com/?track=MPR-123"'));
  assert.equal(params.invoice_url, params.invoice_link);
});
test('missing invoice data cannot produce a successfully sent blank template', () => {
  assert.throws(() => invoiceEmailFields('Nazif', '', 'https://example.com'));
  for (const link of ['', 'undefined', 'javascript:alert(1)', 'https://user:pass@example.com']) {
    assert.throws(() => invoiceEmailFields('Nazif', '123', link));
  }
  assert.equal(invoiceEmailFields('', '123', 'https://example.com').to_name, 'Customer');
});

import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path, mocks, extras) {
  const module = {exports:{}};
  const js = ts.transpileModule(readFileSync(path, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(js, {module,exports:module.exports,require:key=>{assert.ok(key in mocks, key);return mocks[key];},URL,Date,Intl,AbortSignal,console,...extras});
  return module.exports;
}
const sample = {paymentStatus:'Paid',customerInfo:{name:'Nazif',email:'customer@example.com'},items:[],discount:0,shipping:0,tax:0,total:1000};
function fakeDb(order) {
  const ref = {get:async()=>({exists:true,id:'MPR-123',data:()=>structuredClone(order)}),update:async()=>{}};
  return {collection:()=>({doc:()=>ref}),runTransaction:async fn=>fn({get:ref.get,update:()=>{}})};
}
function assertFields(params) {
  assert.equal(params.to_name, 'Nazif');
  assert.equal(params.customer_name, 'Nazif');
  assert.equal(params.invoice_number, 'MPR-123');
  assert.equal(params.invoice_link, 'https://www.marcopolorugs.com/?track=MPR-123');
  assert.equal(params.invoice_url, params.invoice_link);
}
test('paid receipt sends all invoice template fields to EmailJS', async () => {
  let body;
  const {sendLiveReceipt} = load('lib/server/live-receipt.ts', {
    'server-only':{},'../invoice-email-fields.mjs':{invoiceEmailFields},
    './receipt-email-error.mjs':{receiptEmailError:()=>''},
    './firebase-admin':{serverDb:()=>fakeDb(sample)},'./live-orders.mjs':{LIVE_ORDERS:'live_orders'},
  }, {process:{env:{EMAILJS_PRIVATE_KEY:'test-only'}},fetch:async(_,options)=>{body=JSON.parse(options.body);return {ok:true};}});
  assert.equal(await sendLiveReceipt('MPR-123'), 'sent');
  assertFields(body.template_params);
  assert.ok(body.template_params.message.includes('$10.00'));
});
test('staff order invoice sends all invoice template fields to EmailJS', async () => {
  let body;
  const {POST} = load('app/api/notify-order/route.ts', {
    '@/lib/invoice-email-fields.mjs':{invoiceEmailFields},'@/lib/server/live-receipt':{sendLiveReceipt:()=>{}},
    '@/lib/server/firebase-admin':{caller:async()=>({uid:'staff'}),serverDb:()=>fakeDb(sample)},
    '@/lib/server/staff-permission':{requireStaff:async()=>{}},
    'next/server':{NextResponse:{json:(data,options)=>({data,status:options?.status??200})}},
  }, {process:{env:{EMAILJS_PRIVATE_KEY:'test-only'}},fetch:async(_,options)=>{body=JSON.parse(options.body);return {ok:true};}});
  const response=await POST({text:async()=>JSON.stringify({orderId:'MPR-123',type:'invoice'})});
  assert.equal(response.status,200);
  assertFields(body.template_params);
});
