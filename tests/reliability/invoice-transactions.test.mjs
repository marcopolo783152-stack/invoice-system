import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function setup() {
 const records=new Map(); let queue=Promise.resolve(),seq=0;
 const ref=(...parts)=>parts.filter(Boolean).join('/');
 const snapshot=key=>({exists:()=>records.has(key),data:()=>records.get(key)});
 const firestore={Timestamp:{now:()=>123},collection:(_db,name)=>name,doc:(...args)=>args.length===1?`${args[0]}/auto-${++seq}`:ref(...args.slice(1)),orderBy:()=>null,limit:()=>null,
 query:name=>name,getDocs:async()=>({empty:true,docs:[]}),
 runTransaction:(_db,fn)=>{const operation=queue.then(async()=>{const writes=[];const result=await fn({get:async key=>snapshot(key),set:(key,value)=>writes.push([key,value]),update:(key,value)=>writes.push([key,{...records.get(key),...value}])});for(const [key,value] of writes)records.set(key,value);return result;});queue=operation.catch(()=>{});return operation;}};
 const exports={};const code=ts.transpileModule(fs.readFileSync('lib/firebase-storage.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{exports,console,require:name=>name==='firebase/firestore'?firestore:name==='./user-storage'?{getStorePrefix:()=>''}:name==='./firebase'?{db:{},isFirebaseConfigured:()=>true,checkFirebaseQuotaError:()=>{}}:name==='./calculations'?{calculateInvoice:d=>({balanceDue:1000-(d.payments||[]).reduce((s,p)=>s+p.amount,0),totalDue:1000})}:{} });
 return {api:exports,records};
}
test('concurrent invoice number requests reserve different sequence values',async()=>{
 const {api}=setup();const values=await Promise.all([api.getNextInvoiceNumber(),api.getNextInvoiceNumber()]);assert.equal(new Set(values).size,2);
});
test('duplicate creates reserve one invoice number and do not partially write',async()=>{
 const {api,records}=setup();const data={date:'2026-09-18'};
 const results=await Promise.allSettled([api.saveInvoiceToCloud('MP00000001','A',100,data),api.saveInvoiceToCloud('MP00000001','B',100,data)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal([...records.keys()].filter(k=>k.startsWith('invoices/')).length,1);
});
test('simultaneous payment additions keep both payments and unrelated fields',async()=>{
 const {api,records}=setup();records.set('invoices/a',{data:{notes:'keep',payments:[]}});
 const pay=id=>({id,amount:100,method:'Check',date:'2026-09-18'});
 await Promise.all([api.appendInvoicePayment('a',pay('one')),api.appendInvoicePayment('a',pay('two'))]);
 assert.equal(records.get('invoices/a').data.payments.length,2);assert.equal(records.get('invoices/a').data.notes,'keep');
 await api.appendInvoicePayment('a',pay('one'));assert.equal(records.get('invoices/a').data.payments.length,2);
 await assert.rejects(api.appendInvoicePayment('a',{...pay('one'),amount:200}),/conflict/);
});
