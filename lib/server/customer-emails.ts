import 'server-only';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {FieldPath} from 'firebase-admin/firestore';
import {serverDb} from './firebase-admin';
import {receiptEmailError} from './receipt-email-error.mjs';
import {tokenHash,customerInvoice} from './invoice-share.mjs';
import {SHOP,EMAIL_KINDS,emailSource,customerEmailEvents,eventVersion,eventStillCurrent,renderCustomerEmail,nextEasternDate,easternDate} from '../customer-email.mjs';

export const EMAIL_SETTINGS='customer_email_control/settings';
const QUEUE='customer_email_outbox',STATE='customer_email_sources';
export const EMAIL_COLLECTIONS=['showroom_appointments','showroom_estimates','service_pickup_bookings','invoices','showroom_orders','showroom_live_orders'];
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export function emailConfiguration(){return {configured:!!process.env.EMAILJS_PRIVATE_KEY?.trim()&&!!(process.env.EMAILJS_TEMPLATE_CUSTOMER_MESSAGES?.trim()||process.env.EMAILJS_TEMPLATE_ORDER_RECEIPT?.trim()),templateId:process.env.EMAILJS_TEMPLATE_CUSTOMER_MESSAGES?.trim()||process.env.EMAILJS_TEMPLATE_ORDER_RECEIPT?.trim()||'',schedulerSecretSet:!!process.env.CRON_SECRET?.trim()};}
export async function emailSettings(){const s=(await serverDb().doc(EMAIL_SETTINGS).get()).data();return {enabled:false,enabledAt:0,lastTestAt:0,kinds:EMAIL_KINDS,...s};}
/** Source read, snapshot change, and queue creation are one Firestore transaction. */
export async function observeCustomerSource(collection:string,id:string){
 if(!EMAIL_COLLECTIONS.includes(collection)||!/^[A-Za-z0-9_-]{1,100}$/.test(id))return [] as string[];
 const db=serverDb(),control=await emailSettings();if(!control.enabled)return [] as string[];
 const path=collection+'/'+id,stateRef=db.doc(STATE+'/'+hash(path)),sourceRef=db.doc(path),now=Date.now();
 return db.runTransaction(async tx=>{
  const [source,prior]=await tx.getAll(sourceRef,stateRef);if(!source.exists)return [] as string[];
  const raw={...source.data(),id:source.id},current=emailSource(collection,raw),previous=prior.data()?.source;
  const revision=(prior.data()?.revision||0)+(JSON.stringify(current)!==JSON.stringify(previous)?1:0);
  const events=customerEmailEvents(current,previous,control.enabledAt,now).filter((e:any)=>control.kinds.includes(e.kind));
  const pending=events.map((e:any)=>{const version=eventVersion(e,current),dedup=e.kind.endsWith('_reminder')?version:String(revision)+':'+version;return {...e,version,id:hash(path+':'+e.kind+':'+dedup),sourcePath:path,createdAt:now,status:'pending',attempts:0};});
  const existing=pending.length?await tx.getAll(...pending.map((e:any)=>db.doc(QUEUE+'/'+e.id))):[];
  tx.set(stateRef,{source:current,revision,observedAt:now});
  const ids:string[]=[];pending.forEach((e:any,i:number)=>{if(!existing[i].exists){tx.create(db.doc(QUEUE+'/'+e.id),e);ids.push(e.id);}});
  return ids;
 });
}
async function invoiceButton(id:string){
 const db=serverDb(),invoice=(await db.doc('invoices/'+id).get()).data();if(!invoice||invoice.data?.isDraft)throw Error('INVALID_INVOICE');
 customerInvoice(invoice.data);const token=randomBytes(32).toString('hex');
 await db.doc('invoice_customer_links/'+tokenHash(token)).create({invoiceId:id,expiresAt:Date.now()+90*86400000,createdAt:new Date().toISOString(),createdBy:'customer-email-worker'});
 return {label:'View your invoice',url:SHOP.url+'/public/invoice?token='+token};
}
/** Provider acceptance is not inbox delivery. Unknown results are held for review. */
export async function deliverCustomerEmail(id:string,force=false){
 const db=serverDb(),ref=db.doc(QUEUE+'/'+id),control=await emailSettings();
 if(!control.enabled&&!force)return 'paused';
 if(!emailConfiguration().configured)return 'not_configured';
 const lease=randomUUID(),now=Date.now();
 const event=await db.runTransaction(async tx=>{
  const s=await tx.get(ref),e=s.data();if(!e)return null;
  if(e.status==='sending'){
   if(now-e.attemptAt>120000)tx.update(ref,{status:'uncertain',error:'The previous send did not finish recording its result. Check the provider before resending.',updatedAt:now});
   return null;
  }
  if(!(e.status==='pending'||force&&['failed','uncertain','not_configured'].includes(e.status)))return null;
  if(!force&&(!control.enabled||!control.kinds.includes(e.kind)))return null;
  // Serialize account sends and respect EmailJS's per-second limit across all workers.
  const rateRef=db.doc('customer_email_control/send_rate'),rate=(await tx.get(rateRef)).data();
  if(now-(rate?.at||0)<1100)return null;
  tx.set(rateRef,{at:now});tx.update(ref,{status:'sending',lease,attemptAt:now,attempts:(e.attempts||0)+1,updatedAt:now});return e;
 });
 if(!event)return 'skipped';
 let status='failed',error='';
 try{
  const raw=(await db.doc(event.sourcePath).get()).data();
  const current=raw?emailSource(event.sourcePath.split('/')[0],{...raw,id:event.sourcePath.split('/')[1]}):null;
  if(!current||!eventStillCurrent(event,current)){status='superseded';}
  else{
   const kind=event.kind,path=event.sourcePath,button=path.startsWith('invoices/')?await invoiceButton(path.split('/')[1]):kind.startsWith('order_')||kind==='refund_confirmation'?{label:'View your order',url:SHOP.url+'/?view=track&track='+encodeURIComponent(current.reference)}:{label:'Visit Marco Polo',url:SHOP.url};
   const result=await sendSharedEmail(event.to,event.title,renderCustomerEmail({title:String(event.title),name:String(event.name||''),intro:String(event.intro),details:event.details||[],paragraphs:event.paragraphs||[],button}));status=result.status;error=result.error;
  }
 }catch{status='failed';error='Email could not be prepared. Check the saved customer record and retry.';}
 await db.runTransaction(async tx=>{const s=await tx.get(ref);if(s.data()?.lease===lease)tx.update(ref,{status,error,updatedAt:Date.now(),...(status==='accepted'?{acceptedAt:Date.now()}:{} )});});
 return status;
}
export async function sendSharedEmail(to:string,subject:string,message:string){
 if(!emailConfiguration().configured)return {status:'not_configured',error:'Set the server email key and a shared HTML template.'};
 try{
  const response=await fetch('https://api.emailjs.com/api/v1.0/email/send',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(10000),body:JSON.stringify({service_id:process.env.EMAILJS_SERVICE_ID?.trim()||'marcopolo2',template_id:emailConfiguration().templateId,user_id:process.env.EMAILJS_PUBLIC_KEY?.trim()||'Anj9zrEUo-VEWvMVw',accessToken:process.env.EMAILJS_PRIVATE_KEY!.trim(),template_params:{to_email:to,subject,message,from_name:SHOP.name,reply_to:SHOP.email}})});
  if(response.ok)return {status:'accepted',error:''};
  return {status:'failed',error:receiptEmailError(response.status,(await response.text()).slice(0,4000))};
 }catch{return {status:'uncertain',error:'The provider response was not received. Check EmailJS history before resending to avoid a duplicate.'};}
}
export async function notifyCustomerSource(collection:string,id:string){
 // An email failure must never undo a saved booking, invoice, shipping status, or refund.
 try{const ids=await observeCustomerSource(collection,id);if(ids[0])await deliverCustomerEmail(ids[0]);}catch{console.error('Customer email event could not be processed');}
}
export async function baselineCustomerSource(collection:string,id:string){try{await observeCustomerSource(collection,id);}catch{console.error('Customer email snapshot could not be recorded');}}
/** Paginated sweeps recover events if a browser closes after saving. */
export async function runCustomerEmailWorker(){
 const db=serverDb(),start=Date.now(),lease=randomUUID(),workerRef=db.doc('customer_email_control/worker');
 const claimed=await db.runTransaction(async tx=>{const w=(await tx.get(workerRef)).data();if(w?.leaseUntil>start)return false;tx.set(workerRef,{lease,leaseUntil:start+65000,startedAt:start},{merge:true});return true;});
 if(!claimed)return {busy:true};
 let scanned=0,accepted=0,processed=0;
 try{
  const control=await emailSettings();if(!control.enabled)return {paused:true};
  const collections=EMAIL_COLLECTIONS;
  for(const c of collections){
   if(Date.now()-start>22000)break;
   const cursorRef=db.doc('customer_email_scan_cursors/'+c),cursor=(await cursorRef.get()).data()?.after||'';
   let q=db.collection(c).orderBy(FieldPath.documentId()).limit(30);if(cursor)q=q.startAfter(cursor);
   const page=await q.get();
   for(const record of page.docs){await observeCustomerSource(c,record.id);scanned++;}
   await cursorRef.set({after:page.size===30?page.docs.at(-1)!.id:'',updatedAt:Date.now()});
  }
  // Upcoming reservations are read independently of the historical sweep cursor.
  for(const c of ['showroom_appointments','service_pickup_bookings']){
   if(Date.now()-start>32000)break;
   const day=nextEasternDate();const page=await db.collection(c).where('date','==',day).limit(501).get();
   if(page.size>500)throw Error('REMINDER_BATCH_TOO_LARGE');
   for(const record of page.docs)await observeCustomerSource(c,record.id);
  }
  const pending=await db.collection(QUEUE).where('status','==','pending').limit(100).get();
  const sorted=pending.docs.sort((a,b)=>a.data().createdAt-b.data().createdAt);
  for(const e of sorted){if(Date.now()-start>47000||processed>=25)break;const result=await deliverCustomerEmail(e.id);if(result==='accepted')accepted++;processed++;await new Promise(r=>setTimeout(r,1100));}
  const sending=await db.collection(QUEUE).where('status','==','sending').limit(30).get();
  for(const e of sending)if(Date.now()-e.data().attemptAt>120000)await deliverCustomerEmail(e.id);
  await workerRef.set({lastCompletedAt:Date.now(),scanned,accepted,processed,error:''},{merge:true});return {scanned,accepted,processed};
 }catch{await workerRef.set({error:'Processing did not finish. Saved email events are retained; check configuration and run again.',lastFailedAt:Date.now()},{merge:true});throw Error('EMAIL_WORKER_FAILED');}
 finally{await db.runTransaction(async tx=>{const w=await tx.get(workerRef);if(w.data()?.lease===lease)tx.update(workerRef,{leaseUntil:0});});}
}
