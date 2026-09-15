'use client';
import {useEffect,useState} from 'react';
import {doc,onSnapshot,setDoc,collection,query,where} from 'firebase/firestore';
import {StoreProvider,useStore} from '@/context/StoreContext';
import {useStaffAccess} from '@/hooks/useStaffAccess';
import {db} from '@/lib/firebase';
import {logout} from '@/lib/auth';
import {ChatWidget} from '@/components/public/ChatWidget';
import styles from '@/components/Portal.module.css';
function CustomerAccount(){
 const {user,staff,loading}=useStaffAccess();
 const {orders,rugs,favoritedRugIds,orderLoadError}=useStore();
 const [appointments,setAppointments]=useState<any[]>([]),[profile,setProfile]=useState({name:'',phone:'',address:''});
 const [status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{
  if(loading)return;
  if(!user||user.isAnonymous){window.location.replace('/sign-in');return;}
  if(!user.emailVerified){window.location.replace('/verify-email');return;}
  const a=onSnapshot(doc(db,'showroom_customers',user.uid),snap=>{const d=snap.data();setProfile({name:d?.name||user.displayName||'',phone:d?.phone||'',address:d?.address||''});},()=>setStatus('We could not load your profile. Please try again.'));
  const b=onSnapshot(query(collection(db,'showroom_appointments'),where('ownerUid','==',user.uid)),snap=>setAppointments(snap.docs.map(d=>({id:d.id,...d.data()}))),()=>setStatus('Appointments could not load. Contact us if you need to confirm a booking.'));
  return()=>{a();b();setAppointments([]);};
 },[user?.uid,user?.emailVerified,loading]);
 if(loading||!user||user.isAnonymous||!user.emailVerified)return <main className={styles.page}><div className={styles.container}>Opening your account…</div></main>;
 const mine=orders.filter(o=>o.customerId===user.uid).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 const saved=rugs.filter(r=>favoritedRugIds.includes(r.id));
 return <main className={styles.page}><div className={styles.container}>
 <header className={styles.header}><div><a className={styles.eyebrow} href="/">Marco Polo Oriental Rugs</a><h1>Your collection, your space.</h1></div><div className={styles.actions}><a className={styles.button+' '+styles.secondary} href="/shop">Browse rugs</a>{staff&&<a className={styles.button} href="/admin">Staff workspace</a>}<button className={styles.secondary} onClick={async()=>{await logout();window.location.assign('/sign-in');}}>Sign out</button></div></header>
 <section className={styles.hero}><div><span className={styles.eyebrow}>Your customer dashboard</span><h1>Hello, {profile.name.split(' ')[0]||'friend'}.</h1><p>Follow your purchases, plan your next showroom visit and keep the rugs you love close at hand.</p></div><a className={styles.button} href="/services/book">Plan a visit →</a></section>
 <div className={styles.stats}>{[['Your orders',mine.length],['Appointments',appointments.filter(a=>!['cancelled','rejected'].includes(a.status)).length],['Saved rugs',saved.length],['Account','Verified']].map(([label,value])=><div key={label} className={styles.card}><span className={styles.muted}>{label}</span><strong className={styles.stat}>{value}</strong></div>)}</div>
 {orderLoadError&&<p role="alert" className={styles.error}>{orderLoadError}</p>}
 {status&&<p role="status" className={styles.notice}>{status}</p>}
 <div className={styles.grid}><div>
 <section className={styles.card}><h2>Your purchases</h2>{!mine.length?<div className={styles.empty}><p>No purchases linked to this account yet.</p><p>For a previous purchase, contact the showroom with your order number so we can help.</p><a href="/shop">Find your next favorite rug →</a></div>:mine.map(o=><details key={o.id} className={styles.row} style={{display:'block'}}><summary style={{cursor:'pointer'}}><strong>{o.id}</strong> · <span className={styles.badge}>{o.status}</span> · ${Number(o.total||0).toFixed(2)}</summary><p className={styles.muted}>Placed {new Date(o.createdAt).toLocaleDateString()}</p>{o.cartItems?.map(item=><p key={item.rug.id}>{item.rug.name||item.rug.sku} · Quantity {item.quantity}</p>)}<p>Need an update? Include this order number when you message us.</p></details>)}</section>
 <section className={styles.card+' '+styles.section}><h2>Upcoming appointments</h2>{!appointments.length?<p className={styles.empty}>Your bookings will appear here. We’d love to welcome you.</p>:appointments.slice().sort((a,b)=>(a.date+a.slotTime).localeCompare(b.date+b.slotTime)).map(a=><div className={styles.row} key={a.id}><div><strong>{a.manager||'Showroom visit'}</strong><div className={styles.muted}>{a.date} at {a.time} · Alexandria time</div></div><span className={styles.badge}>{a.status}</span></div>)}<a href="/services/book">Book a showroom appointment →</a></section>
 <section className={styles.card+' '+styles.section}><h2>Rugs you love</h2><p className={styles.muted}>Favorites saved on this device.</p>{saved.length?<div className={styles.rugGrid}>{saved.map(r=><a key={r.id} href={'/shop/'+encodeURIComponent(r.id)}><img src={r.images?.[0]||''} alt={r.name||'Saved rug'}/><strong>{r.name||r.sku}</strong><p>${Number(r.price||0).toLocaleString()}</p></a>)}</div>:<p className={styles.empty}>Tap the heart on a rug to save it here.</p>}</section>
 </div><aside><section className={styles.card}><h2>Your details</h2><p className={styles.muted}>{user.email} · Verified</p>
 <form className={styles.form} style={{margin:0,padding:0,border:0,boxShadow:'none'}} onSubmit={async event=>{event.preventDefault();setBusy(true);setStatus('');try{await setDoc(doc(db,'showroom_customers',user.uid),{...profile,email:user.email},{merge:true});setStatus('Your details have been saved.');}catch{setStatus('Your details were not saved. Please try again.');}finally{setBusy(false);}}}>
 <label>Full name<input required maxLength={100} autoComplete="name" value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})}/></label>
 <label>Phone<input type="tel" maxLength={40} autoComplete="tel" value={profile.phone} onChange={e=>setProfile({...profile,phone:e.target.value})}/></label>
 <label>Address<textarea maxLength={500} autoComplete="street-address" value={profile.address} onChange={e=>setProfile({...profile,address:e.target.value})}/></label><button disabled={busy}>Save details</button></form>
 <p><a href="/forgot-password">Reset your password</a></p></section>
 <section className={styles.card+' '+styles.section}><h2>We’re here to help.</h2><p className={styles.muted}>Questions about a rug, cleaning or your order? Speak with our assistant or ask for the showroom team.</p><button onClick={()=>window.dispatchEvent(new CustomEvent('open-marcopolo-chat'))}>Message us</button><p><a href="tel:+17034610207">(703) 461-0207</a></p><p className={styles.muted}>3260 Duke St, Alexandria, VA<br/>Every day, 10am–6pm<br/>Lunch: 1:30–2pm</p></section>
 </aside></div>
 </div><ChatWidget/></main>;
}
export default function Page(){return <StoreProvider><CustomerAccount/></StoreProvider>;}
