'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {onAuthStateChanged} from 'firebase/auth';
import {auth} from '@/lib/auth';
import {LiveOrder,orderRequest,usd,dollarsToCents} from './client';
import styles from './LiveOrders.module.css';

export default function LiveOrders({admin=false}:{admin?:boolean}){
  const [signed,setSigned]=useState(false),[loaded,setLoaded]=useState(false),[orders,setOrders]=useState<LiveOrder[]>([]),[selected,setSelected]=useState<LiveOrder|null>(null);
  const [rates,setRates]=useState<{id:string;amount:number;service:string;days:number|null}[]>([]);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[enabled,setEnabled]=useState(false),[cursor,setCursor]=useState<string|null>(null),[agreed,setAgreed]=useState(false);
  const [showClosed,setShowClosed]=useState(false);
  const running=useRef(false),endpoint=admin?'/api/live-orders/manage':'/api/live-orders';
  const load=useCallback(async(more?:string)=>{
    const data=await orderRequest(endpoint+(more?'?cursor='+encodeURIComponent(more):''));
    setOrders(prev=>more?[...prev,...data.orders]:data.orders);setCursor(data.nextCursor||null);setEnabled(data.paymentsEnabled===true);
  },[endpoint]);
  useEffect(()=>onAuthStateChanged(auth,u=>{
    const ready=!!u&&!u.isAnonymous&&u.emailVerified;setSigned(ready);setLoaded(true);setOrders([]);setSelected(null);setError('');
    if(ready){void load().catch(e=>setError(e.message));const id=new URLSearchParams(window.location.search).get('order');
      if(id)void orderRequest(endpoint+'?order='+encodeURIComponent(id)).then(d=>{setSelected(d.order);setEnabled(d.paymentsEnabled===true);}).catch(e=>setError(e.message));}
  }),[load,endpoint]);
  async function act(action:string,extra:Record<string,unknown>={}){
    if(!selected||running.current)return;running.current=true;setBusy(true);setError('');setNotice('');
    try{
      const data=await orderRequest(endpoint,{action,id:selected.id,version:selected.version,...extra});
      if(data.url){const url=new URL(data.url);if(url.hostname!=='checkout.stripe.com'||url.protocol!=='https:')throw Error('Invalid payment address.');window.location.assign(url.href);return;}
      if(data.rates){setRates(data.rates);return;}
      if(data.order){setRates([]);setSelected(data.order);setAgreed(false);}await load();setNotice(action==='approve'?'Quote saved. Copy the customer link and contact the customer. No email was sent.':'Order status updated.');
    }catch(e){setError(e instanceof Error?e.message:'Please retry.');}finally{running.current=false;setBusy(false);}
  }
  function select(o:LiveOrder){setRates([]);setSelected(o);setAgreed(false);setNotice('');setError('');window.history.replaceState(null,'','?order='+encodeURIComponent(o.id));}
  const o=selected,paid=o?.paymentStatus==='Paid',expired=!!o&&o.quoteExpiresAt<=Date.now();
  return <main className={styles.page}><div className={styles.wrap}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Marco Polo Rugs · Since 1988</p><h1>{admin?'Online orders':'Your order, clearly priced.'}</h1></div><a className={styles.button+' '+styles.secondary} href={admin?'/?view=admin':'/?view=shop'}>{admin?'Return to admin':'Browse rugs'}</a></header>
    {!loaded?<p>Loading…</p>:!signed?<section className={styles.card}><h2>Sign in to continue</h2><p>Please use your verified {admin?'staff':'customer'} account.</p><a className={styles.button} href={admin?'/staff-login?next=%2Fadmin%2Fonline-orders':'/sign-in'}>Sign in</a></section>:<>
      {error&&<p className={styles.error} role="alert">{error}</p>}{notice&&<p className={styles.notice} role="status">{notice}</p>}
      <div className={styles.grid}><aside className={styles.card+' '+styles.sidebar}><h2>{admin?'Order inbox':'My orders'}</h2><button className={styles.secondary} onClick={()=>load().catch(e=>setError(e.message))}>Refresh list</button>
        <label className={styles.check}><input type="checkbox" checked={showClosed} onChange={e=>setShowClosed(e.target.checked)}/>Show canceled and expired attempts</label>
        <div className={styles.list}>{orders.filter(order=>showClosed||!['Cancelled','Expired'].includes(order.status)).map(order=><button key={order.id} className={styles.listButton+(o?.id===order.id?' '+styles.selected:'')} onClick={()=>select(order)}>{admin?order.customerInfo.name:order.items[0]?.name}<small>{order.status} · {order.deliveryOption}</small><small>{usd(order.total??order.subtotal-order.discount+(order.shipping||0))}{order.total===null?' before tax':''} · {new Date(order.createdAt).toLocaleDateString()}</small></button>)}</div>
        {!orders.length&&<p className={styles.empty}>No online requests to display.</p>}{cursor&&<button className={styles.secondary} onClick={()=>load(cursor).catch(e=>setError(e.message))}>Load older orders</button>}
      </aside><section className={styles.card}>{!o?<><h2>Select an order</h2><p className={styles.muted}>{admin?'Manage payments, shipping, and pickup for online orders.':'Pickup is free. Choose UPS shipping and review the total before payment. You can return here to check your order.'}</p></>:<>
        <span className={styles.status}>{o.status}</span><h2 style={{marginTop:16}}>{o.deliveryOption==='Pickup'?'Showroom pickup':'Delivery order'}</h2><p className={styles.reference}>{o.id}</p>
        <p className={styles.muted}>Requested {new Date(o.createdAt).toLocaleString()}{o.paidAt?' · Paid '+new Date(o.paidAt).toLocaleString():''}</p>
        <div className={styles.items}>{o.items.map(i=><div className={styles.item} key={i.id}>{i.image&&<img src={i.image} alt={i.name}/>}<div><strong>{i.name}</strong><p className={styles.muted}>SKU {i.sku} · {i.dimensions}<br/>Complimentary padding included</p></div><span className={styles.amount}>{usd(i.unitAmount)}</span></div>)}</div>
        <dl className={styles.totals}><div><dt>{o.shippingIncluded?"Rugs including delivery":"Rugs"}</dt><dd>{usd(o.subtotal+(o.shippingIncluded?(o.shipping||0):0))}</dd></div>{o.discount>0&&<div><dt>Discount</dt><dd>−{usd(o.discount)}</dd></div>}<div><dt>{o.deliveryOption==='Pickup'?'Pickup':'Shipping'}</dt><dd>{o.deliveryOption==='Pickup'?'Free':o.shippingIncluded?'Free — included in price':usd(o.shipping)}</dd></div><div><dt>{o.deliveryOption==='Pickup'?'Sales tax (6%)':'Sales tax'}</dt><dd>{o.automaticTax&&!paid?'Calculated by Stripe before payment':usd(o.tax)}</dd></div><div className={styles.total}><dt>{o.automaticTax&&!paid?'Order total before tax':'Total'}</dt><dd>{o.automaticTax&&!paid?usd(o.subtotal-o.discount+(o.shipping||0)):usd(o.total)}</dd></div></dl>
        {(o.refundedAmount||0)>0&&<p className={styles.notice}>Refund recorded: {usd(o.refundedAmount||0)}. Refunds do not automatically return rugs to stock.</p>}
        {admin&&o.refundedAmount===o.total&&paid&&!o.restockedAt&&<button className={styles.secondary} disabled={busy} onClick={()=>{if(window.confirm('Confirm all rugs have been physically returned or were never dispatched, and may be offered for sale again.'))void act('restock');}}>Confirm return &amp; restock</button>}
        <p className={styles.address}><strong>{o.customerInfo.name}</strong><br/>{o.customerInfo.email}<br/>{o.customerInfo.phone}<br/>{o.customerInfo.shippingAddress}</p>
        <p className={styles.muted}>Billing: {o.customerInfo.billingAddress}</p>{o.customerInfo.notes&&<p className={styles.address}>Notes: {o.customerInfo.notes}</p>}
        <div className={styles.notice}>{o.quoteNote}<br/><span className={styles.muted}>{o.taxNote}</span>{!paid&&o.status==='Ready for payment'&&<p>Quote {expired?'expired':'valid until'} {new Date(o.quoteExpiresAt).toLocaleString()}. Availability is checked again when payment starts.</p>}</div>
        {o.reviewReason&&<p className={styles.error}>Payment received. {o.reviewReason} Contact the showroom before arranging delivery or pickup.</p>}
        {paid&&<><h3>{o.fulfillment}</h3>{o.trackingNumber&&<p>{o.carrier}: {o.trackingNumber}</p>}<div className={styles.actions}><button className={styles.secondary} onClick={()=>window.print()}>Print receipt / save PDF</button></div></>}
        {admin?<>
          {!o.automaticTax&&o.deliveryOption==='Delivery'&&['Awaiting quote','Ready for payment'].includes(o.status)&&<QuoteForm key={o.id+o.version} order={o} busy={busy} save={data=>act('approve',data)} error={setError}/>}
          {paid&&!o.reviewReason&&!o.refundedAmount&&<FulfillmentForm key={o.id+o.fulfillment} order={o} busy={busy} save={data=>act('fulfill',data)}/>}
          <div className={styles.actions}><button disabled={busy} className={styles.secondary} onClick={()=>act('sync')}>Check payment status</button><button className={styles.secondary} onClick={async()=>{try{await navigator.clipboard.writeText('https://www.marcopolorugs.com/orders/pay?order='+o.id);setNotice('Customer link copied. The customer must sign in with their account.');}catch{setNotice('Customer link: https://www.marcopolorugs.com/orders/pay?order='+o.id);}}}>Copy customer link</button></div>
        </>:<>
          {!paid&&o.pricingPolicy!=='weight-inclusive-v1'&&o.deliveryOption==='Delivery'&&['Awaiting quote','Ready for payment'].includes(o.status)&&<section className={styles.form}><h3>Choose UPS shipping</h3><button disabled={busy} onClick={()=>act('rates')}>Get / refresh UPS rates</button>{rates.map(rate=><button key={rate.id} disabled={busy} className={styles.secondary} onClick={()=>act('selectShipping',{rateId:rate.id})}>{rate.service} — delivered price {usd(o.subtotal-o.discount+(o.freeShipping?0:rate.amount))} before tax; shipping included{rate.days?' · estimated '+rate.days+' business days':''}</button>)}</section>}
          {!paid&&['Ready for payment','Payment pending'].includes(o.status)&&<><label className={styles.check}><input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/><span>I reviewed the rugs, {o.deliveryOption==='Pickup'?'pickup':'delivery'} details, and {o.automaticTax?'shipping price. I will review the final tax and total on Stripe before paying':'total of '+usd(o.total)}. I understand that all sales are final, exchanges are available within one week, and full payment is required before pickup or delivery.</span></label><div className={styles.actions}><button disabled={busy||!agreed||!enabled||(expired&&o.status!=='Payment pending')} onClick={()=>act('pay',{accepted:agreed})}>{busy?'Please wait…':o.automaticTax?'Continue to secure payment':'Pay '+usd(o.total)+' securely'}</button></div>{!enabled&&<p className={styles.notice}>Card payments are not open yet. Your request is saved; call (703) 461-0207 for assistance.</p>}</>}
          {o.status==='Awaiting quote'&&<p className={styles.notice}>Select a UPS service above to continue to payment. No payment has been taken.</p>}
          <div className={styles.actions}><button disabled={busy} className={styles.secondary} onClick={()=>act('sync')}>Check payment status</button></div>
        </>}
        {!paid&&!['Cancelled','Expired'].includes(o.status)&&<div className={styles.actions}><button disabled={busy} className={styles.secondary} onClick={()=>{if(window.confirm('Cancel this order request and close any unpaid checkout?'))void act('cancel');}}>Cancel unpaid request</button></div>}
        <p className={styles.muted}>Questions? <a href="tel:+17034610207">(703) 461-0207</a> · 3260 Duke St, Alexandria, VA 22314</p>
      </>}</section></div>
    </>}
  </div></main>;
}
function QuoteForm({order,busy,save,error}:{order:LiveOrder;busy:boolean;save:(data:Record<string,unknown>)=>void;error:(message:string)=>void}){
  const [shipping,setShipping]=useState(order.freeShipping?'0.00':order.shipping===null?'':(order.shipping/100).toFixed(2)),[tax,setTax]=useState(order.tax===null?'':(order.tax/100).toFixed(2)),[taxNote,setTaxNote]=useState(''),[quoteNote,setQuoteNote]=useState('');
  return <form className={styles.form} onSubmit={e=>{e.preventDefault();try{save({shipping:dollarsToCents(shipping),tax:dollarsToCents(tax),taxNote,quoteNote});}catch(e){error(e instanceof Error?e.message:'Check the amounts.');}}}><h2>Approve delivery quote</h2><label>Shipping charge ($)<input required inputMode="decimal" readOnly={order.freeShipping} value={shipping} onChange={e=>setShipping(e.target.value)}/></label><label>Applicable sales tax ($)<input required inputMode="decimal" value={tax} onChange={e=>setTax(e.target.value)}/></label><label>Tax basis for this delivery address<textarea required maxLength={500} placeholder="Record the applicable rate or reason no tax is collected, verified with your tax adviser." value={taxNote} onChange={e=>setTaxNote(e.target.value)}/></label><label>Delivery service and conditions<textarea required maxLength={1000} placeholder="Carrier/service, estimated timing, and whether inside delivery is included." value={quoteNote} onChange={e=>setQuoteNote(e.target.value)}/></label><p className={styles.muted}>This replaces the previous quote and is valid for 24 hours. No payment is taken and no customer email is sent.</p><button disabled={busy}>Save approved quote</button></form>;
}
function FulfillmentForm({order,busy,save}:{order:LiveOrder;busy:boolean;save:(data:Record<string,unknown>)=>void}){
  const [fulfillment,setFulfillment]=useState(order.deliveryOption==='Pickup'?'Ready for pickup':'Shipped'),[carrier,setCarrier]=useState(order.carrier||''),[trackingNumber,setTrackingNumber]=useState(order.trackingNumber||'');
  return <form className={styles.form} onSubmit={e=>{e.preventDefault();save({fulfillment,carrier,trackingNumber});}}><h2>Fulfillment</h2><label>Status<select value={fulfillment} onChange={e=>setFulfillment(e.target.value)}>{(order.deliveryOption==='Pickup'?['Ready for pickup','Collected']:['Shipped','Delivered']).map(s=><option key={s}>{s}</option>)}</select></label>{order.deliveryOption==='Delivery'&&<><label>Carrier<input maxLength={80} value={carrier} onChange={e=>setCarrier(e.target.value)}/></label><label>Tracking number<input maxLength={120} value={trackingNumber} onChange={e=>setTrackingNumber(e.target.value)}/></label></>}<button disabled={busy}>Save fulfillment</button></form>;
}
