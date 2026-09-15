'use client';
import {useState} from 'react';
import {auth,loginWithEmail,loginWithGoogle,registerWithEmail} from '@/lib/auth';
import {isFirebaseConfigured,signInErrorMessage} from '@/lib/firebase';
import styles from './Portal.module.css';
export default function AccountAccess({initialMode='login'}:{initialMode?:'login'|'register'}){
 const [mode,setMode]=useState(initialMode),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const run=async(fn:()=>Promise<void>)=>{setBusy(true);setError('');try{if(!isFirebaseConfigured())throw Error('Sign-in is being configured. Please contact the showroom for help.');await fn();}catch(e){setError(signInErrorMessage(e));}finally{setBusy(false);}};
 const finish=()=>{window.location.assign(auth.currentUser?.emailVerified?'/account':'/verify-email');};
 return <div className={styles.form}>
 <a className={styles.eyebrow} href="/">Marco Polo Oriental Rugs</a>
 <h1>{mode==='register'?'A home for your collection.':'Welcome back.'}</h1>
 <p className={styles.muted}>{mode==='register'?'Create your customer account to keep your purchases and requests together.':'Sign in to see your orders, saved rugs and requests.'}</p>
 {error&&<p role="alert" className={styles.error}>{error}</p>}
 <form onSubmit={event=>{event.preventDefault();run(async()=>{
 const result=mode==='register'?await registerWithEmail(name.trim(),email.trim(),password):await loginWithEmail(email.trim(),password);
 if(result.error)throw Error(result.error);finish();
 });}}>
 {mode==='register'&&<label>Full name<input required maxLength={100} autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label>}
 <label>Email address<input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label>
 <label>Password<input required type="password" minLength={mode==='register'?12:undefined} autoComplete={mode==='register'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)}/></label>
 {mode==='register'&&<p className={styles.muted}>Use at least 12 characters. We’ll email you a verification link before you can open your dashboard.</p>}
 <button disabled={busy}>{busy?'Please wait…':mode==='register'?'Create customer account':'Sign in'}</button>
 </form>
 <p><a href="/forgot-password">Forgot password?</a></p>
 <button className={styles.secondary} disabled={busy} onClick={()=>run(async()=>{const result=await loginWithGoogle();if(result.error)throw Error(result.error);finish();})}>Continue with Google</button>
 <p><button className={styles.secondary} disabled={busy} onClick={()=>{setMode(mode==='login'?'register':'login');setError('');}}>{mode==='login'?'New customer? Create an account':'Already have an account? Sign in'}</button></p>
 <p className={styles.muted}>Working with us? <a href="/staff-login">Staff sign in</a></p>
 </div>;
}
