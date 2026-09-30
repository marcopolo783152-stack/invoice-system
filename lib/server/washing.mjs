import {createHash} from 'node:crypto';
export class WashError extends Error { constructor(message,status=400){super(message);this.status=status;} }
export function text(value,max=500){if(typeof value!=='string'||value.length>max)throw new WashError('Please shorten the text and try again.');return value.trim();}
export function date(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T12:00:00Z'))||new Date(value+'T12:00:00Z').toISOString().slice(0,10)!==value)throw new WashError('Choose a valid calendar date.');return value;}
export function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function tokenHash(token){if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw new WashError('This company link is invalid or disabled.',401);return createHash('sha256').update(token).digest('hex');}
export function schedule(input){const sentDate=date(input.sentDate),dueDate=date(input.dueDate),pickupDate=input.pickupDate?date(input.pickupDate):'';if(dueDate<sentDate)throw new WashError('Return date must be on or after the handoff date.');if(pickupDate&&dueDate>pickupDate)throw new WashError('Return date must be before the customer pickup date.');return {sentDate,dueDate,pickupDate};}
export function skuKey(sku){return sku.toUpperCase().replace(/^MPW0+(?=\d)/,'MPW');}
export function photo(value){return typeof value==='string'&&value.length<=250000&&(/^(https:\/\/)/.test(value)||/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(value))?value:'';}
export function invoiceRug(record,itemId){const data=record.data||record;if(data.documentType!=='WASH'&&data.mode!=='wash')throw new WashError('Select a wash invoice.');const item=data.items?.find(i=>i.id===itemId);if(!item||!/^MPW\d+$/i.test(item.sku||''))throw new WashError('This rug needs an MPW number on its saved wash invoice.');if(data.status==='picked_up')throw new WashError('This rug has already been collected by the customer.');return {sku:item.sku.toUpperCase(),description:text(item.description||'Rug',300),size:`${item.widthFeet||0}′ ${item.widthInches||0}″ × ${item.lengthFeet||0}′ ${item.lengthInches||0}″`,photo:photo(item.images?.[0]||item.image||''),customerName:text(data.soldTo?.name||'',120),invoiceNumber:text(data.invoiceNumber||'',100),conditions:item.conditions?Object.entries(item.conditions).filter(([,v])=>v).map(([k,v])=>k==='other'?String(v):k).join(', ').slice(0,500):'',pickupDate:data.pickupDate?date(data.pickupDate.slice(0,10)):''};}
export function vendorJob(job){const keys=['id','version','companyId','batch','sku','description','size','photo','conditions','sentDate','dueDate','status','closed','acknowledgedAt','plannedDate','vendorNote','receivedDate','inspectionNote','issuePhoto','timing','updatedAt'];return Object.fromEntries(keys.filter(k=>job[k]!==undefined).map(k=>[k,job[k]]));}
export function transition(job,action,input={},vendor=false,now=new Date().toISOString()){
 if(job.closed)throw new WashError('This rug is already checked and completed.',409);
 const note=text(input.note||'',500);
 if(vendor){
  if(!['acknowledge','ready','plan','delay'].includes(action))throw new WashError('Only showroom staff can receive or inspect rugs.',403);
  if(!['At company','Ready','Delivery planned'].includes(job.status))throw new WashError('This rug is currently at the showroom for inspection.',409);
  if(action==='acknowledge')return {acknowledgedAt:job.acknowledgedAt||now};
  if(action==='ready')return {status:'Ready',vendorNote:note};
  if(action==='plan'){const plannedDate=date(input.plannedDate);if(plannedDate<today())throw new WashError('Choose today or a future delivery date.');return {status:'Delivery planned',plannedDate,vendorNote:note};}
  if(!note)throw new WashError('Tell the showroom why the rug is delayed.');return {vendorNote:note};
 }
 if(action==='reference'){const reference=photo(input.photo);if(!reference)throw new WashError('Choose a valid rug photo.');return {photo:reference};}
 if(action==='reschedule')return {...schedule({...job,...input}),scheduleReason:note||'Schedule updated by showroom'};
 if(action==='receive'){
  if(!['At company','Ready','Delivery planned'].includes(job.status))throw new WashError('This rug has already been received.',409);
  if(String(input.confirmSku||'').trim().toUpperCase()!==job.sku)throw new WashError('The tag must match this MPW number. Report a wrong rug separately.');
  if(input.photoMatched!==true)throw new WashError('Confirm that the rug matches its photo or invoice description.');
  const receivedDate=date(input.receivedDate||today());if(receivedDate<job.sentDate||receivedDate>today())throw new WashError('Choose a return date between the handoff date and today.');
  return {status:'Needs inspection',receivedDate,timing:receivedDate<job.dueDate?'Early':receivedDate>job.dueDate?'Late':'On time',inspectionNote:note};
 }
 if(action==='accept'){if(job.status!=='Needs inspection'||input.clean!==true||input.conditionChecked!==true)throw new WashError('Check the cleaning and condition after receiving the correct rug.');return {status:'Checked & ready',closed:true,completedAt:now,inspectionNote:note};}
 if(action==='issue'){if(job.status!=='Needs inspection'||!note)throw new WashError('Receive the rug, then describe the cleaning or condition problem.');return {status:'Inspection issue',inspectionNote:note,issuePhoto:photo(input.photo||'')};}
 if(action==='rewash'){if(!['Inspection issue','Needs inspection'].includes(job.status))throw new WashError('Only an inspected return can be sent for correction.');return {...schedule(input),status:'At company',acknowledgedAt:'',plannedDate:'',vendorNote:'',inspectionNote:note,receivedDate:'',timing:'',correctionCount:(job.correctionCount||0)+1};}
 throw new WashError('Unknown action.');
}
export async function resolveCompanyLink(db,token){const hash=tokenHash(token),link=(await db.doc('wash_tracking_links/'+hash).get()).data();if(!link)throw new WashError('This company link is invalid or disabled.',401);const company=(await db.doc('wash_tracking_companies/'+link.companyId).get()).data();if(!company?.linkEnabled||company.linkHash!==hash)throw new WashError('This company link is invalid or disabled.',401);return link.companyId;}
export async function createHandoff(db,{companyId,dates,batch,prepared,requestId,fingerprint,uid,now}){
 const receipt=db.doc('wash_tracking_requests/'+createHash('sha256').update(uid+':'+requestId).digest('hex'));
 return db.runTransaction(async tx=>{const prior=await tx.get(receipt);if(prior.exists){if(prior.data()?.fingerprint!==fingerprint)throw new WashError('This handoff changed. Refresh and try again.',409);return prior.data()?.ids;}
  const company=await tx.get(db.doc('wash_tracking_companies/'+companyId));if(!company.exists)throw new WashError('Company not found.',404);
  if(new Set(prepared.map(r=>skuKey(r.sku))).size!==prepared.length)throw new WashError('Duplicate MPW number in this handoff.');
  const locks=await Promise.all(prepared.map(r=>tx.get(db.doc('wash_tracking_active/'+skuKey(r.sku)))));locks.forEach((s,i)=>{if(s.exists)throw new WashError(prepared[i].sku+' is already being tracked. Finish its return before another handoff.',409);});
  const ids=[];prepared.forEach(r=>{const ref=db.collection('wash_tracking_jobs').doc();ids.push(ref.id);const job={...r,...dates,pickupDate:r.pickupDate||dates.pickupDate,companyId,companyName:company.data()?.name,batch,status:'At company',closed:false,version:1,createdAt:now,updatedAt:now,createdBy:uid};tx.create(ref,job);tx.create(db.doc('wash_tracking_active/'+skuKey(r.sku)),{jobId:ref.id});tx.create(ref.collection('history').doc(),{action:'Sent to company',by:uid,at:now,changes:{sentDate:job.sentDate,dueDate:job.dueDate}});});tx.create(receipt,{fingerprint,ids,at:now});return ids;
 });
}
export async function updateJob(db,{id,companyId='',vendor=false,uid,action,input,now}){const ref=db.doc('wash_tracking_jobs/'+id);return db.runTransaction(async tx=>{const s=await tx.get(ref);if(!s.exists)throw new WashError('Rug not found.',404);const job=s.data();if(vendor&&job.companyId!==companyId)throw new WashError('Rug not found.',404);if(input.version!==job.version)throw new WashError('This rug was updated. Refresh before continuing.',409);const update=transition(job,action,input,vendor,now);tx.update(ref,{...update,version:job.version+1,updatedAt:now});if(update.closed)tx.delete(db.doc('wash_tracking_active/'+skuKey(job.sku)));tx.create(ref.collection('history').doc(),{action,by:uid,at:now,changes:update});return update;});}
