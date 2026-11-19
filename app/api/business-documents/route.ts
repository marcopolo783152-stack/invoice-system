import {documentMatches} from '@/lib/business-document-search.mjs';
import {createHash} from 'node:crypto';
import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/server/firebase-admin';
import {requireStaff} from '@/lib/server/staff-permission';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const response=(body:object,status=200)=>NextResponse.json(body,{status,headers});
const str=(x:unknown,max:number)=>{if(typeof x!=='string'||x.length>max)throw Error('Check the length of the document fields.');return x.trim();};
export async function GET(req:Request){try{
 await requireStaff(req,'invoices','read');const params=new URL(req.url).searchParams,q=(params.get('q')||'').trim(),kind=params.get('kind')||'all',cursor=params.get('cursor')||'';
 if(q.length>150||!['all','purchase','packing'].includes(kind)||cursor&&!/^[a-f0-9]{64}$/.test(cursor))return response({error:'Invalid search or page.'},400);
 const col=serverDb().collection('business_documents');let after:any=null;
 if(cursor){after=await col.doc(cursor).get();if(!after.exists)return response({error:'This page is no longer available. Search again.'},400);}
 const documents:any[]=[];let scanned=0,nextCursor:string|null=null,more=false;
 while(scanned<1000&&documents.length<25){let query=col.orderBy('createdAt','desc').limit(100);if(after)query=query.startAfter(after);const page=await query.get();if(page.empty){more=false;break;}
  let consumed=0;for(const snap of page.docs){after=snap;consumed++;scanned++;if(documentMatches({id:snap.id,...snap.data()},q,kind))documents.push({id:snap.id,...snap.data()});if(documents.length>=25||scanned>=1000)break;}
  more=consumed<page.size||page.size===100;if(!more)break;
 }
 if(more&&after)nextCursor=after.id;
 return response({documents,nextCursor});
 }catch(e){return response({error:e instanceof Error&&e.message==='FORBIDDEN'?'You need invoice permission to view documents.':'Unable to load documents. Please sign in again or retry.'},e instanceof Error&&e.message==='FORBIDDEN'?403:503);}}
export async function POST(req:Request){try{
 const actor=await requireStaff(req,'invoices','write');if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return response({error:'Invalid origin.'},403);
 const raw=await req.text();if(raw.length>100000)return response({error:'Document is too large.'},400);const input=JSON.parse(raw);
 if(!['purchase','packing'].includes(input.kind)||!['person','dealer','customer','business'].includes(input.partyType)||!Array.isArray(input.items)||input.items.length<1||input.items.length>100)throw Error('Choose a document type and enter 1 to 100 items.');
 const date=str(input.date,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw Error('Enter a valid date.');
 const name=str(input.name,160);if(!name)throw Error('Enter the other party name.');
 const items=input.items.map((item:any)=>{const description=str(item.description,500),sku=str(item.sku,100),dimensions=str(item.dimensions,100),packageType=str(item.packageType,60),qty=Number(item.qty),weight=str(item.weight,60),unitPrice=Number(item.unitPrice||0);if(!description||!Number.isInteger(qty)||qty<1||qty>100000||!Number.isFinite(unitPrice)||unitPrice<0||unitPrice>10000000||Math.abs(Math.round(unitPrice*100)-unitPrice*100)>0.000001)throw Error('Check each item description, quantity and price.');return {description,sku,dimensions,packageType,qty,weight,unitPrice};});
 const record={kind:input.kind,partyType:input.partyType,date,name,address:str(input.address,400),phone:str(input.phone,80),email:str(input.email,160),reference:str(input.reference,120),notes:str(input.notes,2000),items,createdAt:new Date().toISOString(),createdBy:actor.uid};
 if(typeof input.requestId!=='string'||!/^[-a-zA-Z0-9]{1,100}$/.test(input.requestId))throw Error('Invalid save request.');
 const db=serverDb(),key=createHash('sha256').update(actor.uid+':'+input.requestId).digest('hex'),ref=db.collection('business_documents').doc(key),fingerprint=createHash('sha256').update(JSON.stringify({...record,createdAt:'',createdBy:''})).digest('hex');
 const saved=await db.runTransaction(async tx=>{const old=await tx.get(ref);if(old.exists){if(old.data()?.fingerprint!==fingerprint)throw Error('Document changed. Please save again.');return old.data();}const value={...record,fingerprint};tx.create(ref,value);return value;});return response({id:ref.id,...saved});
 }catch(e){const msg=e instanceof Error?e.message:'';return response({error:msg==='FORBIDDEN'?'You need invoice permission to save.':msg==='SIGN_IN_REQUIRED'?'Please sign in again.':msg||'Unable to save document.'},msg==='FORBIDDEN'?403:400);}}
