'use client';
import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ACCESS_SECTIONS, StaffRole, canAccess, OWNER_UID } from '@/lib/access-policy';
import { useStaffAccess } from '@/hooks/useStaffAccess';
import styles from './AccessPanel.module.css';

export default function StaffUsers() {
 const {staff,loading,error}=useStaffAccess();
 const [users,setUsers]=useState<any[]>([]),[invites,setInvites]=useState<any[]>([]);
 const [email,setEmail]=useState(''),[name,setName]=useState(''),[role,setRole]=useState<StaffRole>('seller');
 const [permissions,setPermissions]=useState<Record<string,boolean>>({});
 const [editUid,setEditUid]=useState<string|null>(null),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[link,setLink]=useState('');
 useEffect(()=>{
  if(!canAccess(staff,'users','write')) {setUsers([]);setInvites([]);return;}
  const fail=()=>setStatus('Could not load staff. Check that the reviewed Firebase access rules are deployed.');
  const a=onSnapshot(collection(db,'showroom_roles'),s=>setUsers(s.docs.map(d=>({id:d.id,...d.data()}))),fail);
  const b=onSnapshot(collection(db,'showroom_staff_invites'),s=>setInvites(s.docs.map(d=>({id:d.id,...d.data()}))),fail);
  return ()=>{a();b();};
 },[staff?.uid,staff?.role,staff?.active]);
 if(loading) return <p>Checking access…</p>;
 if(!canAccess(staff,'users','write')) return <section className={styles.panel}><p>{error||'Only the owner and General Managers can manage staff.'}</p><a href="/staff-login">Staff sign in</a></section>;
 const reset=()=>{setEditUid(null);setEmail('');setName('');setRole('seller');setPermissions({});};
 const change=async(action:()=>Promise<void>)=>{setBusy(true);setStatus('');try{await action();}catch(e){setStatus(e instanceof Error?e.message:'Could not save changes.');}finally{setBusy(false);}};
 const inviteUrl=(address:string)=>window.location.origin+'/staff-login?email='+encodeURIComponent(address);
 return <section className={styles.panel}>
 <h1>Users & Permissions</h1>
 <p>Each staff member uses their own verified account. The General Manager has full administrative access. The owner account is protected from staff changes.</p>
 {status&&<p role="status">{status}</p>}
 <h2>{editUid?'Edit staff access':'Add staff member'}</h2>
 <form onSubmit={e=>{e.preventDefault();change(async()=>{
  const address=email.trim().toLowerCase();
  const data={email:address,name:name.trim(),role,permissions:role==='custom'?permissions:{}};
  if(editUid){
   if(editUid===OWNER_UID) throw new Error('The owner account cannot be changed here.');
   await updateDoc(doc(db,'showroom_roles',editUid),{...data,active:users.find(u=>u.id===editUid)?.active!==false});
   setStatus('Staff permissions updated.');reset();
  }else{
   if(users.some(u=>u.email?.toLowerCase()===address)) throw new Error('This person already has staff access. Edit their account below.');
   await setDoc(doc(db,'showroom_staff_invites',address),{...data,active:true,acceptedUid:'',expiresAt:Timestamp.fromMillis(Date.now()+7*86400000)});
   setLink(inviteUrl(address));
   setStatus('Invitation saved for seven days. Copy the link and send it to this person. No email has been sent automatically.');
  }
 });}}>
 <div className={styles.grid}>
 <label>Full name<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>
 <label>Email<input required type="email" disabled={!!editUid} value={email} onChange={e=>setEmail(e.target.value)}/></label>
 <label>Role<select value={role} onChange={e=>setRole(e.target.value as StaffRole)}>
 <option value="general_manager">General Manager — full access</option><option value="seller">Seller — sales and invoices</option><option value="custom">Custom permissions</option>
 </select></label></div>
 {role==='custom'&&<table className={styles.permissions}><thead><tr><th>Section</th><th>View</th><th>Create / edit</th><th>Delete</th></tr></thead><tbody>
 {ACCESS_SECTIONS.filter(s=>s!=='users').map(section=><tr key={section}><td>{section}</td>{['read','write','delete'].map(action=><td key={action}><input type="checkbox" aria-label={section+' '+action} checked={permissions[section+'.'+action]===true} onChange={e=>{
 const checked=e.target.checked;setPermissions(p=>({...p,[section+'.'+action]:checked,...(checked&&action!=='read'?{[section+'.read']:true}:{}),...(!checked&&action==='read'?{[section+'.write']:false,[section+'.delete']:false}:{})}));
 }}/></td>)}</tr>)}
 </tbody></table>}
 <button disabled={busy}>{editUid?'Save permissions':'Create invitation'}</button>{editUid&&<button type="button" onClick={reset}>Cancel editing</button>}
 </form>
 {link&&<div className={styles.row}><label>Invitation link<input readOnly value={link}/></label><button onClick={()=>change(async()=>{await navigator.clipboard.writeText(link);setStatus('Invitation link copied.');})}>Copy invitation link</button></div>}
 <h2>Staff accounts</h2>
 {users.map(user=><div className={styles.row} key={user.id}><strong>{user.name||user.email||user.id}</strong> — {user.id===OWNER_UID?'Owner':user.role} — {user.active===false?'Disabled':'Active'}
 {user.id!==OWNER_UID&&<div><button disabled={busy||user.id===staff?.uid} onClick={()=>{setEditUid(user.id);setName(user.name||'');setEmail(user.email||'');setRole(user.role==='admin'?'general_manager':user.role);setPermissions(user.permissions||{});}}>Edit access</button>
 <button disabled={busy||user.id===staff?.uid} onClick={()=>change(async()=>{await updateDoc(doc(db,'showroom_roles',user.id),{active:user.active===false});setStatus('Account access updated.');})}>{user.active===false?'Enable':'Disable'}</button></div>}</div>)}
 <h2>Pending invitations</h2>
 {invites.filter(i=>i.active&&!i.acceptedUid).map(i=><div className={styles.row} key={i.id}>{i.name} — {i.email}
 <button onClick={()=>setLink(inviteUrl(i.email))}>Show link</button><button disabled={busy} onClick={()=>change(async()=>{await updateDoc(doc(db,'showroom_staff_invites',i.id),{active:false});})}>Revoke invitation</button></div>)}
 </section>;
}
