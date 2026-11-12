import {CheckoutError} from './rug-checkout.mjs';
export async function claimRefundRequest(db,id,uid,now=Date.now()){
  const ref=db.collection('showroom_live_orders').doc(id);
  return db.runTransaction(async tx=>{
    const saved=(await tx.get(ref)).data();
    if(!saved||saved.paymentStatus!=='Paid'||!saved.paymentIntentId)throw new CheckoutError('Only a confirmed payment can be refunded.',409);
    if(saved.refundRequest)return saved.refundRequest;
    if(saved.refundPending||saved.refundedAmount>=saved.total)throw new CheckoutError('This payment is already refunded or a refund is pending.',409);
    const r={key:id+'-full-refund-v1',amount:saved.total-(saved.refundedAmount||0),at:now,by:uid};
    tx.update(ref,{refundRequest:r});
    tx.create(ref.collection('audit').doc(),{action:'Full remaining refund requested',by:uid,amount:r.amount,at:new Date(now).toISOString()});
    return r;
  });
}
