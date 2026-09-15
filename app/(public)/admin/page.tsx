'use client';
import { useEffect } from 'react';
import { useStaffAccess } from '@/hooks/useStaffAccess';
import { syncLegacyStaffSession } from '@/lib/staff-session';
export default function AdminRedirect() {
 const {staff,user,loading,error}=useStaffAccess();
 useEffect(()=>{
  if(loading)return;
  if(!user||user.isAnonymous){window.location.replace('/staff-login');return;}
  if(staff){syncLegacyStaffSession(staff);sessionStorage.setItem('marcopolo_active_view','admin');window.location.replace('/?view=admin');}
 },[staff,user,loading]);
 return <main style={{padding:32}}>{loading?'Checking your access…':staff?'Opening showroom admin…':<><p>{error||'Your account needs verified email and active staff access.'}</p><a href="/staff-login">Staff sign in / verify email</a></>}</main>;
}
