import {createHash} from 'node:crypto';
export class CallError extends Error{constructor(message,status=400){super(message);this.status=status;}}
export function callReference(collection,id){
 if(typeof collection!=='string'||!/^([a-zA-Z0-9_-]+_)?invoices$/.test(collection)||typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw new CallError('Invalid invoice reference.');
 return `${collection}/${id}`;
}
export function serviceInvoice(record){const data=record?.data;return !!data&&(data.documentType==='WASH'||data.mode==='wash'||data.mode==='repair');}
const text=(value,max)=>{if(value==null)return '';if(typeof value!=='string'||value.length>max)throw new CallError('Please shorten the call notes.');return value.trim();};
export function prepareCall(input,actor,at){
 if(!input||!['answered','no_answer'].includes(input.result))throw new CallError('Choose Answered or No answer.');
 if(typeof input.id!=='string'||!/^[a-zA-Z0-9_-]{16,100}$/.test(input.id))throw new CallError('Invalid call reference.');
 const pickupDate=input.result==='answered'?text(input.pickupDate,10):'',pickupTime=input.result==='answered'?text(input.pickupTime,5):'';
 if(pickupDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)||Number.isNaN(Date.parse(pickupDate+'T12:00:00Z'))||new Date(pickupDate+'T12:00:00Z').toISOString().slice(0,10)!==pickupDate))throw new CallError('Choose a valid pickup date.');
 if(pickupTime&&(!pickupDate||!/^([01]\d|2[0-3]):[0-5]\d$/.test(pickupTime)))throw new CallError('Choose a pickup date and valid time.');
 const outcome=input.result==='no_answer'?input.outcome:'';
 if(input.result==='no_answer'&&!['voicemail','message','none'].includes(outcome))throw new CallError('Choose whether you left a voicemail, sent a message, or left no message.');
 const entry={id:input.id,result:input.result,outcome,pickupDate,pickupTime,notes:text(input.notes,2000),calledBy:actor.name,calledByUid:actor.uid,calledAt:at};
 const fingerprint=createHash('sha256').update(JSON.stringify({...entry,calledAt:''})).digest('hex');
 return {...entry,fingerprint};
}
export function publicStaffCall(data){const {fingerprint,...entry}=data;return entry;}
/** Append-only subcollection keeps invoice edits and concurrent call attempts independent. */
export async function appendCall(db,{collection,id,input,actor,at}){
 const invoiceRef=db.doc(callReference(collection,id)),entry=prepareCall(input,actor,at),ref=invoiceRef.collection('customerCalls').doc(entry.id);
 return db.runTransaction(async tx=>{
  const invoice=await tx.get(invoiceRef),existing=await tx.get(ref);
  if(!invoice.exists)throw new CallError('Invoice not found.',404);
  if(!serviceInvoice(invoice.data()))throw new CallError('Call history is available for wash and repair invoices only.');
  if(existing.exists){if(existing.data().fingerprint!==entry.fingerprint)throw new CallError('This call reference was already used. Start a new call entry.',409);return publicStaffCall(existing.data());}
  tx.create(ref,entry);return publicStaffCall(entry);
 });
}
