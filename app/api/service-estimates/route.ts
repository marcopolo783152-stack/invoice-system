import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/server/firebase-admin';
import {requireStaff} from '@/lib/server/staff-permission';
import {ESTIMATES,saveWorkflow,createEstimateInvoice,customerCandidates} from '@/lib/server/estimate-workflow.mjs';
import {estimatePrefill} from '@/lib/estimate-workflow.mjs';
import {calculateInvoice,validateInvoiceData} from '@/lib/calculations';
import {notifyCustomerSource} from '@/lib/server/customer-emails';
import {PICKUPS} from '@/lib/service-pickups.mjs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
const fail=(e:any)=>NextResponse.json({error:e.message==='FORBIDDEN'?'Your staff account needs permission for this action.':e.message||'Estimate action failed.'},{status:e.message==='FORBIDDEN'?403:400,headers});
export async function GET(req:Request){try{await requireStaff(req,'services','read');const params=new URL(req.url).searchParams,id=params.get('id');if(!id||!/^\w[\w-]{0,99}$/.test(id))throw Error('Choose an estimate request.');const db=serverDb(),ref=db.doc(ESTIMATES+'/'+id),s=await ref.get();if(!s.exists)throw Error('Request not found.');const estimate={...s.data(),id:s.id};const history=ref.collection('contact_history').orderBy('at','desc').limit(51);const before=params.get('before');const [events,matches]=await Promise.all([(before?history.startAfter(before):history).get(),customerCandidates(db,estimate)]);return NextResponse.json({estimate,prefill:estimatePrefill(estimate),history:events.docs.slice(0,50).map(d=>({...d.data(),id:d.id})),nextCursor:events.size>50?events.docs[49].data().at:null,customers:matches.candidates.map((c:any)=>({id:c.id,name:c.name,phone:c.phone,email:c.email})),customerSearchLimited:matches.limited},{headers});}catch(e){return fail(e);}}
export async function POST(req:Request){try{if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)throw Error('Use the showroom website.');const u=await requireStaff(req,'services','write'),raw=await req.text();if(raw.length>1500000)throw Error('Request too large.');const b=JSON.parse(raw),db=serverDb(),role=(await db.doc('showroom_roles/'+u.uid).get()).data(),actor={uid:u.uid,name:role?.name||u.name||u.email||'Staff'};
 if(b.action==='invoice'){
 await requireStaff(req,'invoices','write');await requireStaff(req,'customers','write');if(b.collection!=='invoices')throw Error('Estimate invoices use the main showroom invoice collection.');const d=b.data;if(!d||d.sourceEstimateId!==b.id||d.sourcePickupId||d.documentType!=='WASH'||d.mode!=='wash'||!Array.isArray(d.items)||d.items.length>100||!/^MP\d{8}$/.test(d.invoiceNumber||''))throw Error('Use the service invoice form linked to this request.');const errors=validateInvoiceData(d);if(errors.length)throw Error(errors.join(' '));const total=calculateInvoice(d).totalDue;if(!Number.isFinite(total)||total<0)throw Error('Invoice total is invalid.');const result=await createEstimateInvoice(db,{id:b.id,data:d,total,actor});await notifyCustomerSource('invoices',result.id);return NextResponse.json(result,{headers});
 }
 await requireStaff(req,'customers','write');if(b.action==='schedule')await requireStaff(req,'appointments','write');const result=await saveWorkflow(db,b,actor);if(b.action==='schedule'&&result.pickupId)await notifyCustomerSource(PICKUPS,result.pickupId);return NextResponse.json(result,{headers});
 }catch(e){return fail(e);}}
