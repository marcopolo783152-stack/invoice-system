'use client';
import { useState } from 'react';
import { EmailAuthProvider, linkWithCredential, updatePassword, signOut } from 'firebase/auth';
import { auth } from '@/lib/auth';
import { useStaffAccess } from '@/hooks/useStaffAccess';
import styles from '@/components/AccessPanel.module.css';
export default function StaffAccount() {
 const {user,loading} = useStaffAccess();
 const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 if(loading) return <p>Checking account…</p>;
 if(!user || user.isAnonymous) return <main className={styles.panel}><a href="/staff-login">Sign in first</a></main>;
 return <main className={styles.panel} style={{maxWidth:480}}>
 <h1>Account settings</h1><p>{user.email}</p>
 <form onSubmit={async e=>{e.preventDefault();setMessage('');setBusy(true);try{
  if(!user.emailVerified) throw new Error('Verify your email first.');
  if(password!==confirm) throw new Error('Passwords do not match.');
  if(password.length<12) throw new Error('Use at least 12 characters.');
  if(user.providerData.some(p=>p.providerId==='password')) await updatePassword(user,password);
  else await linkWithCredential(user,EmailAuthProvider.credential(user.email!,password));
  setPassword('');setConfirm('');setMessage('Website password saved. You can use Google or email/password for this same account.');
 }catch(e){setMessage(e instanceof Error?e.message:'Could not save password. If your sign-in is old, sign out and sign in again.');}finally{setBusy(false);}}}>
 <label>New website password<input type="password" required minLength={12} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
 <label>Confirm password<input type="password" required autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
 <button disabled={busy}>Save password</button></form>
 {message&&<p role="status">{message}</p>}
 <button onClick={async()=>{await signOut(auth);window.location.assign('/staff-login');}}>Sign out</button>
 <a href="/?view=admin">Back to staff area</a>
 </main>;
}
