import {claimRefundRequest} from './live-refund-request.mjs';
import 'server-only';
import {serverDb} from './firebase-admin';
import {liveStripe} from './live-payment';
import {LIVE_ORDERS,recordRefund} from './live-orders.mjs';
import {CheckoutError} from './rug-checkout.mjs';
export async function syncLiveRefund(o:any){
  const stripe=liveStripe(),pi=await stripe.paymentIntents.retrieve(o.paymentIntentId);
  if(pi.livemode!==true||pi.metadata.orderId!==o.id||pi.currency!=='usd'||pi.amount!==o.total)throw new CheckoutError('Payment does not match this order.',409);
  const chargeId=typeof pi.latest_charge==='string'?pi.latest_charge:pi.latest_charge?.id;
  if(!chargeId)throw new CheckoutError('Paid charge not found.',409);
  const charge=await stripe.charges.retrieve(chargeId);
  const refunds=await stripe.refunds.list({charge:chargeId,limit:100}).autoPagingToArray({limit:10000});
  const amount=refunds.filter(r=>r.status==='succeeded').reduce((sum,r)=>sum+r.amount,0),pending=refunds.some(r=>!['succeeded','failed','canceled'].includes(r.status||''));
  await recordRefund(serverDb(),o.id,{...charge,amount_refunded:amount});
  await serverDb().collection(LIVE_ORDERS).doc(o.id).update({refundPending:pending});
  return (await serverDb().collection(LIVE_ORDERS).doc(o.id).get()).data();
}
export async function refundLiveOrder(o:any,uid:string){
  if(o.paymentStatus!=='Paid'||!o.paymentIntentId)throw new CheckoutError('Only a confirmed payment can be refunded.',409);
  o=await syncLiveRefund(o);
  const db=serverDb(),ref=db.collection(LIVE_ORDERS).doc(o.id);
  const request=await claimRefundRequest(db,o.id,uid);
  if(!request.id&&Date.now()-request.at>23*3600000)throw new CheckoutError('Check this refund in Stripe before retrying; its earlier result is uncertain.',409);
  const stripe=liveStripe();
  const refund=request.id?await stripe.refunds.retrieve(request.id):await stripe.refunds.create({payment_intent:o.paymentIntentId,amount:request.amount,reason:'requested_by_customer',metadata:{orderId:o.id}},{idempotencyKey:request.key});
  await ref.update({'refundRequest.id':refund.id,'refundRequest.status':refund.status});
  if(['failed','canceled'].includes(refund.status||''))throw new CheckoutError('Stripe could not complete this refund. Review its recorded refund in Stripe before trying again.',409);
  return syncLiveRefund(o);
}
