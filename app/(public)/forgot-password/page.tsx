'use client';
import {useState} from 'react';
import {resetPassword} from '@/lib/auth';
import styles from '@/components/Portal.module.css';
export default function Page(){
 const [email,setEmail]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 return <main className={styles.page}><div className={styles.form}>
 <a className={styles.eyebrow} href="/">Marco Polo Oriental Rugs</a><h1>Reset your password.</h1>
 <p>Enter the email address you used to create your account. Your email is also your sign-in username.</p>
 {message&&<p role="status" className={styles.notice}>{message}</p>}{error&&<p role="alert" className={styles.error}>{error}</p>}
 <form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const result=await resetPassword(email.trim());if(result.error)throw Error('We could not request a reset right now. Check the email format and try again.');setMessage('If an account uses this email, a password-reset link will arrive shortly. Check your inbox and spam folder.');}catch(e){setError(e instanceof Error?e.message:'Please try again.');}finally{setBusy(false);}}}>
 <label>Account email / username<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label>
 <button disabled={busy}>{busy?'Sending…':'Send reset link'}</button></form>
 <p><a href="/sign-in">Back to customer sign in</a> · <a href="/staff-login">Staff sign in</a></p>
 </div></main>;
}
