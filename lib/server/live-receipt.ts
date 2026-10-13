import {assignOrderNumber} from './order-number.mjs';
import 'server-only';
import {serverDb} from './firebase-admin';
import {LIVE_ORDERS} from './live-orders.mjs';
import {emailConfiguration,sendSharedEmail} from './customer-emails';
import {renderCustomerEmail,SHOP} from '../customer-email.mjs';
const usd=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n||0)/100);
export async function sendLiveReceipt(id:string,resend=false){
  await assignOrderNumber(serverDb(),id);
  const db=serverDb(),ref=db.collection(LIVE_ORDERS).doc(id),now=Date.now();
  const order=await db.runTransaction(async tx=>{
    const o=(await tx.get(ref)).data();if(!o||o.paymentStatus!=='Paid')return null;
    if(!resend&&o.receiptEmailStatus==='sent')return null;
    if(now-(o.receiptEmailAttemptAt||0)<60000)return null;
    tx.update(ref,{receiptEmailStatus:'sending',receiptEmailAttemptAt:now});return o;
  });
  if(!order)return (await ref.get()).data()?.receiptEmailStatus||'unavailable';
  let status='failed',error='';
  try{
    if(!emailConfiguration().configured){status='not configured';error='Set EMAILJS_PRIVATE_KEY and EMAILJS_TEMPLATE_CUSTOMER_MESSAGES (or reuse EMAILJS_TEMPLATE_ORDER_RECEIPT) in Vercel, then redeploy.';}
    else {
      const details=[['Order',order.orderNumber],['Payment date',order.paidAt],...order.items.map((i:any)=>[i.name+' · SKU '+i.sku,usd(i.unitAmount)]),['Subtotal',usd(order.subtotal)],['Discount','−'+usd(order.discount)],['Fulfillment',order.deliveryOption],['Shipping',order.deliveryOption==='Pickup'?'Showroom pickup':order.shipping===0?'Free shipping':usd(order.shipping)],['Sales tax',usd(order.tax)],['Total paid',usd(order.total)],...(order.refundedAmount?[['Refunded',usd(order.refundedAmount)],['Remaining paid',usd(order.total-order.refundedAmount)]]:[]),['Delivery address',order.deliveryOption==='Pickup'?SHOP.address:order.customerInfo.shippingAddress]];
      const message=renderCustomerEmail({title:'Your payment receipt',name:order.customerInfo.name,intro:'Your payment is confirmed. Thank you for choosing Marco Polo. Please keep this receipt for your records.',details,paragraphs:['Complimentary rug padding included. All sales final; exchanges within one week. Full payment required before pickup or delivery.','Track your order using the order number above and the email you used at checkout. No account is needed.'],button:{label:'View your order',url:SHOP.url+'/?view=track&track='+encodeURIComponent(order.orderNumber||id)}});
      const result=await sendSharedEmail(order.customerInfo.email,'Order receipt — Marco Polo Rugs — '+order.orderNumber,message);
      status=result.status==='accepted'?'sent':result.status==='not_configured'?'not configured':'failed';error=result.error;
    }
  }catch{status='failed';error='Email service could not be reached. Check provider history before resending.';}
  await ref.update({receiptEmailStatus:status,receiptEmailError:error,receiptEmailUpdatedAt:new Date().toISOString()});
  await db.collection('showroom_orders').doc(id).update({'notifications.receipt':{status,updatedAt:new Date().toISOString()}});
  return status;
}
