import {sendLiveReceipt} from '@/lib/server/live-receipt';
import {refundLiveOrder,syncLiveRefund} from '@/lib/server/live-refund';
import {NextRequest} from 'next/server';
import {requireStaff} from '@/lib/server/staff-permission';
import {serverDb} from '@/lib/server/firebase-admin';
import {CheckoutError} from '@/lib/server/rug-checkout.mjs';
import {LIVE_ORDERS,publicOrder,approveQuote,cancelQuote,fulfillOrder,restockRefund} from '@/lib/server/live-orders.mjs';
import {respond,failure,sameSite,bodyJson,ownOrder,reconcile} from '@/lib/server/live-payment';
export const runtime='nodejs';export const dynamic='force-dynamic';
async function staff(req:Request,action:string){try{return await requireStaff(req,'orders',action);}catch{throw new CheckoutError('Order-management permission is required.',403);}}
export async function GET(req:NextRequest){
  try{
    const u=await staff(req,'read'),id=req.nextUrl.searchParams.get('order');
    if(id)return respond({order:publicOrder(await ownOrder(id,u.uid,true),true)});
    let q=serverDb().collection(LIVE_ORDERS).orderBy('createdAt','desc').orderBy('__name__','desc').limit(50);
    const cursor=req.nextUrl.searchParams.get('cursor');
    if(cursor){const o=await ownOrder(cursor,u.uid,true);q=q.startAfter(o.createdAt,o.id);}
    const docs=await q.get();return respond({orders:await Promise.all(docs.docs.map(async d=>publicOrder(await ownOrder(d.id,u.uid,true),true))),nextCursor:docs.size===50?docs.docs[49].id:null});
  }catch(e){return failure(e);}
}
export async function POST(req:NextRequest){
  try{
    sameSite(req);const u=await staff(req,'write'),b=await bodyJson(req),o=await ownOrder(b.id,u.uid,true);let updated;
    if(b.action==='refund'){if(b.accepted!==true)throw new CheckoutError('Confirm the refund amount first.',400);updated=await refundLiveOrder(o,u.uid);}
    else if(b.action==='receipt'){const status=await sendLiveReceipt(o.id,true);if(status!=='sent'){const latest=await ownOrder(o.id,u.uid,true);throw new CheckoutError(latest.receiptEmailError||('Receipt email '+status+'. Check email configuration and retry.'),503);}updated=await ownOrder(o.id,u.uid,true);}
    else if(b.action==='approve')updated=await approveQuote(serverDb(),o.id,u.uid,b);
    else if(b.action==='sync'){updated=await reconcile(o);if(updated.paymentStatus==='Paid'&&(updated.refundRequest||updated.refundPending||updated.refundedAmount))updated=await syncLiveRefund(updated);}
    else if(b.action==='cancel')updated=o.sessionAttemptedAt?await reconcile(o,true):await cancelQuote(serverDb(),o.id,u.uid,true);
    else if(b.action==='fulfill')updated=await fulfillOrder(serverDb(),o.id,u.uid,b);
    else if(b.action==='restock')updated=await restockRefund(serverDb(),o.id,u.uid);
    else throw new CheckoutError('Unknown order action.',400);
    return respond({order:publicOrder(updated,true)});
  }catch(e){return failure(e);}
}
