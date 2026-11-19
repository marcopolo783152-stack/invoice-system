import {NextResponse} from 'next/server';
import {caller,serverDb} from '@/lib/server/firebase-admin';
import {findCustomerOrder,trackingLimit} from '@/lib/server/customer-tracking.mjs';
import {CheckoutError} from '@/lib/server/rug-checkout.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';
const response=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization'}});
export async function POST(req:Request){try{
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return response({error:'Open tracking on this website.'},403);
 const raw=await req.text();if(raw.length>2000)return response({error:'Request too large.'},413);
 let body;try{body=JSON.parse(raw);}catch{return response({error:'Invalid request.'},400);}
 const db=serverDb();await trackingLimit(db,req);
 let user=null;if(req.headers.has('authorization')){try{user=await caller(req);}catch{return response({error:'Please sign in again, or use your checkout email.'},401);}}
 return response({order:await findCustomerOrder(db,body.reference,body.email,user)});
 }catch(e){return response({error:e instanceof CheckoutError?e.message:'Tracking is temporarily unavailable. Please try again or contact the showroom.'},e instanceof CheckoutError?e.status:503);}}
