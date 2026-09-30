'use client';
import {useEffect,useState} from 'react';
import {LiveOrder,orderRequest,usd} from './client';
import styles from './LiveOrders.module.css';
export default function LiveOrderAdminControls({id}:{id:string}){
  const [order,setOrder]=useState<LiveOrder|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [fulfillment,setFulfillment]=useState(''),[carrier,setCarrier]=useState(''),[trackingNumber,setTracking]=useState('');
  useEffect(()=>{let active=true;orderRequest('/api/live-orders/manage?order='+encodeURIComponent(id)).then(d=>{if(active){setOrder(d.order);setFulfillment(d.order.fulfillment);setCarrier(d.order.carrier||'');setTracking(d.order.trackingNumber||'');}}).catch(e=>{if(active)setMessage(e.message);});return()=>{active=false;};},[id]);
  async function act(action:string,extra:Record<string,unknown>={}){
    if(busy)return;setBusy(true);setMessage('');
    try{const d=await orderRequest('/api/live-orders/manage',{action,id,...extra});setOrder(d.order);setMessage(action==='receipt'?'Receipt email sent.':action==='refund'?(d.order.refundPending?'Refund submitted; Stripe is processing it.':'Refund updated.'):'Order updated.');}catch(e){setMessage(e instanceof Error?e.message:'Please retry.');try{const fresh=await orderRequest('/api/live-orders/manage?order='+encodeURIComponent(id));setOrder(fresh.order);}catch{}}finally{setBusy(false);}
  }
  if(!order)return <div className={styles.request}><p role="status">{message||'Loading payment controls…'}</p></div>;
  const paid=order.paymentStatus==='Paid',remaining=(order.total||0)-(order.refundedAmount||0);
  return <section className={styles.request}><h3>Payment &amp; order controls</h3><p>{order.status} · {usd(order.total)}<br/>Receipt email: {order.receiptEmailStatus||'Not sent yet'}</p>
    {(order.refundedAmount||0)>0&&<p>Refunded: {usd(order.refundedAmount||0)}</p>}
    {order.refundPending&&<p>Refund is processing. Rugs remain off sale until return is confirmed.</p>}
    <div className={styles.actions}>
      {paid&&<button type="button" disabled={busy} onClick={()=>act('receipt')}>Email receipt / resend</button>}
      {paid&&remaining>0&&!order.refundPending&&<button type="button" disabled={busy} onClick={()=>{if(window.confirm('Refund '+usd(remaining)+' to the customer’s original payment method? This sends money back and cannot be undone.'))void act('refund',{accepted:true});}}>Refund {usd(remaining)}</button>}
      {paid&&remaining===0&&!order.refundPending&&!order.restockedAt&&<button type="button" disabled={busy} onClick={()=>{if(window.confirm('Confirm the rugs are physically returned or were never dispatched and can be sold again.'))void act('restock');}}>Confirm return &amp; restock</button>}
      {!paid&&<button type="button" disabled={busy} onClick={()=>{if(window.confirm('Close this unpaid checkout?'))void act('cancel');}}>Cancel unpaid checkout</button>}
      <button type="button" disabled={busy} onClick={()=>act('sync')}>Refresh order</button>
    </div>
    {paid&&!order.refundedAmount&&!order.refundPending&&!order.reviewReason&&<form className={styles.form} onSubmit={e=>{e.preventDefault();void act('fulfill',{fulfillment,carrier,trackingNumber});}}><label>Order status<select value={fulfillment} onChange={e=>setFulfillment(e.target.value)}><option value={order.fulfillment}>{order.fulfillment}</option>{(order.deliveryOption==='Pickup'?['Ready for pickup','Collected']:['Shipped','Delivered']).filter(s=>s!==order.fulfillment).map(s=><option key={s}>{s}</option>)}</select></label>{order.deliveryOption==='Delivery'&&<><label>Carrier<input required maxLength={80} value={carrier} onChange={e=>setCarrier(e.target.value)}/></label><label>Tracking number<input required maxLength={120} value={trackingNumber} onChange={e=>setTracking(e.target.value)}/></label></>}<button type="submit" disabled={busy}>Save order status</button></form>}
    {order.receiptEmailError&&<p role="alert">{order.receiptEmailError}</p>}
    {message&&<p role="status">{message}</p>}
  </section>;
}
