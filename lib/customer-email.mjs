// One shared, email-client-friendly design. Customer text is always escaped.
import {shipmentCarrierName} from './shipment-tracking.mjs';
import {emailDetailRows} from './customer-email-queue.mjs';
export const SHOP = {name:'Marco Polo Oriental Rugs',phone:'(703) 461-0207',address:'3260 Duke Street, Alexandria, VA 22314',email:'marcopolorugs@aol.com',url:'https://www.marcopolorugs.com',hours:'Daily, 10:00 AM–6:00 PM'};
// Reuse the business profile target from the existing order notification emails.
export const GOOGLE_REVIEW_URL = "https://www.google.com/search?gs_ssp=eJzj4tZP1zcsycjNKS8sMGC0UjWosLBMMk8yMkkzTUpMtkhMNrQyqDBLSrI0TkxMNk40NjUxMEz0kshNLErOVyjIz8lXyC_KTM0rScxRKCpNLwYAs7cZHQ&q=marco+polo+oriental+rugs";
export const EMAIL_KINDS = ['appointment_request','appointment_confirmation','appointment_update','appointment_cancellation','appointment_reminder','estimate_received','pickup_confirmation','pickup_update','pickup_cancellation','pickup_reminder','service_received','service_ready','order_shipped','order_delivered','refund_confirmation'];
export const escapeEmail = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const validEmail = value => typeof value==='string' && value.length<=254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export function safeEmailUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&['www.marcopolorugs.com','marcopolorugs.com'].includes(u.hostname)?u.href:'';}catch{return '';}}
/** @param {{title:string,name?:string,intro:string,details?:any[],paragraphs?:string[],button?:any}} message */
export function renderCustomerEmail({title,name='',intro,details=[],paragraphs=[],button=null}){
 details=emailDetailRows(details);
 const e=escapeEmail,url=safeEmailUrl(button?.url),rows=details.filter(r=>r[1]!==''&&r[1]!==null&&r[1]!==undefined).map(([label,value])=>`<tr><td style="padding:12px 14px;border-bottom:1px solid #dde5df;color:#52635a;font-size:13px;width:34%;vertical-align:top">${e(label)}</td><td style="padding:12px 14px;border-bottom:1px solid #dde5df;color:#183d32;font-size:15px;white-space:pre-line;overflow-wrap:anywhere">${e(value)}</td></tr>`).join('');
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(title)}</title></head><body style="margin:0;padding:0;background:#f3f5f1;color:#263c33;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${e(intro)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #dde5df;border-radius:18px;overflow:hidden"><tr><td style="padding:30px 28px;background:#183d32;color:#fff"><p style="margin:0 0 8px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#d3e5da">Since 1988 · Alexandria, Virginia</p><p style="margin:0;font-family:Georgia,serif;font-size:29px">Marco Polo</p><p style="margin:6px 0 0;font-size:13px;color:#e0ece4">Oriental Rugs · Cleaning &amp; Restoration</p></td></tr><tr><td style="padding:30px 28px"><h1 style="margin:0 0 20px;font-family:Georgia,serif;font-weight:normal;font-size:27px;color:#183d32">${e(title)}</h1><p style="margin:0 0 14px;font-size:16px;line-height:1.7">Hello${name?' '+e(name):''},</p><p style="font-size:15px;line-height:1.8;margin:0 0 22px">${e(intro)}</p>${rows?`<table width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #dde5df;border-radius:10px;background:#f5f7f2;margin:0 0 22px">${rows}</table>`:''}${paragraphs.map(p=>`<p style="margin:0 0 16px;font-size:14px;line-height:1.8;white-space:pre-line">${e(p)}</p>`).join('')}${url?`<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0"><tr><td style="background:#183d32;border-radius:9px"><a href="${e(url)}" style="display:inline-block;padding:15px 24px;color:white;text-decoration:none;font-size:14px;font-weight:bold">${e(button.label||'View details')}</a></td></tr></table><p style="font-size:11px;line-height:1.6;color:#52635a;overflow-wrap:anywhere">Button not working? Open ${e(url)}</p>`:''}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0 0;border:1px solid #dde5df;border-radius:12px;background:#f3f6f1"><tr><td style="padding:22px;text-align:center"><h2 style="margin:0 0 10px;font-family:Georgia,serif;font-size:21px;font-weight:normal;color:#183d32">Share your experience</h2><p style="margin:0 0 18px;font-size:14px;line-height:1.8;color:#52635a">Your feedback helps our team and other customers. You are welcome to leave an honest review on our Google profile.</p><table role="presentation" cellspacing="0" cellpadding="0" align="center"><tr><td style="background:#183d32;border-radius:9px"><a href="${e(GOOGLE_REVIEW_URL)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 22px;color:#fff;text-decoration:none;font-size:14px;font-weight:bold">Leave a Google review</a></td></tr></table><p style="margin:14px 0 0;font-size:12px;line-height:1.7;color:#52635a">You can also <a href="${e(GOOGLE_REVIEW_URL)}" target="_blank" rel="noopener noreferrer" style="color:#183d32;text-decoration:underline">open our Google profile here</a>.</p></td></tr></table><p style="margin:24px 0 0;font-size:14px;line-height:1.8">Thank you for choosing Marco Polo.<br><strong>The Marco Polo Team</strong></p></td></tr><tr><td style="padding:22px 28px;background:#edf3ee;border-top:1px solid #dde5df;font-size:12px;line-height:1.9;color:#52635a"><strong style="color:#183d32">${e(SHOP.name)}</strong><br>${e(SHOP.address)}<br><a href="tel:+17034610207" style="color:#183d32">${e(SHOP.phone)}</a> · <a href="mailto:${e(SHOP.email)}" style="color:#183d32">${e(SHOP.email)}</a><br>${e(SHOP.hours)}<br>Questions or changes? Reply to this email or call us.<br><a href="${SHOP.url}" style="color:#183d32">marcopolorugs.com</a></td></tr></table></td></tr></table></body></html>`;
}
export function timestampMillis(v){if(v?.toMillis)return v.toMillis();if(v?.seconds!==undefined)return v.seconds*1000;if(typeof v==='number')return v;const t=Date.parse(v||'');return Number.isFinite(t)?t:0;}
export function easternDate(now=Date.now()){const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));return ['year','month','day'].map(k=>p.find(x=>x.type===k).value).join('-');}
export function nextEasternDate(now=Date.now()){return new Date(Date.parse(easternDate(now)+'T12:00:00Z')+86400000).toISOString().slice(0,10);}
export function appointmentMillis(date,time){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time||''))return 0;
 const wall=Date.parse(date+'T'+time+':00Z');if(!Number.isFinite(wall))return 0;let candidate=wall;
 const f=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const parts=t=>Object.fromEntries(f.formatToParts(new Date(t)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 for(let i=0;i<3;i++){const p=parts(candidate);const shown=Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`);candidate+=wall-shown;}
 const p=parts(candidate);return `${p.year}-${p.month}-${p.day}`===date&&`${p.hour}:${p.minute}`===time?candidate:0;
}
export function formatAppointment(date,time){const t=appointmentMillis(date,time);return t?new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'long',month:'long',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(t)):`${date||''} ${time||''}`.trim();}
export function normalizeAppointmentTime(value){const s=String(value||'').trim(),m=s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);if(!m)return s;if(Number(m[1])<1||Number(m[1])>12||Number(m[2])>59)return '';const h=Number(m[1])%12+(m[3].toUpperCase()==='PM'?12:0);return String(h).padStart(2,'0')+':'+m[2];}
const currency=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(cents||0)/100);
/** A compact snapshot excludes card data, photos, and internal notes. */
export function emailSource(collection,record){
 const invoice=collection==='invoices',d=invoice?record.data||record:record,c=invoice?d.soldTo:record.customerInfo||record;
 const source={collection,name:String(c?.name||''),email:String(c?.email||'').trim(),status:String(d.status||''),createdAt:timestampMillis(record.createdAt),date:String(d.date||''),time:normalizeAppointmentTime(d.slotTime||d.time||''),manager:String(d.manager||d.assignedTo||''),service:String(d.service||''),address:invoice?SHOP.address:collection==='service_pickup_bookings'?[d.address,d.city,d.state,d.zip].filter(Boolean).join(', '):SHOP.address,reference:String(d.invoiceNumber||record.orderNumber||record.id||''),delivery:String(record.deliveryOption||''),rugCount:Number(d.rugCount||d.rugs?.length||d.items?.length||0)};
 if(invoice){source.service=['WASH','REPAIR'].includes(d.documentType)||['wash','repair'].includes(d.mode)?'Cleaning / repair':'';source.rugs=(d.items||[]).map(i=>[i.sku,i.description].filter(Boolean).join(' · ')).slice(0,100).join('\n');source.draft=d.isDraft===true;}
 if(collection==='showroom_estimates'){source.service=(d.rugs||[d]).map(r=>[r.service,r.rugType,r.dimensions].filter(Boolean).join(' · ')).slice(0,20).join('\n');source.preference=String(d.pickupPreference||'');source.requestedDate=String(d.appointmentDate||'');}
 if(collection==='showroom_orders'||collection==='showroom_live_orders'){source.tracking=String(record.shippingDetails?.trackingNumber||record.trackingNumber||'');source.carrier=shipmentCarrierName(record.shippingDetails?.carrier||record.carrier||'',source.tracking,record.shippingDetails?.trackingUrl||'');source.paid=record.paymentStatus==='Paid';source.refundedAmount=Number(record.refundedAmount||0);source.liveManaged=record.liveManaged===true;source.receiptSent=record.receiptEmailStatus==='sent';}
 return source;
}
/** Events describe transitions, rather than repeatedly emailing the current status. */
export function customerEmailEvents(current,previous,enabledAt,now=Date.now()){
 if(!validEmail(current.email)||current.draft)return [];
 const c=current.collection,events=[],fresh=!previous&&current.createdAt>=enabledAt,changed=previous&&JSON.stringify(current)!==JSON.stringify(previous);
 const add=(kind,title,intro,details=[],paragraphs=[])=>events.push({kind,title,name:current.name,to:current.email,intro,details,paragraphs});
 const visit=[['When',formatAppointment(current.date,current.time)],['With',current.manager],['Location',current.address],['Phone',SHOP.phone]];
 if(c==='showroom_appointments'){
  if(fresh&&current.status==='pending')add('appointment_request','Your appointment request is received','Thank you. We have received your appointment request. It is pending staff confirmation.',visit,['We will email you again when your appointment is confirmed.']);
  if((fresh||changed)&&current.status==='confirmed'&&(!previous||previous.status!=='confirmed'))add('appointment_confirmation','Your appointment is confirmed','We look forward to welcoming you to the showroom.',visit);
  else if(changed&&['rejected','cancelled'].includes(current.status)&&previous.status!==current.status)add('appointment_cancellation','Appointment update','This appointment is no longer scheduled. Please contact us if you would like to arrange another visit.',visit);
  else if(changed&&current.status==='confirmed'&&['date','time','manager'].some(k=>current[k]!==previous[k]))add('appointment_update','Your appointment details changed','Please use the updated appointment details below.',visit);
  if(current.status==='confirmed'&&current.date===nextEasternDate(now)&&appointmentMillis(current.date,current.time)>now)add('appointment_reminder','A reminder for your appointment tomorrow','We look forward to seeing you tomorrow.',visit);
 }
 if(c==='service_pickup_bookings'){
  const details=[['Pickup',formatAppointment(current.date,current.time)],['Pickup address',current.address],['Service',current.service.replaceAll('_',' ')],['Estimated rugs',current.rugCount||''],['Team member',current.manager]];
  if(fresh&&current.status==='scheduled')add('pickup_confirmation','Your rug pickup is scheduled','Our team has scheduled your rug pickup.',details,['Please have your rugs accessible. Call us if your address or plans change.']);
  else if(changed&&current.status==='cancelled'&&previous.status!=='cancelled')add('pickup_cancellation','Your pickup was canceled','This rug pickup is no longer scheduled. Contact us to arrange another date.',details);
  else if(changed&&current.status==='scheduled'&&(previous.status!=='scheduled'||['date','time','address','service'].some(k=>previous[k]!==current[k])))add('pickup_update','Your pickup details changed','Please use these updated pickup details.',details);
  if(current.status==='scheduled'&&current.date===nextEasternDate(now)&&appointmentMillis(current.date,current.time)>now)add('pickup_reminder','Your rug pickup is tomorrow','Here is a reminder of your scheduled rug pickup.',details);
 }
 if(c==='showroom_estimates'&&fresh)add('estimate_received','We received your rug estimate request','Our team will review your rug details and contact you. This is a request acknowledgment, not a confirmed price or pickup appointment.',[['Rugs',current.rugCount||1],['Services and sizes',current.service],['Preference',current.preference],['Requested date',current.requestedDate]]);
 if(c==='invoices'&&current.service){
  const details=[['Invoice',current.reference],['Rugs',current.rugs],['Showroom',SHOP.address],['Hours',SHOP.hours]];
  if(fresh&&['washing','repairing'].includes(current.status))add('service_received','Your rugs are in our care','We have recorded your rugs for cleaning or repair. You can review your invoice below.',details);
  if(changed&&previous.status!=='ready'&&current.status==='ready')add('service_ready','Your rugs are ready for pickup','Your rugs have completed their service and are ready for collection at our showroom.',details,['Please review your invoice for any remaining balance. Full payment is required before collection.']);
 }
 if(c==='showroom_orders'){
  const details=[['Order',current.reference],['Carrier',current.carrier],['Tracking number',current.tracking]];
  if(changed&&current.status==='Shipped'&&current.tracking&&(previous.status!=='Shipped'||previous.tracking!==current.tracking))add('order_shipped','Your order has shipped','Your rug is on its way. Open your order tracking page for the exact carrier link and the available shipping updates.',details);
  if(changed&&current.status==='Delivered'&&previous.status!=='Delivered')add('order_delivered','Your order was marked delivered','The shipping record for your order has been marked delivered. Please contact us if you have not received it.',details);
 }
 if(c==='showroom_live_orders'){
  // Mirror fulfillment is handled by showroom_orders; refunds only use verified live records.
  if(changed&&current.paid&&current.refundedAmount>Number(previous.refundedAmount||0))add('refund_confirmation','Your refund has been processed','Your payment provider has confirmed this refund. Your bank controls when the funds appear in your account.',[['Order',current.reference],['This refund',currency(current.refundedAmount-Number(previous.refundedAmount||0))],['Total refunded',currency(current.refundedAmount)]]);
 }
 return events;
}
export function eventVersion(event,source){
 if(event.kind.endsWith('_reminder'))return `${source.date}:${source.time}:${source.manager}:${source.address}`;
 if(event.kind==='refund_confirmation')return String(source.refundedAmount);
 if(event.kind==='order_shipped')return source.tracking;
 return JSON.stringify([event.kind,source.status,source.date,source.time,source.manager,source.address,source.email]);
}
export function eventStillCurrent(event,current,now=Date.now()){
 if(!current||current.email!==event.to||current.draft)return false;
 const k=event.kind;
 if(k.startsWith('appointment_')){if(k==='appointment_request')return current.status==='pending';if(k==='appointment_cancellation')return ['rejected','cancelled'].includes(current.status);return current.status==='confirmed'&&event.version===eventVersion(event,current)&&(k!=='appointment_reminder'||current.date===nextEasternDate(now)&&appointmentMillis(current.date,current.time)>now);}
 if(k.startsWith('pickup_'))return (k==='pickup_cancellation'?current.status==='cancelled':current.status==='scheduled')&&event.version===eventVersion(event,current)&&(k!=='pickup_reminder'||current.date===nextEasternDate(now)&&appointmentMillis(current.date,current.time)>now);
 if(k==='service_ready')return current.status==='ready';
 if(k==='service_received')return ['washing','repairing'].includes(current.status);
 if(k==='order_shipped')return ['Shipped','Delivered'].includes(current.status)&&current.tracking===event.version;
 if(k==='order_delivered')return current.status==='Delivered';
 if(k==='refund_confirmation')return current.paid&&current.refundedAmount>=Number(event.version);
 return true;
}
