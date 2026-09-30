'use client';
import {useEffect,useRef,useState} from 'react';
import {onAuthStateChanged,sendEmailVerification,signInAnonymously} from 'firebase/auth';
import AccountAccess from '@/components/AccountAccess';
import {browserSessionReady} from '@/lib/firebase';
import {auth} from '@/lib/auth';
import {LiveOrder,orderRequest,usd} from './client';
import styles from './LiveOrders.module.css';
let stripeScript:Promise<void>|undefined;
function loadStripeScript(){
  if((window as any).Stripe)return Promise.resolve();
  return stripeScript ||= new Promise<void>((resolve,reject)=>{const script=document.createElement('script');script.src='https://js.stripe.com/v3/';script.onload=()=>resolve();script.onerror=()=>{stripeScript=undefined;script.remove();reject(Error('Secure payment could not load. Please retry.'));};document.head.appendChild(script);});
}
export default function LiveOrderRequest({payload}:{payload:any}){
  const [accountOpen,setAccountOpen]=useState(false),[accountUser,setAccountUser]=useState<any>(null),[verificationNote,setVerificationNote]=useState('');
  const [signed,setSigned]=useState(false),[enabled,setEnabled]=useState(false),[payments,setPayments]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[agreed,setAgreed]=useState(false);
  const [order,setOrder]=useState<LiveOrder|null>(null),[rates,setRates]=useState<any[]>([]),[payment,setPayment]=useState<any>(null),[blocked,setBlocked]=useState<LiveOrder[]>([]);
  const mount=useRef<HTMLDivElement>(null),attempt=useRef({body:'',id:''}),running=useRef(false);
  useEffect(()=>onAuthStateChanged(auth,u=>{setAccountUser(u);setSigned(!!u&&(u.isAnonymous||u.emailVerified));setOrder(null);setPayment(null);setAgreed(false);}),[]);
  useEffect(()=>{void browserSessionReady.then(async()=>{if(!auth.currentUser)await signInAnonymously(auth);}).catch(()=>setError('Guest checkout could not connect. Please retry.'));},[]);
  useEffect(()=>{
    if(!accountUser||accountUser.isAnonymous||accountUser.emailVerified)return;
    let stopped=false;
    const check=async()=>{try{await accountUser.reload();const current=auth.currentUser;if(!stopped&&current&&current.uid===accountUser.uid&&current.emailVerified){await current.getIdToken(true);setAccountUser(current);setSigned(true);setAccountOpen(false);setVerificationNote('Email confirmed. Continuing checkout…');}}catch{}};
    const timer=setInterval(check,5000);window.addEventListener('focus',check);
    return()=>{stopped=true;clearInterval(timer);window.removeEventListener('focus',check);};
  },[accountUser]);
  useEffect(()=>{let active=true;fetch('/api/live-orders?config=1',{cache:'no-store'}).then(r=>r.json()).then(d=>{if(active){setEnabled(d.quotesEnabled===true);setPayments(d.paymentsEnabled===true);}}).catch(()=>{});return()=>{active=false;};},[]);
  useEffect(()=>{
    if(!payment)return;let active=true,checkout:any;
    loadStripeScript().then(async()=>{
      checkout=await (window as any).Stripe(payment.publishableKey).initEmbeddedCheckout({clientSecret:payment.clientSecret,onComplete:async()=>{
        try{const d=await orderRequest('/api/live-orders',{action:'sync',id:payment.orderId});if(active){setOrder(d.order);setPayment(null);}}catch(e){if(active)setError(e instanceof Error?e.message:'Please check your order payment status.');}
      }});
      if(active&&mount.current)checkout.mount(mount.current);else checkout.destroy();
    }).catch(e=>{if(active){setError(e.message);setPayment(null);}});
    return()=>{active=false;checkout?.destroy();};
  },[payment]);
  useEffect(()=>{if(signed&&enabled)void run('review');},[signed,enabled]);
  async function run(action:string,extra:any={}){
    if(running.current)return;running.current=true;setBusy(true);setError('');setBlocked([]);
    try{
      let o=order;
      if(!o){
        const value={...payload,customerInfo:{...payload.customerInfo,email:auth.currentUser?.isAnonymous?payload.customerInfo.email:auth.currentUser?.email||payload.customerInfo.email,billingCountry:'US',shippingCountry:'US'}};
        const body=JSON.stringify(value);if(attempt.current.body!==body||!attempt.current.id)attempt.current={body,id:crypto.randomUUID()};
        o=(await orderRequest('/api/live-orders',{action:'create',payload:value},attempt.current.id)).order;setOrder(o);
      }
      if(!o)throw Error('Please retry checkout.');
      if(action==='review'&&(o.deliveryOption==='Pickup'||o.pricingPolicy==='weight-inclusive-v1'))return;
      const d=await orderRequest('/api/live-orders',{action:action==='review'?'rates':action,id:o.id,version:o.version,...extra});
      if(d.rates)setRates(d.rates);
      if(d.order){setOrder(d.order);setAgreed(false);}
      if(d.clientSecret)setPayment({...d,orderId:o.id});
      else if(d.url)throw Error('This order already uses a separate payment page. Open My orders to finish it.');
    }catch(e){setError(e instanceof Error?e.message:'Could not complete checkout.');
      try{const d=await orderRequest('/api/live-orders');setBlocked((d.orders||[]).filter((saved:LiveOrder)=>saved.status==='Payment pending'&&saved.paymentStatus!=='Paid'&&saved.items.some(i=>payload.items.some((item:any)=>item.id===i.id))));}catch{}
    }finally{running.current=false;setBusy(false);}
  }
  return <section className={styles.request}>
    <h3 className="font-semibold text-lg">Review &amp; payment</h3>
    {signed&&accountUser?.isAnonymous&&<p>Guest checkout · No account required. <button type="button" onClick={()=>setAccountOpen(!accountOpen)}>Sign in or create an account (optional)</button></p>}
    {accountOpen&&<AccountAccess onComplete={()=>{setAccountOpen(false);setAccountUser(auth.currentUser);setSigned(!!auth.currentUser&&(auth.currentUser.isAnonymous||auth.currentUser.emailVerified));}}/>}
    {!signed?<div><p>Open the verification email sent to <strong>{accountUser?.email}</strong>. Check your <strong>Spam or Junk</strong> folder too. Keep this page open—we’ll continue automatically once your email is confirmed.</p><button type="button" disabled={busy} onClick={async()=>{if(!auth.currentUser)return;setBusy(true);try{await sendEmailVerification(auth.currentUser);setVerificationNote('Verification email sent. Please check your inbox and Spam or Junk folder.');}catch{setVerificationNote('Please wait a moment before requesting another email.');}finally{setBusy(false);}}}>Resend verification email</button></div>:<>
      {!order&&<><p>Your order summary and secure payment will appear here.</p><button type="button" disabled={!enabled||busy} onClick={()=>run('review')}>{busy?'Loading your order…':'Retry checkout'}</button></>}
      {order&&<>
        <div className={styles.items}>{order.items.map(i=><div key={i.id}><strong>{i.name}</strong> · SKU {i.sku} · {usd(i.unitAmount)}</div>)}</div>
        <p>{order.customerInfo.name}<br/>{order.customerInfo.shippingAddress}</p>
        {order.deliveryOption==='Delivery'&&order.pricingPolicy!=='weight-inclusive-v1'&&!payment&&order.paymentStatus!=='Paid'&&order.status!=='Payment pending'&&<><h4>UPS delivery</h4>{rates.map(rate=><button type="button" key={rate.id} disabled={busy} onClick={()=>run('selectShipping',{rateId:rate.id})}>{rate.service} · {usd(order.subtotal-order.discount+(order.freeShipping?0:rate.amount))} delivered before tax{rate.days?' · '+rate.days+' business days':''}</button>)}<button type="button" disabled={busy} onClick={()=>run('rates')}>Refresh UPS options</button></>}
        {order.shipping!==null&&<dl className={styles.totals}><div><dt>Rugs{order.shippingIncluded?' including delivery':''}</dt><dd>{usd(order.subtotal-order.discount+(order.shipping||0))}</dd></div><div><dt>{order.deliveryOption==='Pickup'?'Pickup':'Shipping'}</dt><dd>Free{order.deliveryOption==='Delivery'?' — included in price':''}</dd></div><div><dt>Tax</dt><dd>{order.automaticTax?'Shown below before payment':usd(order.tax)}</dd></div>{!order.automaticTax&&<div><dt>Total</dt><dd>{usd(order.total)}</dd></div>}</dl>}
        {order.paymentStatus==='Paid'?<p role="status">Payment confirmed. Thank you! Order {order.id}. <a href={'/orders/pay?order='+encodeURIComponent(order.id)}>View receipt</a></p>:payment?<div ref={mount} style={{minHeight:400}}/>:['Ready for payment','Payment pending'].includes(order.status)&&<>
          <label className={styles.check}><input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/><span>I reviewed my order and U.S. addresses. All sales are final; exchanges are available within one week. Full payment is required before pickup or delivery.</span></label>
          <button type="button" disabled={!payments||!agreed||busy} onClick={()=>run('pay',{accepted:true,embedded:true})}>{busy?'Loading secure payment…':'Continue to payment'}</button>
        </>}
        {order.status==='Payment pending'&&!payment&&<button type="button" disabled={busy} onClick={()=>run('sync')}>Check payment status</button>}
      </>}
    </>}
    {verificationNote&&<p role="status">{verificationNote}</p>}
    {!enabled&&<p>Online checkout is unavailable. Call <a href="tel:+17034610207">(703) 461-0207</a>.</p>}
    {enabled&&!payments&&<p>Card payments are temporarily unavailable.</p>}
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    {blocked.map(saved=><div className={styles.notice} key={saved.id}><strong>Unfinished checkout</strong><p>{saved.items.map(i=>'SKU '+i.sku).join(', ')} · {usd(saved.subtotal-saved.discount)} before tax</p><p>You can cancel this unpaid checkout to release its rugs, then retry your current cart.</p><button type="button" disabled={busy} onClick={async()=>{setBusy(true);try{const d=await orderRequest('/api/live-orders',{action:'cancel',id:saved.id});if(d.order.paymentStatus==='Paid')throw Error('This order has already been paid. Its rugs cannot be released.');if(!['Cancelled','Expired'].includes(d.order.status))throw Error('Payment is still processing. Check its status before retrying.');setBlocked(prev=>prev.filter(o=>o.id!==saved.id));setError('Unpaid checkout closed. Retry checkout to continue with your cart.');}catch(e){setError(e instanceof Error?e.message:'Could not close checkout.');}finally{setBusy(false);}}}>Cancel unfinished checkout</button></div>)}
  </section>;
}
