import {NextResponse} from 'next/server';
import Stripe from 'stripe';
import {serverDb} from '@/lib/server/firebase-admin';
import {syncTestIntent} from '@/lib/auction/payment.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(req:Request){
 const key=process.env.STRIPE_AUCTION_TEST_SECRET_KEY?.trim(),secret=process.env.STRIPE_AUCTION_TEST_WEBHOOK_SECRET?.trim();
 if(process.env.MARCO_POLO_AUCTION_STRIPE_TEST_ENABLED!=='true'||!key?.startsWith('sk_test_')||!secret)return NextResponse.json({error:'Auction test webhook is disabled.'},{status:503});
 const signature=req.headers.get('stripe-signature');if(!signature)return NextResponse.json({error:'Signature required.'},{status:400});
 let event:Stripe.Event;try{event=new Stripe(key).webhooks.constructEvent(await req.text(),signature,secret);}catch{return NextResponse.json({error:'Invalid webhook signature.'},{status:400});}
 if(event.livemode||!['payment_intent.succeeded','payment_intent.payment_failed','payment_intent.processing','payment_intent.requires_action'].includes(event.type))return NextResponse.json({received:true,ignored:true});
 const object=event.data.object as Stripe.PaymentIntent;if(object.metadata?.purpose!=='marcopolo_auction_test')return NextResponse.json({received:true,ignored:true});
 try{await syncTestIntent(serverDb(),object);return NextResponse.json({received:true});}catch{return NextResponse.json({error:'Test payment reconciliation failed. Retry required.'},{status:500});}
}
