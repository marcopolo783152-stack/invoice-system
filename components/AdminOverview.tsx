'use client';
import {useEffect,useState} from 'react';
import {useStore} from '@/context/StoreContext';
import {useStaffAccess} from '@/hooks/useStaffAccess';
import {canAccess} from '@/lib/access-policy';
import {subscribeToCollection,SHOWROOM_APPOINTMENTS} from '@/lib/showroom-firebase';
import styles from './Portal.module.css';
export default function AdminOverview(){
 const {orders,rugs,chatMessages,estimates}=useStore();const {staff}=useStaffAccess();
 const [appointments,setAppointments]=useState<any[]>([]);
 useEffect(()=>{if(canAccess(staff,'appointments'))return subscribeToCollection<any>(SHOWROOM_APPOINTMENTS,setAppointments);setAppointments([]);},[staff]);
 const pending=orders.filter(o=>o.status==='Pending Confirmation');
 const waiting=Object.values(chatMessages.reduce((map:Record<string,any>,m)=>{const id=m.sessionId||m.id;if(!map[id]||m.timestamp>map[id].timestamp)map[id]=m;return map;},{})).filter(m=>m.sender==='customer');
 const upcoming=appointments.filter(a=>!['cancelled','rejected'].includes(a.status)&&a.date>=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York'}).format(new Date())).sort((a,b)=>(a.date+a.slotTime).localeCompare(b.date+b.slotTime)).slice(0,5);
 const stats=[['Orders to confirm',pending.length,'orders'],['Available rugs',rugs.filter(r=>r.availability==='In Stock').length,'inventory'],['Conversations awaiting reply',waiting.length,'messages'],['New estimates',estimates.filter(e=>e.status==='New').length,'services']];
 return <section className={styles.page}>
 <div className={styles.hero}><div><span className={styles.eyebrow}>Your showroom, at a glance</span><h1>Welcome, {staff?.name?.split(' ')[0]||'team'}.</h1><p>Here’s what needs your attention. Keep customers informed and make every visit feel personal.</p></div><a className={styles.button} href="/admin/invoices/invoices/new">Create an invoice →</a></div>
 <div className={styles.stats}>{stats.filter(x=>canAccess(staff,String(x[2]))).map(([label,value])=><div className={styles.card} key={label}><span className={styles.muted}>{label}</span><strong className={styles.stat}>{value}</strong></div>)}</div>
 <div className={styles.grid}>
 <section className={styles.card}><div className={styles.header}><h2>Recent orders</h2><a href="/?view=admin&adminTab=orders">View all →</a></div>
 {!orders.length?<p className={styles.empty}>Your orders will appear here as customers place them.</p>:orders.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,6).map(o=><a key={o.id} className={styles.row} href={'/?view=admin&adminTab=orders&orderId='+encodeURIComponent(o.id)}><div><strong>{o.customerInfo?.name||'Customer'}</strong><div className={styles.muted}>{o.id}</div></div><div><span className={styles.badge}>{o.status}</span><div>${Number(o.total||0).toLocaleString()}</div></div></a>)}</section>
 <section className={styles.card}><div className={styles.header}><h2>Upcoming visits</h2><a href="/?view=admin&adminTab=appointments">View all →</a></div>
 {!upcoming.length?<p className={styles.empty}>No upcoming appointments to show.</p>:upcoming.map(a=><a className={styles.row} key={a.id} href={'/?view=admin&adminTab=appointments&appointmentId='+encodeURIComponent(a.id)}><div><strong>{a.name}</strong><div className={styles.muted}>{a.date} · {a.time}</div></div><span className={styles.badge}>{a.manager}</span></a>)}
 <div className={styles.section}><h2>Quick actions</h2><div className={styles.actions}>
 {canAccess(staff,'messages')&&<a className={styles.button} href="/?view=admin&adminTab=messages">Customer inbox</a>}
 {canAccess(staff,'users')&&<a className={styles.secondary+' '+styles.button} href="/admin/users">Manage team</a>}
 <a className={styles.secondary+' '+styles.button} href="/">View showroom</a>
 </div></div></section></div></section>;
}
