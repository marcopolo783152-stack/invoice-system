'use client';
import {useState} from 'react';
import {sendEmailVerification,signOut} from 'firebase/auth';
import {auth} from '@/lib/auth';
import {useStaffAccess} from '@/hooks/useStaffAccess';
import styles from '@/components/Portal.module.css';
export default function Page(){
 const {user,loading}=useStaffAccess();
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const run=async(fn:()=>Promise<void>)=>{setBusy(true);setMessage('');try{await fn();}catch{setMessage('Please try again in a moment. You may need to sign in again.');}finally{setBusy(false);}};
 return <main className={styles.page}><div className={styles.form}><span className={styles.eyebrow}>One last step</span><h1>Check your inbox.</h1>
 {loading?<p>Checking your account…</p>:!user||user.isAnonymous?<p><a href="/sign-in">Sign in first to verify your email.</a></p>:<>
 <p>Open the verification link sent to <strong>{user.email}</strong>. Then return here to open your customer dashboard.</p>
 <button disabled={busy} onClick={()=>run(async()=>{await user.reload();await user.getIdToken(true);if(auth.currentUser?.emailVerified)window.location.assign('/account');else setMessage('Your email is not verified yet. Open the link in your email, then try again.');})}>I’ve verified my email</button>
 <button className={styles.secondary} disabled={busy} onClick={()=>run(async()=>{await sendEmailVerification(user);setMessage('Verification email requested. Please also check your spam folder.');})}>Send another verification link</button>
 <p><button className={styles.secondary} onClick={()=>run(async()=>{await signOut(auth);window.location.assign('/sign-in');})}>Use another account</button></p>
 </>}
 {message&&<p role="status" className={styles.notice}>{message}</p>}
 </div></main>;
}
