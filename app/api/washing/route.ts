import {NextResponse} from 'next/server';
import {randomBytes,createHash} from 'node:crypto';
import {serverDb} from '@/lib/server/firebase-admin';
import {requireStaff} from '@/lib/server/staff-permission';
import {WashError,text,date,today,tokenHash,schedule,invoiceRug,vendorJob,transition,photo,resolveCompanyLink,createHandoff,updateJob,updateJobs,addCompany,cleanupCompanies,archiveCompany,planReturns} from '@/lib/server/washing.mjs';
import {washingSummary} from '@/lib/washing-invoice.mjs';
import {initializeIntake,handoffCandidates,rememberLink,savedLink} from '@/lib/server/washing-intake.mjs';
import {priorityInfo,priorityOrder} from '@/lib/washing-priority.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
const reply=(value:any,status=200)=>NextResponse.json(value,{status,headers});
const id=(value:any)=>{if(typeof value!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(value))throw new WashError('Invalid record.');return value;};
const invoiceCol=(value:any)=>{if(typeof value!=='string'||!/^([a-zA-Z0-9_-]+_)?invoices$/.test(value))throw new WashError('Invalid invoice collection.');return value;};
const jobs=()=>serverDb().collection('wash_tracking_jobs');
const companies=()=>serverDb().collection('wash_tracking_companies');
async function access(request:Request,write=false){
 const token=request.headers.get('x-wash-link');
 if(token){tokenHash(token);const companyId=await resolveCompanyLink(serverDb(),token);return {vendor:true,companyId,uid:'company:'+companyId};}
 const user=await requireStaff(request,'services',write?'write':'read');return {vendor:false,companyId:'',uid:user.uid};
}
async function list(companyId:string,vendor:boolean){
 const query=companyId?jobs().where('companyId','==',companyId):jobs();
 const [open,closed]=await Promise.all([query.where('closed','==',false).limit(501).get(),query.where('closed','==',true).limit(100).get()]);
 if(open.size>500)throw new WashError('More than 500 active rugs. Filter by company.',409);
 const invoiceSummaries=new Map();
 if(!vendor){const paths=[...new Set([...open.docs,...closed.docs].map(d=>{const j=d.data();return j.invoiceId&&/^([a-zA-Z0-9_-]+_)?invoices$/.test(j.invoiceCollection||'')?j.invoiceCollection+'/'+j.invoiceId:'';}).filter(Boolean))];await Promise.all(paths.map(async path=>{const s=await serverDb().doc(path).get();if(s.exists)invoiceSummaries.set(path,washingSummary(s.data()?.data||s.data()));}));}
 const invoiceProgress=(j:any)=>{const summary=invoiceSummaries.get(j.invoiceCollection+'/'+j.invoiceId);return summary?{invoiceReadyCount:summary.readyCount,invoiceRugCount:summary.total,invoiceStatus:summary.status}:{};};
 return [...open.docs,...closed.docs].map(d=>vendor?vendorJob({...d.data(),id:d.id,...priorityInfo(d.data(),today())}):{...d.data(),id:d.id,...priorityInfo(d.data(),today()),...invoiceProgress(d.data())}).sort((a:any,b:any)=>priorityOrder(a,b));
}
export async function GET(request:Request){try{
 const a=await access(request),url=new URL(request.url),companyId=a.vendor?a.companyId:url.searchParams.get('company')||'';if(companyId)id(companyId);
 if(url.searchParams.has('handoffCandidates')){if(a.vendor)throw new WashError('Staff access required.',403);await requireStaff(request,'invoices','read');return reply(await handoffCandidates(serverDb(),invoiceCol(url.searchParams.get('invoiceCollection'))));}
 if(url.searchParams.has('alerts')){if(a.vendor)throw new WashError('Staff access required.',403);const pending=await jobs().where('closed','==',false).select('sku','companyName','dueDate','pickupDate','sentDate','status','closed','plannedDate','updatedAt','leftBehind').limit(501).get();if(pending.size>500)throw new WashError('Too many active rugs for the alert summary.',409);const records=pending.docs.map(d=>({...d.data(),id:d.id,...priorityInfo(d.data(),today())}));return reply({alerts:records.filter((j:any)=>j.alert||j.pickupRisk).map(alertSummary),planned:records.filter((j:any)=>!j.closed&&['Delivery planned','On the way'].includes(j.status)).map(alertSummary),today:today()});}
 if(url.searchParams.has('reports')){const resolved=url.searchParams.get('reports')==='solved',cursor=url.searchParams.get('cursor');let q:any=serverDb().collection('wash_tracking_exceptions').where('resolved','==',resolved);if(companyId)q=q.where('companyId','==',companyId);if(cursor){const last=await serverDb().doc('wash_tracking_exceptions/'+id(cursor)).get();if(!last.exists||last.data()?.resolved!==resolved||companyId&&last.data()?.companyId!==companyId)throw new WashError('Invalid report page.');q=q.startAfter(last);}const result=await q.limit(51).get(),docs=result.docs.slice(0,50);return reply({reports:docs.map((d:any)=>report(d)),nextCursor:result.size>50?docs.at(-1).id:null});}
 const historyId=url.searchParams.get('history');if(historyId){if(a.vendor)throw new WashError('Staff access required.',403);const ref=jobs().doc(id(historyId));if(!(await ref.get()).exists)throw new WashError('Rug not found.',404);return reply({history:(await ref.collection('history').orderBy('at','desc').limit(100).get()).docs.map(d=>({...d.data(),id:d.id}))});}
 const cs=a.vendor?[{id:a.companyId,name:(await companies().doc(a.companyId).get()).data()?.name}]:(await companies().get()).docs.filter(d=>!d.data().archived).map(d=>({id:d.id,name:d.data().name,linkEnabled:d.data().linkEnabled===true}));
 return reply({companies:cs,jobs:await list(companyId,a.vendor),exceptions:[],today:today()});
 }catch(e){return failure(e);}}
function alertSummary(j:any){return {id:j.id,sku:j.sku,companyName:j.companyName,priority:j.priority,returnBy:j.returnBy,pickupRisk:j.pickupRisk,status:j.status,plannedDate:j.plannedDate||'',updatedAt:j.updatedAt,leftBehind:j.leftBehind||[]};}
function report(d:any){const x=d.data();return {id:d.id,companyId:x.companyId,companyName:x.companyName||'',note:x.note,photo:x.photo,reportedBy:x.reportedBy,createdAt:x.createdAt,resolved:x.resolved,resolvedAt:x.resolvedAt||'',resolution:x.resolution||''};}
export async function POST(request:Request){try{
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)throw new WashError('Please use the showroom website.',403);
 const a=await access(request,true),raw=await request.text();if(raw.length>3000000)throw new WashError('Request too large.');let b:any;try{b=JSON.parse(raw);}catch{throw new WashError('Invalid request.');}
 if(!b||typeof b!=='object'||Array.isArray(b))throw new WashError('Invalid request.');
 const db=serverDb(),now=new Date().toISOString();
 if(b.action==='initializeIntake'){if(a.vendor)throw new WashError('Staff access required.',403);await requireStaff(request,'invoices','read');return reply(await initializeIntake(db,invoiceCol(b.invoiceCollection),a.uid,now));}
 if(b.action==='getLink'){if(a.vendor)throw new WashError('Staff access required.',403);return reply({token:await savedLink(db,id(b.companyId))});}
 if(b.action==='rememberLink'){const companyId=a.vendor?a.companyId:id(b.companyId),token=a.vendor?request.headers.get('x-wash-link'):b.token;await rememberLink(db,companyId,token);return reply({});}
 if(b.action==='bulk'){
  if(!['acknowledge','start','ready','delay','receive','accept','rewash'].includes(b.bulkAction))throw new WashError('Choose a supported bulk action.');
  const rugs=Array.isArray(b.rugs)?b.rugs.map((r:any)=>({id:id(r.id),version:r.version})):[];
  const result=await updateJobs(db,{rugs,companyId:a.companyId,vendor:a.vendor,uid:a.uid,action:b.bulkAction,input:{note:b.note||'',priorityAcknowledged:b.priorityAcknowledged===true,receivedDate:b.receivedDate,clean:b.clean===true,conditionChecked:b.conditionChecked===true,sentDate:b.sentDate,dueDate:b.dueDate,checks:b.checks||{}},operationId:id(b.requestId),now});
  return reply({ids:result.ids,count:result.ids.length,replayed:result.replayed});
 }
 if(b.action==='company'){
  if(a.vendor)throw new WashError('Staff access required.',403);return reply({id:await addCompany(db,b.name,a.uid,now)});
 }
 if(b.action==='cleanupCompanies'){if(a.vendor)throw new WashError('Staff access required.',403);return reply({mapping:await cleanupCompanies(db,a.uid,now)});}
 if(b.action==='archiveCompany'){if(a.vendor)throw new WashError('Staff access required.',403);await archiveCompany(db,id(b.companyId),a.uid,now);return reply({});}
 if(['planReturns','dispatchReturns'].includes(b.action)){const deliveryCompany=a.vendor?a.companyId:id(b.companyId);const rugs=Array.isArray(b.rugs)?b.rugs.map((r:any)=>({id:id(r.id),version:r.version})):[];return reply(await planReturns(db,{companyId:deliveryCompany,rugs,plannedDate:b.plannedDate,acknowledged:b.priorityAcknowledged===true,note:b.note||'',dispatch:b.action==='dispatchReturns',loadedChecked:b.loadedChecked===true,uid:a.uid,now,operationId:b.requestId?id(b.requestId):''}));}
 if(['link','revoke'].includes(b.action)){
  if(a.vendor)throw new WashError('Staff access required.',403);const ref=companies().doc(id(b.companyId)),token=randomBytes(32).toString('hex'),hash=tokenHash(token);
  await db.runTransaction(async tx=>{const s=await tx.get(ref);if(!s.exists||s.data()?.archived)throw new WashError('Company not found.',404);const old=s.data()?.linkHash;if(old)tx.delete(db.doc('wash_tracking_links/'+old));if(b.action==='link')tx.create(db.doc('wash_tracking_links/'+hash),{companyId:ref.id,createdAt:now});if(b.action==='link')tx.set(db.doc('wash_tracking_link_secrets/'+ref.id),{token,hash});else tx.delete(db.doc('wash_tracking_link_secrets/'+ref.id));tx.update(ref,{linkHash:b.action==='link'?hash:'',linkEnabled:b.action==='link',updatedAt:now});tx.create(ref.collection('history').doc(),{action:b.action,by:a.uid,at:now});});
  return reply(b.action==='link'?{token}:{});
 }
 if(b.action==='batch'){
  if(a.vendor)throw new WashError('Staff access required.',403);await requireStaff(request,'invoices','read');const companyId=id(b.companyId),dates=schedule(b),batch=text(b.batch,80)||'Handoff '+dates.sentDate,refs=b.rugs;
  if(!Array.isArray(refs)||!refs.length||refs.length>40)throw new WashError('Select between 1 and 40 rugs.');
  const col=invoiceCol(b.invoiceCollection);await initializeIntake(db,col,a.uid,now);
  const prepared:any[]=[];for(const r of refs){const inv=await db.collection(col).doc(id(r.invoiceId)).get();if(!inv.exists)throw new WashError('Save the wash invoice before sending this rug.');const rug=invoiceRug(inv.data(),id(r.itemId)),pickupDate=rug.pickupDate||dates.pickupDate;schedule({...dates,pickupDate});prepared.push({...rug,photo:photo(r.photo)||rug.photo,...dates,pickupDate,invoiceId:r.invoiceId,itemId:r.itemId,invoiceCollection:col});}
  if(new Set(prepared.map(r=>r.sku)).size!==prepared.length)throw new WashError('Duplicate MPW number in this handoff.');
  const requestId=id(b.requestId),fingerprint=createHash('sha256').update(JSON.stringify({companyId,dates,batch,refs,col})).digest('hex');
  const result=await createHandoff(db,{companyId,dates,batch,prepared,requestId,fingerprint,uid:a.uid,now});return reply({ids:result});
 }
 if(b.action==='exception'){
  const companyId=a.vendor?a.companyId:id(b.companyId),note=text(b.note,500);if(!note)throw new WashError('Describe the wrong rug or delivery problem.');const companyRecord=(await companies().doc(companyId).get()).data();if(!companyRecord||companyRecord.archived)throw new WashError('Company not found.',404);const ref=db.collection('wash_tracking_exceptions').doc();await ref.create({companyId,companyName:companyRecord.name,note,photo:photo(b.photo),reportedBy:a.vendor?'Washing company':'Showroom',createdAt:now,resolved:false});return reply({id:ref.id});
 }
 if(b.action==='resolveException'){if(a.vendor)throw new WashError('Staff access required.',403);const ref=db.doc('wash_tracking_exceptions/'+id(b.id));await ref.update({resolved:true,resolvedAt:now,resolution:text(b.note||'',500),resolvedBy:a.uid});return reply({});}
 if(a.vendor&&b.action==='plan')return reply(await planReturns(db,{companyId:a.companyId,rugs:[{id:id(b.id),version:b.version}],plannedDate:b.plannedDate,acknowledged:b.priorityAcknowledged===true,note:b.note||'',uid:a.uid,now}));
 await updateJob(db,{id:id(b.id),companyId:a.companyId,vendor:a.vendor,uid:a.uid,action:b.action,input:b,now});return reply({});
 }catch(e){return failure(e);}}
function failure(e:any){const m=e instanceof Error?e.message:'';return reply({...(e instanceof WashError&&e.existingId?{existingId:e.existingId}:{}),error:e instanceof WashError?m:m==='FORBIDDEN'?'You need permission for this section.':/SIGN_IN_REQUIRED|auth\//.test(m)?'Please sign in again.':'Could not save or load washing records. Please retry.'},e instanceof WashError?e.status:m==='FORBIDDEN'?403:/SIGN_IN_REQUIRED|auth\//.test(m)?401:503);}
