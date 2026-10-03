import {randomBytes} from 'node:crypto';
import {requireStaff} from '@/lib/server/staff-permission';
import {serverDb} from '@/lib/server/firebase-admin';
import {tokenHash,customerInvoice} from '@/lib/server/invoice-share.mjs';
import {respond} from '@/lib/server/live-payment';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(req:Request){
 let staff;try{staff=await requireStaff(req,'invoices','write');}catch{return respond({error:'Staff invoice permission required.'},403);}
 try{const {id,view}=await req.json();if(view!==undefined&&!['invoice','tracking'].includes(view))return respond({error:'Invalid invoice view.'},400);if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(id))return respond({error:'Invalid invoice.'},400);
 const db=serverDb(),invoice=(await db.collection('invoices').doc(id).get()).data();if(!invoice||invoice.data?.isDraft)return respond({error:'Save the completed invoice before sharing.'},404);
 customerInvoice(invoice.data);const token=randomBytes(32).toString('hex');
 await db.collection('invoice_customer_links').doc(tokenHash(token)).create({invoiceId:id,expiresAt:Date.now()+90*86400000,createdAt:new Date().toISOString(),createdBy:staff.uid});
 return respond({url:'https://www.marcopolorugs.com'+(view==='tracking'?'/tracking/'+token:'/public/invoice?token='+token)});
 }catch{return respond({error:'Could not create the customer invoice link. Please check that the invoice is saved in Firebase.'},503);}
}
