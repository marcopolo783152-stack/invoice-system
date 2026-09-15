'use client';
import {useEffect,useRef,useState} from 'react';
import {doc,onSnapshot} from 'firebase/firestore';
import {db} from '@/lib/firebase';
import {useStore} from '@/context/StoreContext';
import {useStaffAccess} from '@/hooks/useStaffAccess';
import {canAccess} from '@/lib/access-policy';
import {chatRequest} from '@/lib/chat-client';
import ChatText from '@/components/ChatText';
import styles from '@/components/Chat.module.css';
export function AdminChatBox({activeSessionId,onClose,embedded=false}:{activeSessionId:string|null;onClose:()=>void;embedded?:boolean}){
 const {chatMessages}=useStore();const {staff}=useStaffAccess();
 const [session,setSession]=useState<any>(null),[name,setName]=useState(''),[text,setText]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const bottom=useRef<HTMLDivElement>(null);
 useEffect(()=>{setName(staff?.name||'');},[staff?.name]);
 useEffect(()=>{setSession(null);setError('');if(activeSessionId&&canAccess(staff,'messages'))return onSnapshot(doc(db,'showroom_chat_sessions',activeSessionId),s=>setSession(s.data()||null),()=>setError('Could not load the conversation.'));},[activeSessionId,staff]);
 const messages=chatMessages.filter(m=>m.sessionId===activeSessionId).sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
 useEffect(()=>{const feed=bottom.current?.parentElement;if(feed)feed.scrollTop=feed.scrollHeight;},[messages.length]);
 if(!activeSessionId||!canAccess(staff,'messages'))return null;
 const run=async(body:Record<string,unknown>)=>{setBusy(true);setError('');try{await chatRequest({...body,sessionId:activeSessionId});setText('');}catch(e){setError(e instanceof Error?e.message:'Could not send.');}finally{setBusy(false);}};
 const remove=async()=>{
  if(!window.confirm('Permanently delete this conversation and all its messages? This cannot be undone.'))return;
  setBusy(true);setError('');
  try{await chatRequest({action:'delete',sessionId:activeSessionId});onClose();}
  catch(e){setError(e instanceof Error?e.message:'Could not delete. Please try again.');}
  finally{setBusy(false);}
 };
 return <section className={styles.window+' '+(embedded?styles.embedded:'')} aria-label="Customer conversation">
 <header className={styles.header}><div><strong>{session?.contact?.name||session?.customerName||'Customer conversation'}</strong><small>{session?.status==='human'?'With '+session.staffName:session?.status==='waiting'?'Waiting for our team':'AI assistant conversation'}</small></div><button onClick={onClose} aria-label="Close customer conversation">×</button></header>
 {canAccess(staff,'messages','delete')&&<div className={styles.tools}><button disabled={busy} onClick={remove}>{busy?'Please wait…':'Delete permanently'}</button></div>}
 {session?.contact&&<div className={styles.tools}><a href={'mailto:'+session.contact.email}>{session.contact.email}</a><span>{session.contact.phone}</span></div>}
 <div className={styles.feed}>{messages.map(m=><div key={m.id} className={styles.bubble+' '+(m.sender==='admin'?styles.mine:'')}><span className={styles.label}>{m.sender==='customer'?'Customer':m.isAutomated?'AI assistant':(m as any).staffName||'Team'}</span><ChatText text={m.text}/></div>)}<div ref={bottom}/></div>
 {error&&<p role="alert" className={styles.error}>{error}</p>}
 {!session?.claimedBy&&canAccess(staff,'messages','write')&&<form className={styles.claim} onSubmit={e=>{e.preventDefault();run({action:'claim',name});}}><label>Your name for this customer<input required minLength={2} maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label><button disabled={busy||!session}>Accept conversation</button></form>}
 {session?.claimedBy===staff?.uid&&<form className={styles.compose} onSubmit={e=>{e.preventDefault();run({action:'reply',text});}}><input aria-label="Reply to customer" required maxLength={2000} value={text} onChange={e=>setText(e.target.value)} placeholder="Write a kind, helpful reply…"/><button disabled={busy||!text.trim()}>Send</button></form>}
 {session?.claimedBy&&session.claimedBy!==staff?.uid&&<p className={styles.tools}>This conversation is being handled by {session.staffName}.</p>}
 </section>;
}
