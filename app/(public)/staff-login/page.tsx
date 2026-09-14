'use client';
import { useEffect, useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/auth';
import { acceptStaffInvitation, verifiedIdentity } from '@/lib/staff-access';
import styles from '@/components/AccessPanel.module.css';

export default function StaffLogin() {
 const [email,setEmail] = useState(''), [password,setPassword] = useState(''), [name,setName] = useState('');
 const [register,setRegister] = useState(false), [busy,setBusy] = useState(false), [message,setMessage] = useState(''), [error,setError] = useState('');
 useEffect(() => { setEmail(new URLSearchParams(window.location.search).get('email') || ''); }, []);
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
  try { await action(); } catch(e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
  finally { setBusy(false); }
 };
 return <main className={styles.panel} style={{maxWidth:480}}>
  <h1>Marco Polo — Staff sign in</h1>
  <p>Use your invited email. Your assigned permissions apply to the showroom and invoice system.</p>
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
   <button disabled={busy}>{register?'Create account':'Sign in'}</button>
  </form>
  <button disabled={busy} onClick={()=>run(async()=>{ await signInWithPopup(auth,new GoogleAuthProvider()); await finish(); })}>Continue with Google</button>
  <button disabled={busy} onClick={()=>setRegister(!register)}>{register?'Already registered? Sign in':'Activate invited account'}</button>
  <button disabled={busy} onClick={()=>run(async()=>{ if(!email.trim()) throw new Error('Enter your email first.'); await sendPasswordResetEmail(auth,email.trim()); setMessage('If this email has an account, a password reset link will arrive shortly.'); })}>Forgot password?</button>
  <button disabled={busy} onClick={()=>run(finish)}>I verified my email</button>
  <button disabled={busy} onClick={()=>run(async()=>{ if(!auth.currentUser) throw new Error('Sign in first.'); await sendEmailVerification(auth.currentUser); setMessage('Verification email requested. Check your inbox.'); })}>Resend verification</button>
  <hr/>
  <h2>Add or change your website password</h2>
  <p>Sign in with Google above first. Use the account settings link in the staff panel to set a password while signed in.</p>
  <a className={styles.link} href="/staff-account">Account settings</a>
  <a href="/">Return to showroom</a>
 </main>;
}
