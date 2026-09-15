'use client';
import {useEffect,useState,useRef} from 'react';
import {useStore} from '@/context/StoreContext';
import {chatRequest} from '@/lib/chat-client';
import ChatText from '@/components/ChatText';
import styles from '@/components/Chat.module.css';
export function ChatWidget(){
 const {chatMessages,currentUser}=useStore();
 const [open,setOpen]=useState(false),[text,setText]=useState(''),[sessionId,setSessionId]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[handoff,setHandoff]=useState(false);
 const [contact,setContact]=useState({name:'',email:'',phone:''});
 const bottom=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  let id=sessionStorage.getItem('mp_secure_chat');
  if(!id){id='chat-'+crypto.randomUUID();sessionStorage.setItem('mp_secure_chat',id);}
  setSessionId(currentUser?'user-'+currentUser.id:id);
  setContact(c=>({...c,name:currentUser?.name||c.name,email:currentUser?.email||c.email}));
 },[currentUser?.id]);
 const messages=chatMessages.filter(m=>m.sessionId===sessionId).sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
 useEffect(()=>{bottom.current?.scrollIntoView({behavior:'auto'});},[messages.length,open]);
 useEffect(()=>{const show=()=>setOpen(true);window.addEventListener('open-marcopolo-chat',show);return()=>window.removeEventListener('open-marcopolo-chat',show);},[]);
 const run=async(body:Record<string,unknown>)=>{setBusy(true);setError('');try{const result=await chatRequest({...body,sessionId,customerName:currentUser?.name||'Customer'});if(result.requiresHandoff)setHandoff(true);if(body.action==='handoff')setHandoff(false);return true;}catch(e){setError(e instanceof Error?e.message:'Message not sent. Please try again.');return false;}finally{setBusy(false);}};
 return open?<section className={styles.window} role="dialog" aria-label="Marco Polo customer support"><header className={styles.header}><div><strong>Cyrus · Marco Polo</strong><small>AI assistant & showroom support</small></div><button aria-label="Minimize chat" onClick={()=>setOpen(false)}>×</button></header>
 <div className={styles.feed} aria-live="polite">{!messages.length&&<div className={styles.bubble}><span className={styles.label}>Cyrus · AI assistant</span>Hello, and welcome! I’d love to help you find a rug, explore our care services or plan a visit. What brings you in today?</div>}
 {messages.map(m=><div key={m.id} className={styles.bubble+' '+(m.sender==='customer'?styles.mine:'')}><span className={styles.label}>{m.sender==='customer'?'You':m.isAutomated?'Cyrus · AI assistant':(m as any).staffName||'Showroom team'}</span><ChatText text={m.text}/></div>)}
 {busy&&<p>One moment…</p>}<div ref={bottom}/></div>
 {error&&<p role="alert" className={styles.error}>{error}</p>}
 {handoff&&<form className={styles.contact} onSubmit={e=>{e.preventDefault();run({action:'handoff',contact});}}><strong>Let’s connect you with our team.</strong><p>We’ll use these details to help with your request.</p>
 <label>Full name<input required maxLength={100} autoComplete="name" value={contact.name} onChange={e=>setContact({...contact,name:e.target.value})}/></label><label>Email<input required type="email" autoComplete="email" value={contact.email} onChange={e=>setContact({...contact,email:e.target.value})}/></label><label>Phone<input required type="tel" maxLength={40} autoComplete="tel" value={contact.phone} onChange={e=>setContact({...contact,phone:e.target.value})}/></label><button disabled={busy||!sessionId}>Send request to team</button> <button type="button" onClick={()=>setHandoff(false)}>Cancel</button></form>}
 <form className={styles.compose} onSubmit={async e=>{e.preventDefault();if(await run({action:'message',text}))setText('');}}><input aria-label="Your message" placeholder="Ask us anything about rugs…" maxLength={2000} required value={text} onChange={e=>setText(e.target.value)}/><button disabled={busy||!sessionId||!text.trim()}>Send</button></form>
 <div className={styles.tools}><button onClick={()=>setHandoff(true)}>Talk to our team</button><a href="tel:+17034610207">Call showroom</a></div>
 </section>:<button className={styles.launcher} onClick={()=>setOpen(true)}>Chat with us</button>;
}
