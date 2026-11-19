'use client';
import React,{useEffect,useRef,useState} from 'react';
import {invoiceCallRequest} from '@/lib/invoice-calls-client';
import styles from './InvoiceCalls.module.css';
type Call={id:string;result:string;outcome:string;pickupDate:string;pickupTime:string;notes:string;calledBy:string;calledAt:string};
const outcomes:Record<string,string>={voicemail:'Voicemail left',message:'Message sent',none:'No message left'};
function localDate(date:string){return new Date(date+'T12:00:00').toLocaleDateString();}
export default function InvoiceCalls({invoiceId}:{invoiceId:string}){
 const [calls,setCalls]=useState<Call[]>([]),[cursor,setCursor]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [result,setResult]=useState('answered'),[outcome,setOutcome]=useState(''),[pickupDate,setPickupDate]=useState(''),[pickupTime,setPickupTime]=useState(''),[notes,setNotes]=useState('');
 const attempt=useRef<{key:string;id:string}|null>(null);
 useEffect(()=>{let active=true;setLoading(true);setCalls([]);setCursor('');setError('');setNotice('');attempt.current=null;
 invoiceCallRequest(invoiceId).then(data=>{if(active){setCalls(data.calls);setCursor(data.nextCursor||'');}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[invoiceId]);
 async function loadMore(){setLoading(true);setError('');try{const data=await invoiceCallRequest(invoiceId,undefined,cursor);setCalls(previous=>[...previous,...data.calls.filter((call:Call)=>!previous.some(old=>old.id===call.id))]);setCursor(data.nextCursor||'');}catch(e:any){setError(e.message);}finally{setLoading(false);}}
 async function save(event:React.FormEvent){event.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');
 const fields={result,outcome:result==='no_answer'?outcome:'',pickupDate:result==='answered'?pickupDate:'',pickupTime:result==='answered'?pickupTime:'',notes};
 const key=JSON.stringify(fields);if(attempt.current?.key!==key)attempt.current={key,id:crypto.randomUUID()};
 try{const data=await invoiceCallRequest(invoiceId,{...fields,id:attempt.current!.id});setCalls(previous=>[data.call,...previous.filter(call=>call.id!==data.call.id)]);setNotes('');setOutcome('');setPickupDate('');setPickupTime('');attempt.current=null;setNotice('Call saved. Staff name and call time were recorded automatically.');}
 catch(e:any){setError(e.message);}finally{setBusy(false);}}
 return <section className={`${styles.card} no-print`} aria-label="Customer call history">
 <h2>Customer calls</h2><p>Record who called, what happened, and when the customer plans to collect their rugs.</p>
 <form onSubmit={save} className={styles.form}><fieldset disabled={busy}><legend>Record a call</legend><div className={styles.grid}>
 <label>Call result<select value={result} onChange={e=>setResult(e.target.value)}><option value="answered">Answered</option><option value="no_answer">No answer</option></select></label>
 {result==='no_answer'?<label>What happened?<select required value={outcome} onChange={e=>setOutcome(e.target.value)}><option value="">Choose an outcome</option>{Object.entries(outcomes).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>:<><label>Expected customer pickup date<input type="date" value={pickupDate} onChange={e=>{setPickupDate(e.target.value);if(!e.target.value)setPickupTime('');}}/></label><label>Expected pickup time (optional)<input type="time" disabled={!pickupDate} value={pickupTime} onChange={e=>setPickupTime(e.target.value)}/></label></>}
 </div><label>Notes (optional)<textarea rows={3} maxLength={2000} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Customer plans, message details, or anything staff should know"/></label>
 <p className={styles.hint}>Called by and call time are recorded from your signed-in staff account when you save.</p><button type="submit" disabled={busy}>{busy?'Saving call…':'Save call'}</button></fieldset></form>
 {error&&<p role="alert" className={styles.error}>{error}<button type="button" disabled={loading||busy} onClick={loadMore}>Retry loading history</button></p>}{notice&&<p role="status" className={styles.success}>{notice}</p>}
 <h3>Call history <span>({calls.length}{cursor?'+':''})</span></h3>{loading&&<p role="status">Loading call history…</p>}
 {!loading&&!calls.length&&!error&&<p>Not called yet. No call attempts have been recorded.</p>}
 <div className={styles.history}>{calls.map(call=><article key={call.id}><div className={styles.heading}><strong>{call.result==='answered'?'Answered':'No answer'}</strong><time dateTime={call.calledAt}>{new Date(call.calledAt).toLocaleString()}</time></div><p>Called by <strong>{call.calledBy}</strong></p>{call.result==='no_answer'&&<p>{outcomes[call.outcome]||call.outcome}</p>}{call.pickupDate&&<p>Expected pickup: <strong>{localDate(call.pickupDate)}{call.pickupTime?' at '+call.pickupTime:''}</strong></p>}{call.result==='answered'&&!call.pickupDate&&<p>Pickup date not confirmed.</p>}{call.notes&&<p className={styles.notes}>{call.notes}</p>}</article>)}</div>
 {cursor&&<button type="button" disabled={loading||busy} onClick={loadMore}>Load earlier calls</button>}
 </section>;
}
