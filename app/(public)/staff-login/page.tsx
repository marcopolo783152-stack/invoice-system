'use client';
import { useEffect, useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/auth';
import {isFirebaseConfigured,signInErrorMessage} from '@/lib/firebase';
import { acceptStaffInvitation, verifiedIdentity } from '@/lib/staff-access';
import styles from './StaffLogin.module.css';
import { useStaffAccess } from '@/hooks/useStaffAccess';

export default function StaffLogin() {
 const {staff,loading:accessLoading}=useStaffAccess();
 const [email,setEmail] = useState(''), [password,setPassword] = useState(''), [name,setName] = useState('');
 const [register,setRegister] = useState(false), [busy,setBusy] = useState(false), [message,setMessage] = useState(''), [error,setError] = useState('');
 useEffect(() => { sessionStorage.removeItem('showroom-logout'); setEmail(new URLSearchParams(window.location.search).get('email') || ''); }, []);
 const finish = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in first.');
  await user.reload(); await user.getIdToken(true);
  if (!verifiedIdentity(user)) {
   setMessage('Verify your email using the link in your inbox, then press “I verified my email”.'); return;
  }
  await acceptStaffInvitation(user);
  const next = new URLSearchParams(window.location.search).get('next');
  window.location.assign(next && next.startsWith('/admin/') && !next.startsWith('//') ? next : '/admin');
 };
 const run = async (action: () => Promise<void>) => {
  setBusy(true); setError(''); setMessage('');
  try { if(!isFirebaseConfigured())throw Error('CONFIGURATION_NOT_FOUND');await action(); } catch(e) { setError(signInErrorMessage(e)); }
  finally { setBusy(false); }
 };
 return <main className={styles.page}>
 <div className={styles.shell}>
 <aside className={styles.brand}>
  <a href="/" className={styles.wordmark}>MARCO POLO <span>RUGS</span></a>
  <div><p className={styles.eyebrow}>THE STAFF WORKSPACE</p><h1>A warm welcome<br/>back.</h1><p>Your showroom, invoices and customer care.<br/>Together in one place.</p></div>
  <p className={styles.address}>3260 Duke Street · Alexandria, Virginia</p>
 </aside>
 <section className={styles.panel} aria-label="Staff sign in">
  <a className={styles.back} href="/">← Return to showroom</a>
  <p className={styles.eyebrow}>MARCO POLO RUGS</p>
  <h2>{register ? 'Activate your account' : 'Staff sign in'}</h2>
  <p className={styles.intro}>Use your invited email to access your workspace.</p>
  {!accessLoading && staff && <div className={styles.status}><p>Already signed in as <strong>{staff.name}</strong>.</p><button disabled={busy} onClick={()=>run(finish)}>Continue to workspace →</button></div>}
  {error && <p role="alert" className={styles.error}>{error}</p>}
  {message && <p role="status" className={styles.status}>{message}</p>}
  <form onSubmit={e => { e.preventDefault(); run(async () => {
   if(register) {
    const result = await createUserWithEmailAndPassword(auth,email.trim(),password);
    await updateProfile(result.user,{displayName:name.trim()});
    await sendEmailVerification(result.user);
    setMessage('Account created. Check your email to verify it, then press “I verified my email”.');
   } else { await signInWithEmailAndPassword(auth,email.trim(),password); await finish(); }
  }); }}>
   {register && <label>Full name<input required value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label>}
   <label>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username"/></label>
   <label>Password<input required type="password" minLength={register ? 12 : undefined} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={register?'new-password':'current-password'}/></label>
   <button disabled={busy}>{busy?'Please wait…':register?'Create account':'Sign in →'}</button>
  </form>
  <div className={styles.divider}>or</div>
  <button className={styles.google} disabled={busy} onClick={()=>run(async()=>{ await signInWithPopup(auth,new GoogleAuthProvider()); await finish(); })}>Continue with Google</button>
  <button className={styles.textButton} disabled={busy} onClick={()=>setRegister(!register)}>{register?'Already registered? Sign in':'Activate invited account'}</button>
  <p><a href="/forgot-password">Forgot password?</a></p>
  <details className={styles.help}><summary>Need help with verification or your password?</summary>
  <button disabled={busy} onClick={()=>run(finish)}>I verified my email</button>
  <button disabled={busy} onClick={()=>run(async()=>{ if(!auth.currentUser) throw new Error('Sign in first.'); await sendEmailVerification(auth.currentUser); setMessage('Verification email requested. Check your inbox.'); })}>Resend verification</button>
  <hr/>
  <h2>Add or change your website password</h2>
  <p>Sign in with Google above first. Use the account settings link in the staff panel to set a password while signed in.</p>
  <a className={styles.link} href="/staff-account">Account settings</a>
  </details>
  <p className={styles.note}>Staff access only · Your assigned permissions apply.</p>
 </section></div></main>;
}
