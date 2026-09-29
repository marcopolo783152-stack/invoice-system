import {packedRug} from './shipping-package.mjs';
import {createHash} from 'node:crypto';
import {CheckoutError, checkoutInput, priceCart} from './rug-checkout.mjs';
import {isRugOnReviewHold} from '../catalog-visibility.mjs';
import {checkoutOriginKnown, checkoutRegionAllowed} from './checkout-region.mjs';

export const LIVE_ORDERS = 'showroom_live_orders';
export const PROMO_LOCKS = 'showroom_checkout_promos';
const fail = (message, status = 409) => { throw new CheckoutError(message, status); };
const iso = now => new Date(now).toISOString();
export function money(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 99999999) fail('Enter a valid amount with no more than two decimal places.', 400);
  return value;
}
export function orderId(uid, attempt) {
  if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(attempt || '')) fail('Refresh your checkout and retry.',400);
  return 'MPR-LIVE-' + createHash('sha256').update(uid + ':' + attempt).digest('hex').slice(0,32);
}
export function validOrderId(id) { return /^MPR-LIVE-[a-f0-9]{32}$/.test(id || ''); }
function available(rug) {
  return rug && !isRugOnReviewHold(rug) && checkoutOriginKnown(rug) && rug.availability === 'In Stock' && !rug.liveOrderId;
}
function customerInput(body, email) {
  const input = checkoutInput(body);
  if (input.customerInfo.email.toLowerCase() !== email.toLowerCase()) fail('Use the email address of your verified customer account.',400);
  return input;
}
export function publicOrder(order) {
  // This shape is returned only to the owning customer or authorized order staff.
  const keys = ['id','customerInfo','deliveryOption','items','subtotal','discount','shipping','tax','total','status','version','createdAt','quoteExpiresAt','quoteNote','taxNote','paymentStatus','paidAt','fulfillment','trackingNumber','carrier','reviewReason','lastPaymentError','refundedAmount','restockedAt','freeShipping','automaticTax','shippingService','shippingIncluded'];
  return Object.fromEntries(keys.filter(k => order[k] !== undefined).map(k => [k,order[k]]));
}
async function inventory(tx,db,items) {
  const refs = items.map(i => db.collection('showroom_rugs').doc(i.id));
  const snaps = await tx.getAll(...refs);
  return {refs, rugs:snaps.map(s => s.exists ? {...s.data(),id:s.id} : null)};
}

export async function createQuote(db,uid,email,body,attempt,now=Date.now()) {
  const input = customerInput(body,email), id=orderId(uid,attempt), ref=db.collection(LIVE_ORDERS).doc(id);
  const fingerprint=createHash('sha256').update(JSON.stringify(input)).digest('hex');
  return db.runTransaction(async tx => {
    const prior=(await tx.get(ref)).data();
    if(prior){if(prior.fingerprint!==fingerprint)fail('Your cart changed. Please start a new request.');return prior;}
    const limitRef=db.collection('showroom_live_order_limits').doc(uid),limit=(await tx.get(limitRef)).data();
    const recent=limit&&now-limit.startedAt<3600000;
    if(recent&&limit.count>=10)fail('Too many order requests. Please wait or call the showroom.',429);
    const {rugs}=await inventory(tx,db,input.items);
    if(rugs.some(r=>!available(r)))fail('A rug is unavailable. Please refresh your cart.');
    const promos=input.promoCode?await tx.get(db.collection('showroom_promocodes').where('code','==',input.promoCode).limit(2)):null;
    if(promos && promos.size!==1)fail('This promotion is unavailable.');
    const promo=promos?.docs[0];
    // Reuse established inventory/discount validation, not sandbox tax or freight estimates.
    const priced=priceCart(input,rugs,promo?.data(),now);
    const items=priced.items.map(item=>{
      const rug=rugs.find(r=>r.id===item.id);
      return {id:item.id,name:item.name,sku:item.sku,unitAmount:item.unitAmount,quantity:1,freePadding:true,
        origin: rug.origin,dimensions:String(rug.dimensions||''),image:String(rug.images?.[0]||'')};
    });
    const pickup=input.deliveryOption==='Pickup', tax=pickup?Math.round((priced.subtotal-priced.discount)*0.06):null;
    const value={id,customerId:uid,fingerprint,customerInfo:input.customerInfo,deliveryOption:input.deliveryOption,
      items,subtotal:priced.subtotal,discount:priced.discount,promoCode:input.promoCode,promoId:promo?.id||null,
      oneTimePromo:promo?.data().oneTimeUse===true,freeShipping:promo?.data().discountType==='free_shipping'||rugs.every(r=>r.isFreeShipping===true),shipping:pickup?0:null,tax,total:pickup?priced.subtotal-priced.discount+tax:null,
      status:pickup?'Ready for payment':'Awaiting quote',version:1,quoteExpiresAt:now+86400000,
      quoteNote:pickup?'Free pickup at 3260 Duke St, Alexandria, VA 22314.':'Choose a UPS service, then review the final total on Stripe before payment.',
      taxNote:pickup?'6% — Alexandria showroom pickup':'Delivery tax is calculated by Stripe before payment.',
      paymentStatus:'Unpaid',sessionId:null,createdAt:iso(now),fulfillment:'Not paid'};
    tx.create(ref,value);tx.set(limitRef,{startedAt:recent?limit.startedAt:now,count:recent?limit.count+1:1});return value;
  });
}

export async function approveQuote(db,id,staffUid,body,now=Date.now()) {
  const shipping=money(body.shipping),tax=money(body.tax);
  if(typeof body.taxNote!=='string'||!body.taxNote.trim()||body.taxNote.length>500)fail('Record the tax basis for this delivery address.',400);
  if(typeof body.quoteNote!=='string'||!body.quoteNote.trim()||body.quoteNote.length>1000)fail('Describe the delivery service and any exclusions.',400);
  return db.runTransaction(async tx=>{
    const ref=db.collection(LIVE_ORDERS).doc(id),o=(await tx.get(ref)).data();
    if(!o)fail('Order not found.',404);
    if(o.automaticTax)fail('UPS checkout prices cannot be manually overridden.');
    if(o.deliveryOption!=='Delivery'||!['Awaiting quote','Ready for payment'].includes(o.status)||o.sessionAttemptedAt)fail('This order cannot be repriced while payment is underway.');
    if(body.version!==o.version)fail('This quote changed. Refresh it before saving.');
    if(o.freeShipping&&shipping!==0)fail('This order includes free shipping. Enter a $0 shipping charge.');
    const {rugs}=await inventory(tx,db,o.items);
    if(rugs.some((r,i)=>!available(r)||Math.round(r.price*100)!==o.items[i].unitAmount))fail('Inventory or pricing changed. Ask the customer to submit a new cart.');
    const total=money(o.subtotal-o.discount+shipping+tax);if(total<50)fail('The payable amount must be at least $0.50.');
    const update={shipping,tax,total,quoteNote:body.quoteNote.trim(),taxNote:body.taxNote.trim(),status:'Ready for payment',
      version:o.version+1,quoteExpiresAt:now+86400000,approvedBy:staffUid,approvedAt:iso(now)};
    tx.update(ref,update);tx.create(ref.collection('audit').doc(),{action:'Quote approved',by:staffUid,at:iso(now),before:{shipping:o.shipping,tax:o.tax,total:o.total,version:o.version},after:update});
    return {...o,...update};
  });
}

export async function reservePayment(db,id,uid,version,now=Date.now(),paymentUi='hosted') {
  return db.runTransaction(async tx=>{
    const ref=db.collection(LIVE_ORDERS).doc(id),o=(await tx.get(ref)).data();
    if(!o||o.customerId!==uid)fail('Order not found.',404);
    if(o.version!==version)fail('The quote changed. Review the latest total before paying.');
    if(o.paymentStatus==='Paid')return o;
    if(o.sessionAttemptedAt)return o; // The saved attempt always reuses identical Stripe parameters.
    if(o.status!=='Ready for payment'||o.quoteExpiresAt<=now)fail('This quote expired or is awaiting approval. Please contact the showroom.');
    if(!checkoutRegionAllowed(o.customerInfo))fail('Order addresses need review.');
    const payable=o.automaticTax?o.subtotal-o.discount+o.shipping:o.total;
    money(payable);if(payable<50)fail('Invalid payment amount.');
    const {refs,rugs}=await inventory(tx,db,o.items);
    if(rugs.some((r,i)=>!available(r)||Math.round(r.price*100)!==o.items[i].unitAmount))fail('A rug is unavailable or its price changed. Please request a new quote.');
    if(o.automaticTax&&JSON.stringify(rugs.map(packedRug))!==JSON.stringify(o.shippingParcels))fail('Packed measurements changed. Refresh your UPS shipping rates.');
    let promo=null,lock=null;
    if(o.promoId){promo=(await tx.get(db.collection('showroom_promocodes').doc(o.promoId))).data();lock=(await tx.get(db.collection(PROMO_LOCKS).doc(o.promoId))).data();}
    if(o.promoId){
      const quote=priceCart({items:o.items,deliveryOption:o.deliveryOption,promoCode:o.promoCode},rugs,promo,now);
      if(quote.discount!==o.discount||promo.oneTimeUse!==o.oneTimePromo)fail('The promotion changed. Please request a new quote.');
      if(o.oneTimePromo&&lock&&lock.orderId!==id)fail('This one-time promotion is already reserved.');
    }
    const freeShipping=promo?.discountType==='free_shipping'||rugs.every(r=>r.isFreeShipping===true);
    if(freeShipping!==o.freeShipping)fail('The shipping promotion changed. Please request a new quote.');
    refs.forEach(r=>tx.update(r,{availability:'Reserved',liveOrderId:id}));
    if(o.oneTimePromo)tx.set(db.collection(PROMO_LOCKS).doc(o.promoId),{orderId:id,status:'Reserved'});
    const update={paymentUi,status:'Payment pending',sessionAttemptedAt:iso(now),sessionExpiresAt:Math.floor(now/1000)+3600,termsAcceptedAt:iso(now),termsVersion:'showroom-sales-20260929',acceptedQuoteVersion:version};
    tx.update(ref,update);return {...o,...update};
  });
}

export function liveSessionParams(o,origin) {
  let remaining=o.discount;
  const line_items=o.items.map((item,i)=>{
    const reduction=i===o.items.length-1?remaining:Math.min(remaining,Math.floor(o.discount*item.unitAmount/o.subtotal));remaining-=reduction;
    return {quantity:1,price_data:{currency:'usd',unit_amount:item.unitAmount-reduction,product_data:{name:('Marco Polo Rugs — '+item.name).slice(0,250),description:'SKU '+item.sku+'. Complimentary rug padding included.'}}};
  });
  for(const [key,name] of [['shipping','Delivery'],['tax','Sales tax']])if(!o.automaticTax&&o[key])line_items.push({quantity:1,price_data:{currency:'usd',unit_amount:o[key],product_data:{name:'Marco Polo Rugs — '+name}}});
  if(o.shippingIncluded){let left=o.shipping;line_items.forEach((line,i)=>{const share=i===line_items.length-1?left:Math.floor(o.shipping*o.items[i].unitAmount/o.subtotal);left-=share;line.price_data.unit_amount+=share;line.price_data.product_data.description+=' UPS delivery included.';});}
  if(o.automaticTax)for(const item of line_items)item.price_data.tax_behavior='exclusive';
  return {...(o.automaticTax?{automatic_tax:{enabled:true},shipping_options:[{shipping_rate_data:{display_name:o.shippingIncluded?'Shipping included — UPS '+o.shippingService:'UPS '+o.shippingService,type:'fixed_amount',fixed_amount:{amount:o.shippingIncluded?0:o.shipping,currency:'usd'},tax_behavior:'exclusive'}}]}:{}),mode:'payment',payment_method_types:['card'],line_items,customer_email:o.customerInfo.email,billing_address_collection:'required',
    client_reference_id:o.id,metadata:{purpose:'marcopolo_rug_live',orderId:o.id,version:String(o.version)},
    branding_settings:{display_name:'Marco Polo Rugs'},payment_intent_data:{description:'Marco Polo Rugs order '+o.id,metadata:{orderId:o.id}},
    ...(o.paymentUi==='embedded'?{ui_mode:'embedded',redirect_on_completion:'never'}:{success_url:origin+'/orders/pay?order='+o.id,cancel_url:origin+'/orders/pay?order='+o.id+'&cancelled=1'}),expires_at:o.sessionExpiresAt};
}
export function verifyLiveSession(o,s) {
  if(s.livemode!==true||!s.id?.startsWith('cs_live_')||(o.sessionId&&s.id!==o.sessionId)||s.metadata?.purpose!=='marcopolo_rug_live'||s.metadata?.orderId!==o.id||s.metadata?.version!==String(o.version)||s.client_reference_id!==o.id||s.currency!=='usd'||(!o.automaticTax&&s.amount_total!==o.total)||!o.sessionAttemptedAt)fail('Payment does not match this order.');
  if(o.automaticTax&&s.status==='complete'&&s.payment_status==='paid'){
    const tax=s.total_details?.amount_tax;
    if(s.automatic_tax?.enabled!==true||s.automatic_tax?.status!=='complete'||!Number.isSafeInteger(tax)||tax<0||s.total_details?.amount_discount!==0||s.total_details?.amount_shipping!==(o.shippingIncluded?0:o.shipping)||s.amount_total!==o.subtotal-o.discount+o.shipping+tax)fail('Payment tax or shipping does not match this order.');
  }
  return s.status==='complete'&&s.payment_status==='paid'?'Paid':s.status==='expired'?'Expired':'Pending';
}
export async function attachSession(db,id,s) {
  return db.runTransaction(async tx=>{
    const ref=db.collection(LIVE_ORDERS).doc(id),o=(await tx.get(ref)).data();if(!o)fail('Order not found.',404);
    verifyLiveSession(o,s);tx.update(ref,{sessionId:s.id});return {...o,sessionId:s.id};
  });
}

export async function settleSession(db,id,s,source,now=Date.now()) {
  return db.runTransaction(async tx=>{
    const ref=db.collection(LIVE_ORDERS).doc(id),o=(await tx.get(ref)).data();if(!o)fail('Order not found.',404);
    const state=verifyLiveSession(o,s);
    if(o.paymentStatus==='Paid')return o;
    if(state==='Pending')return o;
    const {refs,rugs}=await inventory(tx,db,o.items);
    const orderRef=db.collection('showroom_orders').doc(id),existing=(await tx.get(orderRef)).data();
    const promoLock=o.oneTimePromo?(await tx.get(db.collection(PROMO_LOCKS).doc(o.promoId))).data():null;
    let update;
    if(state==='Paid'){
      if(o.automaticTax){o.tax=s.total_details.amount_tax;o.total=s.amount_total;}
      const inventoryConflict=rugs.some(r=>!r||r.liveOrderId!==id||r.availability!=='Reserved'||isRugOnReviewHold(r)||!checkoutOriginKnown(r));
      const reviewReason=inventoryConflict?'Inventory requires staff review.':s.customer_details?.address?.country!=='US'?'Billing country requires staff review.':'';
      update={...(o.automaticTax?{tax:o.tax,total:o.total}:{}),status:reviewReason?'Paid — review required':'Paid',paymentStatus:'Paid',paidAt:iso(now),sessionId:s.id,
        paymentIntentId:typeof s.payment_intent==='string'?s.payment_intent:s.payment_intent?.id||null,
        reviewReason,fulfillment:reviewReason?'Review required':o.deliveryOption==='Pickup'?'Preparing for pickup':'Preparing for delivery',verifiedBy:source};
      refs.forEach((r,i)=>{if(rugs[i]?.liveOrderId===id)tx.update(r,{availability:reviewReason?'On Hold':'Sold'});});
      if(o.oneTimePromo&&promoLock?.orderId===id){tx.set(db.collection(PROMO_LOCKS).doc(o.promoId),{orderId:id,status:'Used'});tx.update(db.collection('showroom_promocodes').doc(o.promoId),{isActive:false,usedAt:iso(now),usedBy:o.customerInfo.name,usedCount:1});}
      if(!existing)tx.create(orderRef,{id,liveManaged:true,customerId:o.customerId,customerInfo:o.customerInfo,
        cartItems:o.items.map(i=>({quantity:1,rug:{id:i.id,name:i.name,sku:i.sku,price:i.unitAmount/100,origin:i.origin,dimensions:i.dimensions,images:i.image?[i.image]:[]}})),
        subtotal:o.subtotal/100,discountAmount:o.discount/100,tax:o.tax/100,shipping:o.shipping/100,total:o.total/100,
        deliveryOption:o.deliveryOption,status:reviewReason?'Pending Confirmation':'Confirmed',paymentDetails:{cardBrand:'Stripe — paid',last4:''},createdAt:o.createdAt});
    }else{
      update={status:'Expired',paymentStatus:'Unpaid',sessionId:s.id,expiredAt:iso(now),verifiedBy:source};
      refs.forEach((r,i)=>{if(rugs[i]?.liveOrderId===id&&rugs[i]?.availability==='Reserved')tx.update(r,{availability:'In Stock',liveOrderId:null});});
      if(o.oneTimePromo&&promoLock?.orderId===id&&promoLock.status==='Reserved')tx.delete(db.collection(PROMO_LOCKS).doc(o.promoId));
    }
    tx.update(ref,update);return {...o,...update};
  });
}

export async function cancelQuote(db,id,uid,staff=false,now=Date.now()) {
  return db.runTransaction(async tx=>{
    const ref=db.collection(LIVE_ORDERS).doc(id),o=(await tx.get(ref)).data();
    if(!o||(!staff&&o.customerId!==uid))fail('Order not found.',404);
    if(o.sessionAttemptedAt||o.paymentStatus==='Paid')fail('Use payment reconciliation for an active checkout; paid orders require a refund review.');
    if(o.status==='Cancelled')return o;
    const update={status:'Cancelled',cancelledAt:iso(now),cancelledBy:uid};tx.update(ref,update);return {...o,...update};
  });
}

export async function fulfillOrder(db,id,uid,body,now=Date.now()) {
  return db.runTransaction(async tx=>{
    const ref=db.collection(LIVE_ORDERS).doc(id),o=(await tx.get(ref)).data();if(!o)fail('Order not found.',404);
    if(o.paymentStatus!=='Paid'||o.reviewReason||o.refundedAmount>0)fail('Only a verified paid order without a refund or review hold can be fulfilled.');
    const allowed=o.deliveryOption==='Pickup'?['Ready for pickup','Collected']:['Shipped','Delivered'];
    if(!allowed.includes(body.fulfillment))fail('Choose a valid fulfillment status.',400);
    if(['Collected','Delivered'].includes(o.fulfillment)&&body.fulfillment!==o.fulfillment)fail('A completed order cannot move backwards.');
    const tracking=String(body.trackingNumber||'').trim(),carrier=String(body.carrier||'').trim();
    if(tracking.length>120||carrier.length>80)fail('Tracking details are too long.',400);
    if(body.fulfillment==='Shipped'&&(!tracking||!carrier))fail('Enter carrier and tracking details.',400);
    const update={fulfillment:body.fulfillment,trackingNumber:tracking,carrier,fulfilledBy:uid,fulfillmentUpdatedAt:iso(now)};
    tx.update(ref,update);tx.update(db.collection('showroom_orders').doc(id),{status:body.fulfillment==='Collected'?'Delivered':body.fulfillment==='Ready for pickup'?'Ready for Pickup':body.fulfillment,shippingDetails:{carrier,trackingNumber:tracking}});
    tx.create(ref.collection('audit').doc(),{action:'Fulfillment updated',by:uid,at:iso(now),before:o.fulfillment,after:body.fulfillment});return {...o,...update};
  });
}

export async function recordRefund(db,id,charge,now=Date.now()) {
  return db.runTransaction(async tx=>{
    const ref=db.collection(LIVE_ORDERS).doc(id),o=(await tx.get(ref)).data();
    const pi=typeof charge.payment_intent==='string'?charge.payment_intent:charge.payment_intent?.id;
    if(!o||o.paymentStatus!=='Paid'||charge.livemode!==true||pi!==o.paymentIntentId||charge.currency!=='usd'||charge.amount!==o.total)fail('Refund does not match the paid order.');
    const amount=money(charge.amount_refunded);if(amount>o.total)fail('Refund exceeds the order total.');
    const refundedAmount=Math.max(o.refundedAmount||0,amount);
    const update={refundedAmount,status:refundedAmount===o.total?'Refunded':refundedAmount>0?'Partially refunded':o.status,refundUpdatedAt:iso(now)};
    tx.update(ref,update);tx.update(db.collection('showroom_orders').doc(id),{paymentDetails:{cardBrand:refundedAmount===o.total?'Stripe — refunded':'Stripe — partially refunded',last4:''}});
    return {...o,...update};
  });
}

export async function restockRefund(db,id,uid,now=Date.now()) {
  return db.runTransaction(async tx=>{
    const ref=db.collection(LIVE_ORDERS).doc(id),o=(await tx.get(ref)).data();
    if(!o||o.refundedAmount!==o.total||o.paymentStatus!=='Paid')fail('Confirm a full Stripe refund before restocking.');
    if(o.restockedAt)return o;
    const {refs,rugs}=await inventory(tx,db,o.items);
    if(rugs.some(r=>!r||r.liveOrderId!==id))fail('Inventory changed. Review the rug records before restocking.');
    refs.forEach(r=>tx.update(r,{availability:'In Stock',liveOrderId:null}));
    const update={restockedAt:iso(now),restockedBy:uid,fulfillment:'Refunded and returned to stock'};
    tx.update(ref,update);tx.update(db.collection('showroom_orders').doc(id),{status:'Cancelled'});
    tx.create(ref.collection('audit').doc(),{action:'Restocked after full refund',by:uid,at:iso(now)});return {...o,...update};
  });
}
