import {NextRequest} from 'next/server';
import Stripe from 'stripe';
import {serverDb} from '@/lib/server/firebase-admin';
import {liveStripe,respond,ownOrder,reconcile} from '@/lib/server/live-payment';
import {validOrderId,settleSession,recordRefund} from '@/lib/server/live-orders.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(req:NextRequest){
  const secret=process.env.STRIPE_LIVE_WEBHOOK_SECRET?.trim();
  if(!secret?.startsWith('whsec_'))return respond({error:'Webhook not configured.'},503);
  let event:Stripe.Event;
  try{
    const raw=await req.text();if(raw.length>1000000)return respond({error:'Payload too large.'},413);
    event=liveStripe().webhooks.constructEvent(raw,req.headers.get('stripe-signature')||'',secret);
  }catch{return respond({error:'Invalid signature.'},400);}
  if(!event.livemode||event.account)return respond({error:'Unexpected event mode or account.'},400);
  if(event.type==='charge.refunded'){
    try{
      const stripe=liveStripe(),charge=await stripe.charges.retrieve((event.data.object as Stripe.Charge).id);
      const piId=typeof charge.payment_intent==='string'?charge.payment_intent:charge.payment_intent?.id;
      if(!piId)return respond({received:true});
      const pi=await stripe.paymentIntents.retrieve(piId),id=pi.metadata?.orderId;
      if(!validOrderId(id))return respond({received:true});
      await reconcile(await ownOrder(id,'',true));await recordRefund(serverDb(),id,charge);return respond({received:true});
    }catch{return respond({error:'Refund update incomplete; retry delivery.'},500);}
  }
  if(!['checkout.session.completed','checkout.session.expired','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed'].includes(event.type))return respond({received:true});
  const s=event.data.object as Stripe.Checkout.Session;
  if(s.metadata?.purpose!=='marcopolo_rug_live')return respond({received:true});
  const id=s.metadata?.orderId;if(!validOrderId(id))return respond({error:'Invalid order reference.'},400);
  try{
    // Retrieve canonical payment state. Never fulfill from the return URL or event type alone.
    const latest=await liveStripe().checkout.sessions.retrieve(s.id);
    await settleSession(serverDb(),id,latest,'signed live webhook');return respond({received:true});
  }catch{return respond({error:'Order update incomplete; retry delivery.'},500);}
}
