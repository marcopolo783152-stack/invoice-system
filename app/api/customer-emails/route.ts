import {NextResponse} from 'next/server';
import {caller,serverDb} from '@/lib/server/firebase-admin';
import {requireStaff} from '@/lib/server/staff-permission';
import {EMAIL_SETTINGS,EMAIL_COLLECTIONS,emailSettings,emailConfiguration,observeCustomerSource,deliverCustomerEmail,runCustomerEmailWorker,sendSharedEmail} from '@/lib/server/customer-emails';
import {EMAIL_KINDS,SHOP,renderCustomerEmail} from '@/lib/customer-email.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
const response=(data:any,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request:Request){
 try{await requireStaff(request,'settings','read');const db=serverDb(),settings=await emailSettings();const logs=await db.collection('customer_email_outbox').orderBy('createdAt','desc').limit(100).get(),worker=(await db.doc('customer_email_control/worker').get()).data();return response({settings,configuration:emailConfiguration(),worker:{lastCompletedAt:worker?.lastCompletedAt||0,error:worker?.error||''},history:logs.docs.map(d=>{const e=d.data();return {id:d.id,title:e.title,to:e.to,kind:e.kind,status:e.status,attempts:e.attempts||0,createdAt:e.createdAt,updatedAt:e.updatedAt||0,error:e.error||''};})});}
 catch{return response({error:'Owner or email-management permission required.'},403);}
}
export async function POST(request:Request){
 try{
  if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return response({error:'Use the showroom website.'},403);
  const raw=await request.text();if(raw.length>4000)return response({error:'Request too large.'},413);const b=JSON.parse(raw),db=serverDb();
  if(b.action==='event'||b.action==='observe'){
   if(!EMAIL_COLLECTIONS.includes(b.collection)||typeof b.id!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(b.id))return response({error:'Invalid customer event.'},400);
   const user=await caller(request),saved=(await db.doc(b.collection+'/'+b.id).get()).data();if(!saved)return response({error:'Saved record not found.'},404);
   const section=({'showroom_appointments':'appointments','showroom_estimates':'services','service_pickup_bookings':'appointments','invoices':'invoices','showroom_orders':'orders','showroom_live_orders':'orders'} as Record<string,string>)[b.collection];
   const owned=['showroom_appointments','showroom_estimates'].includes(b.collection)&&saved.ownerUid===user.uid;
   if(!owned)await requireStaff(request,section,'write');
   const rateRef=db.doc('customer_email_event_limits/'+user.uid),now=Date.now();
   const allowed=await db.runTransaction(async tx=>{const p=(await tx.get(rateRef)).data(),active=p&&now-p.at<60000;if(active&&p.count>=30)return false;tx.set(rateRef,{at:active?p.at:now,count:active?p.count+1:1});return true;});
   if(!allowed)return response({error:'Please wait before retrying.'},429);
   const ids=await observeCustomerSource(b.collection,b.id);if(b.action==='event'&&ids[0])await deliverCustomerEmail(ids[0]);return response({queued:ids.length});
  }
  const staff=await requireStaff(request,'settings','write');
  if(b.action==='test'){
   // The test recipient is always the authenticated manager, never supplied by a browser.
   const ref=db.doc('customer_email_control/test'),now=Date.now();
   const allowed=await db.runTransaction(async tx=>{const d=(await tx.get(ref)).data();if(now-(d?.at||0)<60000)return false;tx.set(ref,{at:now});return true;});if(!allowed)return response({error:'Wait one minute before another test.'},429);
   const result=await sendSharedEmail(staff.email!,'Marco Polo — preview of your customer email',renderCustomerEmail({title:'Your appointment is confirmed',name:'Marco Polo team',intro:'This is a preview only. No appointment was created and no customer was emailed.',details:[['Appointment','Example: Friday at 11:00 AM, Alexandria time'],['With','Your showroom team'],['Location',SHOP.address],['Phone',SHOP.phone]],button:{label:'Visit our website',url:SHOP.url}}));
   if(result.status==='accepted')await db.doc(EMAIL_SETTINGS).set({lastTestAt:now,lastTestBy:staff.uid},{merge:true});
   return response(result,result.status==='accepted'?200:503);
  }
  if(b.action==='configure'){
   if(typeof b.enabled!=='boolean'||!Array.isArray(b.kinds)||b.kinds.some((k:any)=>!EMAIL_KINDS.includes(k)))return response({error:'Invalid email settings.'},400);
   const current=await emailSettings();if(b.enabled&&(!emailConfiguration().configured||!current.lastTestAt))return response({error:'Send and check the test email before enabling automatic customer emails.'},409);
   if(b.enabled){const config=(await db.doc('settings/global_config').get()).data()?.emailConfig;if(config&&(config.serviceId!==(process.env.EMAILJS_SERVICE_ID?.trim()||'marcopolo2')||config.publicKey!==(process.env.EMAILJS_PUBLIC_KEY?.trim()||'Anj9zrEUo-VEWvMVw')))return response({error:'Use the same EmailJS Service ID and Public Key in Vercel as your existing Invoice Settings before sharing one template.'},409);await db.doc('settings/global_config').set({emailConfig:{templateIdShared:emailConfiguration().templateId}},{merge:true});}
   await db.doc(EMAIL_SETTINGS).set({enabled:b.enabled,kinds:[...new Set(b.kinds)],enabledAt:b.enabled&&!current.enabled?Date.now():current.enabledAt,updatedAt:Date.now(),updatedBy:staff.uid},{merge:true});return response({success:true});
  }
  if(b.action==='run')return response(await runCustomerEmailWorker());
  if(b.action==='retry'){
   if(typeof b.id!=='string'||!/^[a-f0-9]{64}$/.test(b.id))return response({error:'Invalid email.'},400);
   const current=await emailSettings();if(!current.enabled)return response({error:'Automatic emails are paused.'},409);
   const status=await deliverCustomerEmail(b.id,true);return response({status});
  }
  return response({error:'Unknown action.'},400);
 }catch{return response({error:'Email operation could not complete. Check your permissions and email configuration.'},503);}
}
