'use client';
import {useEffect,useRef,useState} from 'react';
import {onAuthStateChanged} from 'firebase/auth';
import {auth} from '@/lib/auth';
import {orderRequest} from './client';
import styles from './LiveOrders.module.css';
export default function LiveOrderRequest({payload}:{payload:any}){
  const [signed,setSigned]=useState(false),[enabled,setEnabled]=useState(false),[checked,setChecked]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const attempt=useRef({body:'',id:''}),running=useRef(false);
  useEffect(()=>onAuthStateChanged(auth,u=>setSigned(!!u&&!u.isAnonymous&&u.emailVerified)),[]);
  useEffect(()=>{let active=true;fetch('/api/live-orders?config=1',{cache:'no-store'}).then(r=>r.json()).then(d=>{if(active)setEnabled(d.quotesEnabled===true);}).catch(()=>{});return()=>{active=false;};},[]);
  async function create(){
    if(running.current)return;running.current=true;setBusy(true);setError('');
    try{
      const value={...payload,customerInfo:{...payload.customerInfo,billingCountry:'US',shippingCountry:'US'}};
      const body=JSON.stringify(value);
      if(attempt.current.body!==body||!attempt.current.id)attempt.current={body,id:crypto.randomUUID()};
      const d=await orderRequest('/api/live-orders',{action:'create',payload:value},attempt.current.id);
      window.location.assign('/orders/pay?order='+encodeURIComponent(d.order.id));
    }catch(e){setError(e instanceof Error?e.message:'Could not save your request.');running.current=false;setBusy(false);}
  }
  return <section className={styles.request}>
    <h3 className="font-semibold text-lg">{payload.deliveryOption==='Pickup'?'Free showroom pickup':'Request your shipping quote'}</h3>
    <p>{payload.deliveryOption==='Pickup'?'Review the rug price and 6% Alexandria pickup tax on the next page. No payment is taken by this button.':'We will confirm shipping and the applicable sales tax for your address. You will review the complete quote before paying. Submitting a request does not reserve the rug or charge your card.'}</p>
    {!signed?<p><a href="/sign-in" className="underline">Sign in or create an account</a>, then verify your email to save and track your request. Your cart stays on this device.</p>:<>
      <label className={styles.check}><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/><span>My billing address and delivery address are in the United States. I have reviewed my contact details and will use my verified account email.</span></label>
      <button type="button" disabled={!enabled||!checked||busy} onClick={create}>{busy?'Saving your request…':payload.deliveryOption==='Pickup'?'Review pickup order':'Request shipping quote'}</button>
    </>}
    {!enabled&&<p>Online order requests are being prepared. Please call <a href="tel:+17034610207">(703) 461-0207</a> for assistance.</p>}
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    <p><a href="/orders/pay" className="underline">My online orders &amp; quotes</a></p>
  </section>;
}
