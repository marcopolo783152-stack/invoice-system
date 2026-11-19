import {serverDb} from '@/lib/server/firebase-admin';
import {washingSummary} from '@/lib/washing-invoice.mjs';
import {tokenHash,customerInvoice} from '@/lib/server/invoice-share.mjs';
import {respond} from '@/lib/server/live-payment';
export const runtime='nodejs';export const dynamic='force-dynamic';
function result(id:string,data:any){const service=data.mode==='wash'||data.mode==='repair'||data.documentType==='WASH'||data.documentType==='REPAIR';return {...(service?{serviceProgress:((summary:any)=>({readyCount:summary.readyCount,total:summary.total}))(washingSummary(data))}:{}),invoice:{id,data:customerInvoice(data),createdAt:'',updatedAt:'',documentType:data.documentType||'INVOICE'}};}
export async function GET(req:Request){
 try{const hash=tokenHash(new URL(req.url).searchParams.get('token')),db=serverDb(),link=(await db.collection('invoice_customer_links').doc(hash).get()).data();
 if(!link||link.revoked||link.expiresAt<Date.now())return respond({error:'This invoice link is unavailable or expired. Ask the showroom for a new link.'},404);
 const invoice=(await db.collection('invoices').doc(link.invoiceId).get()).data();if(!invoice||invoice.data?.isDraft)return respond({error:'Invoice unavailable.'},404);
 const res=respond(result(link.invoiceId,invoice.data));res.headers.set('Referrer-Policy','no-referrer');res.headers.set('X-Robots-Tag','noindex, nofollow');return res;
 }catch{return respond({error:'Unable to open this invoice. Ask the showroom for a new secure link.'},404);}
}
export async function POST(req:Request){
 try{const raw=await req.text();if(raw.length>300000)return respond({error:'Signature too large.'},400);const {token,signature}=JSON.parse(raw);
 if(typeof signature!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signature)||signature.length<100)return respond({error:'Please draw your signature.'},400);
 const db=serverDb(),linkRef=db.collection('invoice_customer_links').doc(tokenHash(token));
 const data=await db.runTransaction(async tx=>{const link=(await tx.get(linkRef)).data();if(!link||link.revoked||link.expiresAt<Date.now())throw Error();const ref=db.collection('invoices').doc(link.invoiceId),invoice=(await tx.get(ref)).data();if(!invoice||invoice.data?.isDraft)throw Error();
 if(invoice.data.signature)return result(link.invoiceId,invoice.data);
 const date=new Date().toISOString();tx.update(ref,{'data.signature':signature,'data.signatureDate':date,updatedAt:date});tx.update(linkRef,{signedAt:date});return result(link.invoiceId,{...invoice.data,signature,signatureDate:date});});return respond(data);
 }catch{return respond({error:'Could not save your signature. Ask the showroom to check the invoice link.'},400);}
}
