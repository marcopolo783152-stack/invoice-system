import {estimateRugs} from './service-estimate.mjs';
export const workflowSections=[['new','New requests'],['contacting','Contacting / No answer'],['dropoff','Bringing to showroom'],['pickup','Pickup requested'],['scheduled','Pickup scheduled'],['thinking','Thinking about it'],['hold','On hold / Waiting'],['declined','Declined'],['invoiced','Converted to invoice'],['service','In service / Ready'],['closed','Completed / Closed'],['all','All requests']].map(([id,label])=>({id,label}));
export const workflowStatuses=['New','Contacted','No Answer','Estimate Provided','Bringing to Showroom','Pickup Requested','Pickup Scheduled','Thinking About It','On Hold','Declined','In Service','Ready','Delivered','Completed','Closed','Cancelled'];
export function workflowBucket(e){if(e.invoiceId||e.status==='Converted to Invoice')return 'invoiced';return ({New:'new',Contacted:'contacting','No Answer':'contacting','Estimate Provided':'contacting','Bringing to Showroom':'dropoff','Pickup Requested':'pickup','Pickup Scheduled':'scheduled','Thinking About It':'thinking','On Hold':'hold',Declined:'declined','In Service':'service',Ready:'service',Delivered:'closed',Completed:'closed',Closed:'closed',Cancelled:'closed'})[e.status||'New']||'contacting';}
export function workflowCounts(records){const counts=Object.fromEntries(workflowSections.map(s=>[s.id,0]));for(const e of records){counts[workflowBucket(e)]++;counts.all++;}return counts;}
export function localDay(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function validDay(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;const d=new Date(value+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;}
export function cleanContact(e){return Object.fromEntries(['name','phone','email','address','city','state','zip'].map(k=>[k,String(e[k]||'').trim()]));}
export const normalizedPhone=v=>{let n=String(v||'').replace(/\D/g,'');if(n.length===11&&n[0]==='1')n=n.slice(1);return n;};
export const normalizedEmail=v=>String(v||'').trim().toLowerCase();
export function customerMatches(c,e){return (!!normalizedEmail(e.email)&&normalizedEmail(c.email)===normalizedEmail(e.email))||(normalizedPhone(e.phone).length>=7&&normalizedPhone(c.phone)===normalizedPhone(e.phone));}
export function exactCustomer(c,e){return !!normalizedEmail(e.email)&&normalizedPhone(e.phone).length>=7&&normalizedEmail(c.email)===normalizedEmail(e.email)&&normalizedPhone(c.phone)===normalizedPhone(e.phone);}
export function workflowFields(input,allowScheduled=false){
 const status=input.status;if(!workflowStatuses.includes(status))throw Error('Choose a valid request outcome.');
 const notes=String(input.notes||'').trim();if(notes.length>4000)throw Error('Please shorten the notes.');
 const method=String(input.method||'Other'),result=String(input.result||'Not contacted');
 if(!['Phone','Email','Text message','In person','Other'].includes(method)||!['Answered','No answer','Voicemail left','Message sent','Not contacted'].includes(result))throw Error('Choose the contact method and result.');
 const followUpDate=String(input.followUpDate||'');if(followUpDate&&!validDay(followUpDate))throw Error('Choose a valid follow-up date.');
 if((['Thinking About It','On Hold','No Answer'].includes(status)||['No answer','Voicemail left'].includes(result))&&!followUpDate)throw Error('Set a follow-up date so this customer is not forgotten.');
 if(['On Hold','Declined'].includes(status)&&!notes)throw Error('Record the reason in your notes.');
 const dropoffDate=status==='Bringing to Showroom'?String(input.dropoffDate||''):'',dropoffTime=status==='Bringing to Showroom'?String(input.dropoffTime||''):'';
 if(status==='Bringing to Showroom'&&(!validDay(dropoffDate)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(dropoffTime)))throw Error('Record the expected showroom date and time.');
 if(status==='Pickup Scheduled'&&!allowScheduled)throw Error('Use Schedule pickup to confirm the address, date and employee.');
 const estimateAmount=String(input.estimateAmount||'').trim();if(estimateAmount&&!/^\d{1,7}(\.\d{1,2})?$/.test(estimateAmount))throw Error('Enter a valid estimate amount with up to two decimal places.');
 return {status,notes,method,result,followUpDate:['Delivered','Completed','Closed','Cancelled','Declined'].includes(status)?'':followUpDate,dropoffDate,dropoffTime,estimateAmount};
}
export function estimatePrefill(e){
 const rugs=estimateRugs(e);return {documentType:'WASH',mode:'wash',soldTo:cleanContact(e),sourceEstimateId:e.id,sourceEstimateVersion:e.workflowVersion||0,items:rugs.map((r,i)=>({id:'estimate-rug-'+(i+1),sku:'',description:[r.service,r.rugType,r.dimensions,r.description].filter(Boolean).join(' · '),shape:'rectangle',widthFeet:Number(r.widthFeet)||0,widthInches:Number(r.widthInches)||0,lengthFeet:Number(r.lengthFeet)||0,lengthInches:Number(r.lengthInches)||0,pricingMethod:'piece',fixedPrice:0,images:(r.images||[]).slice(0,5),serviceType:{wash:/clean|wash|stain|odor/i.test(r.service||''),repair:/repair|fringe|binding/i.test(r.service||'')}})),notes:['Estimate request: '+e.id,'Requested arrangement: '+(e.pickupPreference||'Not specified'),e.estimateAmount?'Indicative estimate: $'+e.estimateAmount+' — confirm pricing before saving.':'',e.notes].filter(Boolean).join('\n')};
}
export function estimateReminders(records,day=localDay()){
 const active=records.filter(e=>!e.invoiceId&&!['Declined','Completed','Closed','Cancelled','Delivered'].includes(e.status));
 return {overdue:active.filter(e=>e.followUpDate&&e.followUpDate<day),today:active.filter(e=>e.followUpDate===day),dropoffs:active.filter(e=>e.status==='Bringing to Showroom').sort((a,b)=>(a.dropoffDate+a.dropoffTime).localeCompare(b.dropoffDate+b.dropoffTime)),pickup:active.filter(e=>e.status==='Pickup Requested')};
}
