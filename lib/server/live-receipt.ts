import {receiptEmailError} from './receipt-email-error.mjs';
import 'server-only';
import {serverDb} from './firebase-admin';
import {LIVE_ORDERS} from './live-orders.mjs';
const escape=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const usd=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100);
export async function sendLiveReceipt(id:string,resend=false){
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
    if(!process.env.EMAILJS_PRIVATE_KEY?.trim()){status='not configured';error='Add EMAILJS_PRIVATE_KEY to Vercel Production environment variables and redeploy.';}
    else {
      const rows=order.items.map((i:any)=>`<tr><td>${escape(i.name)} · SKU ${escape(i.sku)}</td><td>${usd(i.unitAmount)}</td></tr>`).join('');
      const message=`<div style="font-family:Arial;max-width:640px;margin:auto"><h1>Marco Polo Rugs</h1><h2>Payment receipt</h2><p>Thank you, ${escape(order.customerInfo.name)}. Your payment is confirmed.</p><p>Order: ${escape(id)}<br>Paid: ${escape(order.paidAt)}</p><table style="width:100%">${rows}<tr><td>Discount</td><td>−${usd(order.discount)}</td></tr><tr><td>${order.deliveryOption==='Pickup'?'Pickup':'Shipping'}</td><td>${order.shipping===0?'Free':usd(order.shipping)}</td></tr><tr><td>Tax</td><td>${usd(order.tax)}</td></tr><tr><th>Total paid</th><th>${usd(order.total)}</th></tr></table>${order.refundedAmount?'<p>Refunded: '+usd(order.refundedAmount)+'. Remaining paid amount: '+usd(order.total-order.refundedAmount)+'.</p>':''}<p>${escape(order.fulfillment)}<br>${escape(order.customerInfo.shippingAddress)}</p><p>Complimentary rug padding included. All sales final; exchanges within one week. Full payment required before pickup or delivery.</p><p>Save or print this email for your records. Questions: (703) 461-0207<br>3260 Duke St, Alexandria, VA 22314</p></div>`;
      const response=await fetch('https://api.emailjs.com/api/v1.0/email/send',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),body:JSON.stringify({service_id:process.env.EMAILJS_SERVICE_ID?.trim()||'marcopolo2',template_id:process.env.EMAILJS_TEMPLATE_INVOICE?.trim()||'rm8govh',user_id:process.env.EMAILJS_PUBLIC_KEY?.trim()||'Anj9zrEUo-VEWvMVw',accessToken:process.env.EMAILJS_PRIVATE_KEY.trim(),template_params:{to_email:order.customerInfo.email,subject:'Payment receipt — Marco Polo Rugs — '+id,message}})});
      status=response.ok?'sent':'failed';
      if(!response.ok)error=receiptEmailError(response.status,(await response.text()).slice(0,4000));
    }
  }catch{status='failed';error='Email service could not be reached. Retry in a minute.';}
  await ref.update({receiptEmailStatus:status,receiptEmailError:error,receiptEmailUpdatedAt:new Date().toISOString()});
  await db.collection('showroom_orders').doc(id).update({'notifications.receipt':{status,updatedAt:new Date().toISOString()}});
  return status;
}
