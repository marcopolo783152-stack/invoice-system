import {NextResponse} from 'next/server';
import {randomBytes,createHash} from 'node:crypto';
import {serverDb} from '@/lib/server/firebase-admin';
import {requireStaff} from '@/lib/server/staff-permission';
import {WashError,text,date,today,tokenHash,schedule,invoiceRug,vendorJob,transition,photo,resolveCompanyLink,createHandoff,updateJob} from '@/lib/server/washing.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
const reply=(value:any,status=200)=>NextResponse.json(value,{status,headers});
const id=(value:any)=>{if(typeof value!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(value))throw new WashError('Invalid record.');return value;};
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
 return [...open.docs,...closed.docs].map(d=>vendor?vendorJob({...d.data(),id:d.id}):{...d.data(),id:d.id}).sort((a:any,b:any)=>a.dueDate.localeCompare(b.dueDate));
}
export async function GET(request:Request){try{const a=await access(request),companyId=a.vendor?a.companyId:new URL(request.url).searchParams.get('company')||'';if(companyId)id(companyId);const historyId=new URL(request.url).searchParams.get('history');if(historyId){if(a.vendor)throw new WashError('Staff access required.',403);const ref=jobs().doc(id(historyId));if(!(await ref.get()).exists)throw new WashError('Rug not found.',404);return reply({history:(await ref.collection('history').orderBy('at','desc').limit(100).get()).docs.map(d=>({...d.data(),id:d.id}))});}const cs=a.vendor?[{id:a.companyId,name:(await companies().doc(a.companyId).get()).data()?.name}]:(await companies().get()).docs.map(d=>({id:d.id,name:d.data().name,linkEnabled:d.data().linkEnabled===true}));const exceptions=companyId?(await serverDb().collection('wash_tracking_exceptions').where('companyId','==',companyId).limit(100).get()).docs.map(d=>{const x=d.data();return {id:d.id,note:x.note,photo:x.photo,reportedBy:x.reportedBy,createdAt:x.createdAt,resolved:x.resolved,resolution:x.resolution||''};}):[];return reply({companies:cs,jobs:await list(companyId,a.vendor),exceptions,today:today()});}catch(e){return failure(e);}}
export async function POST(request:Request){try{
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)throw new WashError('Please use the showroom website.',403);
 const a=await access(request,true),raw=await request.text();if(raw.length>3000000)throw new WashError('Request too large.');let b:any;try{b=JSON.parse(raw);}catch{throw new WashError('Invalid request.');}
 if(!b||typeof b!=='object'||Array.isArray(b))throw new WashError('Invalid request.');
 const db=serverDb(),now=new Date().toISOString();
 if(b.action==='company'){
  if(a.vendor)throw new WashError('Staff access required.',403);const name=text(b.name,120);if(!name)throw new WashError('Enter the washing company name.');const ref=companies().doc();await ref.create({name,linkEnabled:false,createdAt:now,createdBy:a.uid});return reply({id:ref.id});
 }
 if(['link','revoke'].includes(b.action)){
  if(a.vendor)throw new WashError('Staff access required.',403);const ref=companies().doc(id(b.companyId)),token=randomBytes(32).toString('hex'),hash=tokenHash(token);
  await db.runTransaction(async tx=>{const s=await tx.get(ref);if(!s.exists)throw new WashError('Company not found.',404);const old=s.data()?.linkHash;if(old)tx.delete(db.doc('wash_tracking_links/'+old));if(b.action==='link')tx.create(db.doc('wash_tracking_links/'+hash),{companyId:ref.id,createdAt:now});tx.update(ref,{linkHash:b.action==='link'?hash:'',linkEnabled:b.action==='link',updatedAt:now});tx.create(ref.collection('history').doc(),{action:b.action,by:a.uid,at:now});});
  return reply(b.action==='link'?{token}:{});
 }
 if(b.action==='batch'){
  if(a.vendor)throw new WashError('Staff access required.',403);await requireStaff(request,'invoices','read');const companyId=id(b.companyId),dates=schedule(b),batch=text(b.batch,80)||'Handoff '+dates.sentDate,refs=b.rugs;
  if(!Array.isArray(refs)||!refs.length||refs.length>40)throw new WashError('Select between 1 and 40 rugs.');
  const col=b.invoiceCollection;if(typeof col!=='string'||!/^([a-zA-Z0-9_-]+_)?invoices$/.test(col))throw new WashError('Invalid invoice collection.');
  const prepared:any[]=[];for(const r of refs){const inv=await db.collection(col).doc(id(r.invoiceId)).get();if(!inv.exists)throw new WashError('Save the wash invoice before sending this rug.');const rug=invoiceRug(inv.data(),id(r.itemId)),pickupDate=rug.pickupDate||dates.pickupDate;schedule({...dates,pickupDate});prepared.push({...rug,photo:photo(r.photo)||rug.photo,...dates,pickupDate,invoiceId:r.invoiceId,itemId:r.itemId,invoiceCollection:col});}
  if(new Set(prepared.map(r=>r.sku)).size!==prepared.length)throw new WashError('Duplicate MPW number in this handoff.');
  const requestId=id(b.requestId),fingerprint=createHash('sha256').update(JSON.stringify({companyId,dates,batch,refs,col})).digest('hex');
  const result=await createHandoff(db,{companyId,dates,batch,prepared,requestId,fingerprint,uid:a.uid,now});return reply({ids:result});
 }
 if(b.action==='exception'){
  const companyId=a.vendor?a.companyId:id(b.companyId),note=text(b.note,500);if(!note)throw new WashError('Describe the wrong rug or delivery problem.');if(!(await companies().doc(companyId).get()).exists)throw new WashError('Company not found.',404);const ref=db.collection('wash_tracking_exceptions').doc();await ref.create({companyId,note,photo:photo(b.photo),reportedBy:a.vendor?'Washing company':'Showroom',createdAt:now,resolved:false});return reply({id:ref.id});
 }
 if(b.action==='resolveException'){if(a.vendor)throw new WashError('Staff access required.',403);const ref=db.doc('wash_tracking_exceptions/'+id(b.id));await ref.update({resolved:true,resolvedAt:now,resolution:text(b.note||'',500),resolvedBy:a.uid});return reply({});}
 await updateJob(db,{id:id(b.id),companyId:a.companyId,vendor:a.vendor,uid:a.uid,action:b.action,input:b,now});return reply({});
 }catch(e){return failure(e);}}
function failure(e:any){const m=e instanceof Error?e.message:'';return reply({error:e instanceof WashError?m:m==='FORBIDDEN'?'You need permission for this section.':/SIGN_IN_REQUIRED|auth\//.test(m)?'Please sign in again.':'Could not save or load washing records. Please retry.'},e instanceof WashError?e.status:m==='FORBIDDEN'?403:/SIGN_IN_REQUIRED|auth\//.test(m)?401:503);}
