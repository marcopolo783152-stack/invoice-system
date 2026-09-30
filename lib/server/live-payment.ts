import 'server-only';
import Stripe from 'stripe';
import {NextResponse} from 'next/server';
import {serverDb,caller} from './firebase-admin';
import {liveSecret,MARCO_POLO_STRIPE_ACCOUNT} from './stripe-live-status.mjs';
import {CheckoutError} from './rug-checkout.mjs';
import {LIVE_ORDERS,liveSessionParams,attachSession,settleSession,validOrderId} from './live-orders.mjs';

export const LIVE_ORIGIN='https://www.marcopolorugs.com';
export const respond=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization'}});
export function orderFlags(){
  const quotes=process.env.MARCO_POLO_ORDER_QUOTES_ENABLED==='true'&&process.env.MARCO_POLO_LIVE_RULES_CONFIRMED==='true';
  return {quotesEnabled:quotes,paymentsEnabled:quotes&&process.env.MARCO_POLO_LIVE_CHECKOUT_ENABLED==='true'&&!!process.env.STRIPE_LIVE_SECRET_KEY&&!!process.env.STRIPE_LIVE_WEBHOOK_SECRET};
}
export function sameSite(req:Request){
  const origin=req.headers.get('origin');
  if(!['https://www.marcopolorugs.com','https://marcopolorugs.com'].includes(origin||'')||!['www.marcopolorugs.com','marcopolorugs.com'].includes(new URL(req.url).hostname))throw new CheckoutError('Open checkout on marcopolorugs.com.',403);
}
export async function customer(req:Request){
  let u;try{u=await caller(req);}catch{throw new CheckoutError('Sign in to your customer account.',401);}
  if(!u.email_verified||!u.email||u.firebase?.sign_in_provider==='anonymous')throw new CheckoutError('Verify your account email before requesting an order.',403);
  return u;
}
export async function bodyJson(req:Request){
  const raw=await req.text();if(raw.length>14000)throw new CheckoutError('Order details are too long.',400);
  try{return JSON.parse(raw);}catch{throw new CheckoutError('Invalid request.',400);}
}
export function failure(e:unknown){
  if(e instanceof CheckoutError)return respond({error:e.message},e.status);
  const stripeError=e instanceof Stripe.errors.StripeError?e:null;
  const reference=stripeError?.requestId&&/^req_[A-Za-z0-9]+$/.test(stripeError.requestId)?stripeError.requestId:crypto.randomUUID();
  // Log identifiers only: never key values, customer details, or raw provider messages.
  const parameter=stripeError?.param&&/^[A-Za-z0-9_\[\].]+$/.test(stripeError.param)?stripeError.param:undefined;
  console.error('Live checkout failed',{reference,type:stripeError?.type||'InternalError',code:stripeError?.code,parameter});
  return respond({error:'Secure payment could not load. Retry this checkout or contact Marco Polo Rugs. Reference: '+reference+(parameter?' (payment setting: '+parameter+')':'')},503);
}
export function liveStripe(){return new Stripe(liveSecret(process.env.STRIPE_LIVE_SECRET_KEY),{maxNetworkRetries:2,timeout:15000});}
export async function ownOrder(id:string,uid:string,staff=false){
  if(!validOrderId(id))throw new CheckoutError('Invalid order.',400);
  const o=(await serverDb().collection(LIVE_ORDERS).doc(id).get()).data();
  if(!o||(!staff&&o.customerId!==uid))throw new CheckoutError('Order not found.',404);return o;
}
export async function checkPaymentAccount(stripe:Stripe){
  const a=await stripe.accounts.retrieve(null);
  if(a.id!==MARCO_POLO_STRIPE_ACCOUNT||a.charges_enabled!==true||a.payouts_enabled!==true)throw new CheckoutError('Online payments are temporarily unavailable. Please contact the showroom.',503);
}
export async function sessionForOrder(o:any,stripe:Stripe){
  if(!o.sessionAttemptedAt)throw new CheckoutError('Start payment after reviewing your quote.');
  // After 24 hours Stripe may forget an idempotency key. Never recreate an unknown session then.
  if(!o.sessionId&&Date.now()-Date.parse(o.sessionAttemptedAt)>=23*3600000)throw new CheckoutError('Payment recovery needs showroom assistance. Inventory remains held; do not pay a second time.',409);
  const params=liveSessionParams(o,LIVE_ORIGIN) as Stripe.Checkout.SessionCreateParams;
  if(o.automaticTax&&!o.sessionId){
    if(process.env.MARCO_POLO_STRIPE_TAX_CONFIRMED!=='true')throw new CheckoutError('Automatic delivery tax is being configured. Please choose pickup or contact the showroom.',503);
    const a=o.customerInfo.deliveryAddress;
    const customer=await stripe.customers.create({name:o.customerInfo.name,email:o.customerInfo.email,shipping:{name:o.customerInfo.name,address:{line1:a.street1,line2:a.street2,city:a.city,state:a.state,postal_code:a.zip,country:'US'}},metadata:{orderId:o.id}},{idempotencyKey:o.id+'-shipping-customer'});
    params.customer=customer.id;delete params.customer_email;
  }
  const s=o.sessionId?await stripe.checkout.sessions.retrieve(o.sessionId):await stripe.checkout.sessions.create(params,{idempotencyKey:o.id});
  await attachSession(serverDb(),o.id,s);return s;
}
export async function reconcile(o:any,expire=false){
  if(!o.sessionAttemptedAt||o.paymentStatus==='Paid')return o;
  const stripe=liveStripe();let s=await sessionForOrder(o,stripe);
  if(expire&&s.status==='open'){
    try{s=await stripe.checkout.sessions.expire(s.id);}catch{s=await stripe.checkout.sessions.retrieve(s.id);}
  }
  return settleSession(serverDb(),o.id,s,'server reconciliation');
}
