import {NextResponse} from 'next/server';
import {requireStaff} from '@/lib/server/staff-permission';
import {serverDb} from '@/lib/server/firebase-admin';
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function POST(r:Request){
 try{if(r.headers.get('origin')&&r.headers.get('origin')!==new URL(r.url).origin)return NextResponse.json({error:'Use the showroom website.'},{status:403});const user=await requireStaff(r,'orders','read'),raw=await r.text();if(raw.length>20000)return NextResponse.json({error:'Too many orders.'},{status:400});const {ids}=JSON.parse(raw);if(!Array.isArray(ids)||!ids.length||ids.length>100||ids.some(id=>typeof id!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(id))||new Set(ids).size!==ids.length)return NextResponse.json({error:'Choose valid orders.'},{status:400});
 const db=serverDb(),at=new Date().toISOString();await db.runTransaction(async tx=>{const orders=await Promise.all(ids.map(id=>tx.get(db.doc('showroom_orders/'+id))));if(orders.some(o=>!o.exists))throw Error('MISSING_ORDER');ids.forEach(id=>tx.set(db.doc('showroom_order_inboxes/'+user.uid+'/seen/'+id),{seenAt:at}));});return NextResponse.json({ids},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:e instanceof Error&&e.message==='MISSING_ORDER'?'An order changed. Refresh the list.':'Staff order permission required.'},{status:e instanceof Error&&e.message==='MISSING_ORDER'?409:403});}
}
