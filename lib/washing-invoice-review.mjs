// Shared deterministic invoice review; no keys or server SDKs.
export class WashError extends Error {constructor(message,status=400){super(message);this.name='InvoiceReviewError';this.status=status;}}
export const text=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
export const skuKey=v=>String(v||'').trim().toUpperCase().replace(/^MPW0+(?=\d)/,'MPW');
export function date(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(v+'T12:00:00Z').toISOString().slice(0,10)!==v)throw new WashError('Use a valid invoice date.');return v;}

export function extraction(value){
 if(!value||!Array.isArray(value.rows)||value.rows.length>200)throw new WashError('Invoice rows could not be read. Upload a clearer scan.');
 const rows=value.rows.map((r,i)=>{const quantity=Number(r.quantity),amount=r.amount===null||r.amount===''||r.amount===undefined?null:Number(r.amount);if(!Number.isInteger(quantity)||quantity<1||quantity>200||amount!==null&&(!Number.isFinite(amount)||amount<0||amount>1000000))throw new WashError('Check row '+(i+1)+' quantity and amount.');return {id:String(i),sku:text(r.sku||'',50).toUpperCase(),description:text(r.description||'',200),quantity,amount,uncertain:r.uncertain!==false};});
 const number=v=>v===null||v===''||v===undefined?null:Number(v);const total=number(value.total),tax=number(value.tax),other=number(value.other);for(const n of [total,tax,other])if(n!==null&&(!Number.isFinite(n)||n<0||n>1000000))throw new WashError('Check invoice amounts.');
 const invoiceDate=text(value.invoiceDate||'',10);if(invoiceDate)date(invoiceDate);
 return {invoiceNumber:text(value.invoiceNumber||'',80),company:text(value.company||'',120),invoiceDate,rows,total,tax,other,notes:text(value.notes||'',1000)};
}
export function compareInvoice(expected,value){
 const e=extraction(value),wanted=new Map(expected.rugs.map(r=>[skuKey(r.sku),r])),seen=new Map(),matched=[],extras=[],duplicates=[],wrongCustomer=[],unclear=[];
 for(const r of e.rows){const key=r.sku?skuKey(r.sku):'',isCustomer=/^MPW/i.test(r.sku);if(r.uncertain)unclear.push(r.id);if(key&&wanted.has(key)){const count=(seen.get(key)||0)+r.quantity;seen.set(key,count);matched.push({...r,expected:wanted.get(key).sku});if(count>1)duplicates.push(wanted.get(key).sku);}else if(isCustomer)wrongCustomer.push(r);else extras.push(r);}
 const missing=[...wanted].filter(([key])=>!seen.has(key)).map(([,r])=>r.sku),sum=e.rows.every(r=>r.amount!==null)?Math.round((e.rows.reduce((s,r)=>s+r.amount,0)+(e.tax||0)+(e.other||0))*100)/100:null;
 const amountMismatch=sum!==null&&e.total!==null&&Math.abs(sum-e.total)>.02;
 return {matched,missing,extras,duplicates:[...new Set(duplicates)],wrongCustomer,unclear,customerCount:matched.reduce((s,r)=>s+r.quantity,0),storeCount:extras.reduce((s,r)=>s+r.quantity,0),expectedCount:wanted.size,amountMismatch,calculatedTotal:sum,dateWarning:!e.invoiceDate||e.invoiceDate!==expected.date,companyWarning:!e.company||e.company.toLowerCase().replace(/[^a-z0-9]/g,'')!==expected.companyName.toLowerCase().replace(/[^a-z0-9]/g,''),amountsIncomplete:e.total===null||sum===null};
}
export function checkConfirmation(expected,value,input){
 const e=extraction(value),c=compareInvoice(expected,e);
 if(!e.rows.length||c.missing.length||c.duplicates.length||c.wrongCustomer.length||c.unclear.length||c.amountMismatch)throw new WashError('Resolve missing, duplicate, wrong customer, unclear rows and amount differences before confirming.',409);
 if(c.extras.some(r=>input.storeRows?.[r.id]!==true))throw new WashError('Confirm each extra row belongs to the store.');
 if(input.checked!==true)throw new WashError('Check the original invoice before confirming.');
 if((c.dateWarning||c.companyWarning||c.amountsIncomplete)&&!text(input.note||'',500))throw new WashError('Explain the company, date or incomplete amount details.');
 return {extracted:e,comparison:c,storeRows:Object.fromEntries(c.extras.map(r=>[r.id,true])),confirmationNote:text(input.note||'',500)};
}
