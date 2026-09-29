import {NextRequest} from 'next/server';
import {serverDb} from '@/lib/server/firebase-admin';
import {CheckoutError} from '@/lib/server/rug-checkout.mjs';
import {LIVE_ORDERS,createQuote,reservePayment,publicOrder,cancelQuote,settleSession} from '@/lib/server/live-orders.mjs';
import {respond,failure,customer,sameSite,bodyJson,orderFlags,ownOrder,liveStripe,checkPaymentAccount,sessionForOrder,reconcile} from '@/lib/server/live-payment';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
  try{
    if(req.nextUrl.searchParams.get('config')==='1')return respond(orderFlags());
    const u=await customer(req),id=req.nextUrl.searchParams.get('order');
    if(id)return respond({order:publicOrder(await ownOrder(id,u.uid)),...orderFlags()});
    const docs=await serverDb().collection(LIVE_ORDERS).where('customerId','==',u.uid).get();
    return respond({orders:docs.docs.map(d=>publicOrder(d.data())).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))),...orderFlags()});
  }catch(e){return failure(e);}
}
export async function POST(req:NextRequest){
  try{
    sameSite(req);const u=await customer(req),b=await bodyJson(req),flags=orderFlags();
    if(b.action==='create'){
      if(!flags.quotesEnabled)throw new CheckoutError('Online order requests are being prepared. Please call (703) 461-0207.',503);
      return respond({order:publicOrder(await createQuote(serverDb(),u.uid,u.email!,b.payload,req.headers.get('x-checkout-attempt')))});
    }
    const o=await ownOrder(b.id,u.uid);
    if(b.action==='sync')return respond({order:publicOrder(await reconcile(o))});
    if(b.action==='cancel')return respond({order:publicOrder(o.sessionAttemptedAt?await reconcile(o,true):await cancelQuote(serverDb(),o.id,u.uid))});
    if(b.action!=='pay')throw new CheckoutError('Unknown order action.',400);
    if(b.accepted!==true)throw new CheckoutError('Review and accept the order details before paying.',400);
    if(!flags.paymentsEnabled)throw new CheckoutError('Card payments are not open yet. Your order is saved.',503);
    const stripe=liveStripe();await checkPaymentAccount(stripe);
    const reserved=await reservePayment(serverDb(),o.id,u.uid,b.version);
    if(reserved.paymentStatus==='Paid')return respond({order:publicOrder(reserved)});
    const s=await sessionForOrder(reserved,stripe);
    if(s.status!=='open')return respond({order:publicOrder(await settleSession(serverDb(),o.id,s,'checkout return'))});
    const url=new URL(s.url||'');if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw new CheckoutError('Invalid payment address.',502);
    return respond({url:url.href});
  }catch(e){return failure(e);}
}
