import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/server/firebase-admin';
import {trackingLimit} from '@/lib/server/customer-tracking.mjs';
import {CheckoutError} from '@/lib/server/rug-checkout.mjs';
import {carrierToken,safeTracking} from '@/lib/shipment-tracking.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';
const cache=new Map<string,{at:number,data:unknown}>();
const response=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(req:Request){try{
 const params=new URL(req.url).searchParams,number=params.get('trackingNumber')||'',carrier=carrierToken(params.get('carrier'));
 if(!carrier||!/^[A-Za-z0-9-]{5,80}$/.test(number))return response({error:'A supported carrier and valid tracking number are required.'},400);
 const db=serverDb();await trackingLimit(db,req,'carrier',60);
 const orders=await db.collection('showroom_orders').where('shippingDetails.trackingNumber','==',number).limit(10).get();
 if(!orders.docs.some(d=>carrierToken(d.data().shippingDetails?.carrier)===carrier))return response({error:'Shipment not found for this carrier.'},404);
 const key=carrier+':'+number,previous=cache.get(key);if(previous&&Date.now()-previous.at<60000)return response(previous.data);
 const apiKey=process.env.SHIPPO_API_KEY?.trim().replace(/^ShippoToken\s+/i,'');if(!apiKey||apiKey.startsWith('shippo_test_'))return response({error:'Carrier updates are temporarily unavailable. Use the carrier tracking link below.'},503);
 const r=await fetch(`https://api.goshippo.com/tracks/${carrier}/${encodeURIComponent(number)}`,{headers:{Authorization:`ShippoToken ${apiKey}`},cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(!r.ok)return response({error:'The carrier update could not be retrieved. Use the carrier tracking link below.'},502);
 const raw=await r.json();if(raw.test===true)return response({error:'Test tracking data cannot be shown for a customer shipment.'},502);if(raw.tracking_number&&String(raw.tracking_number).toUpperCase()!==number.toUpperCase()||raw.carrier&&carrierToken(raw.carrier)!==carrier)return response({error:'Carrier returned a different shipment.'},502);
 const data=safeTracking(raw);if(cache.size>=1000)cache.clear();cache.set(key,{at:Date.now(),data});return response(data);
 }catch(e){return response({error:e instanceof CheckoutError?e.message:'Live carrier updates are temporarily unavailable. Use the carrier tracking link below.'},e instanceof CheckoutError?e.status:503);}}
