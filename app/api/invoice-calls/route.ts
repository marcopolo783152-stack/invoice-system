import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/server/firebase-admin';
import {requireStaff} from '@/lib/server/staff-permission';
import {CallError,callReference,serviceInvoice,appendCall,publicStaffCall} from '@/lib/server/invoice-calls.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const reply=(data:any,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
function failure(error:any){return reply({error:error instanceof CallError?error.message:error?.message==='FORBIDDEN'?'You need permission to access invoices.':/SIGN_IN_REQUIRED|auth\//.test(error?.message||'')?'Please sign in again.':'Could not load or save call history. Please try again.'},error instanceof CallError?error.status:error?.message==='FORBIDDEN'?403:/SIGN_IN_REQUIRED|auth\//.test(error?.message||'')?401:503);}
export async function GET(request:Request){try{
 await requireStaff(request,'invoices','read');
 const url=new URL(request.url),db=serverDb(),ref=db.doc(callReference(url.searchParams.get('collection'),url.searchParams.get('id'))),invoice=await ref.get();
 if(!invoice.exists)throw new CallError('Invoice not found.',404);
 if(!serviceInvoice(invoice.data()))throw new CallError('This is not a wash or repair invoice.');
 let query=ref.collection('customerCalls').orderBy('calledAt','desc');
 const cursor=url.searchParams.get('cursor');
 if(cursor){if(!/^[a-zA-Z0-9_-]{16,100}$/.test(cursor))throw new CallError('Invalid history page.');const last=await ref.collection('customerCalls').doc(cursor).get();if(!last.exists)throw new CallError('History page not found.');query=query.startAfter(last);}
 const records=await query.limit(51).get(),page=records.docs.slice(0,50);
 return reply({calls:page.map(d=>publicStaffCall(d.data())),nextCursor:records.size>50?page[page.length-1].id:null});
 }catch(error){return failure(error);}}
export async function POST(request:Request){try{
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)throw new CallError('Please use the showroom website.',403);
 const user=await requireStaff(request,'invoices','write'),raw=await request.text();
 if(raw.length>12000)throw new CallError('Call entry is too large.');
 let body:any;try{body=JSON.parse(raw);}catch{throw new CallError('Invalid call entry.');}
 if(!body||typeof body!=='object')throw new CallError('Invalid call entry.');
 const db=serverDb(),role=(await db.doc('showroom_roles/'+user.uid).get()).data();
 const actor={uid:user.uid,name:String(role?.fullName||role?.name||user.name||user.email||'Staff').slice(0,200)};
 const call=await appendCall(db,{collection:body.collection,id:body.invoiceId,input:body.call,actor,at:new Date().toISOString()});
 return reply({call});
 }catch(error){return failure(error);}}
