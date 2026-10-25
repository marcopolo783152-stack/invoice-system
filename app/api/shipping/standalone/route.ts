import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {requireStaff} from '@/lib/server/staff-permission';
import {serverDb} from '@/lib/server/firebase-admin';
import {address,packageDetails,availableRates,selectRate,safeProviderUrl} from '@/lib/server/standalone-label.mjs';
const collection='standalone_shipping_labels';
async function shippo(path:string,body:unknown){
 const key=process.env.SHIPPO_API_KEY?.trim().replace(/^ShippoToken /,'');if(!key)throw Error('Shippo shipping is not configured.');
 const response=await fetch('https://api.goshippo.com/'+path,{method:'POST',headers:{Authorization:'ShippoToken '+key,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw Error('Shippo could not complete the request. Check your addresses, package and carrier accounts.');return response.json();
}
export async function GET(request:Request){try{await requireStaff(request,'orders','read');const cursor=new URL(request.url).searchParams.get('before');let q=serverDb().collection(collection).orderBy('createdAt','desc').limit(31);if(cursor)q=q.startAfter(cursor);const snap=await q.get(),docs=snap.docs.slice(0,30);return NextResponse.json({labels:docs.map(d=>({id:d.id,...d.data()})),nextCursor:snap.size>30?docs[docs.length-1].data().createdAt:null});}catch{return NextResponse.json({error:'Staff permission required or shipping history unavailable.'},{status:403});}}
export async function POST(request:Request){
 let user;try{user=await requireStaff(request,'orders','write');}catch{return NextResponse.json({error:'Staff permission required.'},{status:403});}
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Use the showroom website.'},{status:403});
 try{
 const body=await request.json(),db=serverDb();
 if(body.action==='quote'){
 const from=address(body.sender),to=address(body.receiver),parcel=packageDetails(body.package);
 // Rate-limit external quote requests per authenticated staff member.
 const throttle=db.collection('shipping_label_throttles').doc(user.uid);
 await db.runTransaction(async tx=>{const data=(await tx.get(throttle)).data();if(data?.at>Date.now()-5000)throw Error('Please wait a few seconds before requesting rates again.');tx.set(throttle,{at:Date.now()});});
 const shipment=await shippo('shipments/',{address_from:from,address_to:to,parcels:[parcel],async:false});
 const rates=availableRates(shipment.rates);if(!rates.length)throw Error('No shipping rates are available. Check the receiver address, package and carrier accounts.');
 const id=randomUUID(),quote={sender:from,receiver:to,package:parcel,rates,shipmentId:shipment.object_id||'',phase:'quoted',createdAt:new Date().toISOString(),expiresAt:Date.now()+10*60000,createdBy:user.uid,createdByEmail:user.email||'',messages:(shipment.messages||[]).map((m:any)=>String(m.text||'')).filter(Boolean).slice(0,5)};
 await db.collection(collection).doc(id).create(quote);return NextResponse.json({id,...quote});
 }
 if(body.action!=='purchase'||body.confirmed!==true||typeof body.id!=='string'||!/^[a-f0-9-]{36}$/.test(body.id)||typeof body.rateId!=='string')throw Error('Review the shipping quote and confirm your selected label.');
 const ref=db.collection(collection).doc(body.id);
 const chosen=await db.runTransaction(async tx=>{const data=(await tx.get(ref)).data();if(data?.phase==='complete')return {result:data.result};if(data?.phase!=='quoted')throw Error('This purchase already started. Check the saved label history and Shippo before retrying.');const rate=selectRate(data,body.rateId);tx.update(ref,{phase:'purchasing',selectedRate:rate,purchasedBy:user.uid,purchasedByEmail:user.email||'',purchaseStartedAt:new Date().toISOString()});return {rate};});
 if(chosen.result)return NextResponse.json(chosen.result);
 // Never retry a transaction automatically: a timeout can still mean the label was charged.
 try{
 const t=await shippo('transactions/',{rate:chosen.rate.id,label_file_type:'PDF',async:false,metadata:'Marco Polo standalone '+body.id});
 if(t.status!=='SUCCESS'){await ref.update({phase:'needs_review',transactionId:t.object_id||'',providerStatus:t.status||'unknown'});throw Error('The carrier purchase needs review in Shippo. Do not buy another label until it is checked.');}
 const result={transactionId:t.object_id||'',trackingNumber:t.tracking_number||'',labelUrl:safeProviderUrl(t.label_url),trackingUrl:safeProviderUrl(t.tracking_url_provider),carrier:chosen.rate.carrier,service:chosen.rate.service,cost:chosen.rate.amount,currency:'USD'};
 await ref.update({phase:'complete',result,completedAt:new Date().toISOString()});return NextResponse.json(result);
 }catch{await ref.update({phase:'needs_review'}).catch(()=>{});return NextResponse.json({error:'Purchase needs review. Check Shippo and label history before buying another label; it may already have been charged.'},{status:409});}
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Shipping could not complete.'},{status:400});}
}
