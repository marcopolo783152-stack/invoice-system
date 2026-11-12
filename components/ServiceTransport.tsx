'use client';
import {transportMethods} from '@/lib/service-transport.mjs';
import styles from './ServiceTransport.module.css';
export default function ServiceTransport({value,onChange}:{value:any;onChange:(value:any)=>void}){
 const method=transportMethods[value?.method as keyof typeof transportMethods];
 return <section className={styles.card}>
 <h3>Pickup & delivery</h3><p>Choose how the rugs arrive and return to the customer.</p>
 <label className={styles.field}>Service arrangement<select value={value?.method||''} onChange={e=>{const key=e.target.value;const next=transportMethods[key as keyof typeof transportMethods];onChange(next?Object.fromEntries([['method',key],...next.legs.map(leg=>[leg,value?.[leg]||{pricing:'free',amount:0}])]):null);}}><option value="">Not specified</option>{Object.entries(transportMethods).map(([key,item])=><option key={key} value={key}>{item.label}</option>)}</select></label>
 <div className={styles.grid}>{method?.legs.map(leg=><div className={styles.leg} key={leg}><strong>{leg==='pickup'?'Pickup from customer':'Delivery to customer'}</strong><div className={styles.buttons}>{['free','charge'].map(pricing=><button key={pricing} type="button" aria-pressed={value?.[leg]?.pricing===pricing} onClick={()=>onChange({...value,[leg]:{pricing,amount:0}})}>{pricing==='free'?'Free':'Charge'}</button>)}</div>{value?.[leg]?.pricing==='charge'&&<label className={styles.field}>Amount ($)<input type="number" min="0.01" max="1000000" step="0.01" required value={value[leg].amount||''} onChange={e=>onChange({...value,[leg]:{pricing:'charge',amount:Number(e.target.value)}})}/></label>}</div>)}</div>
 {method&&!method.legs.length&&<p>Customer drops off and collects the rugs at the showroom. No transport charge.</p>}
 </section>;
}
