'use client';
import { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useStaffAccess } from '@/hooks/useStaffAccess';
import { canAccess, invoiceSection } from '@/lib/access-policy';
import { syncLegacyStaffSession } from '@/lib/staff-session';
export default function StaffGate({children,section}:{children:ReactNode;section?:string}) {
 const {staff,user,loading,error}=useStaffAccess();
 const pathname=usePathname();
 const [readyUid,setReadyUid]=useState<string|null>(null);
 useEffect(()=>{
  if(loading)return;
  syncLegacyStaffSession(staff);
  setReadyUid(staff?.uid||null);
  if(!user||user.isAnonymous) window.location.replace('/staff-login?next='+encodeURIComponent(pathname||'/admin/invoices'));
 },[staff,user,loading,pathname]);
 if(loading)return <p style={{padding:24}}>Checking your access…</p>;
 if(!staff)return <div style={{padding:24}}><p>{error||'This area requires an active, verified staff account.'}</p><a href="/staff-login">Sign in to the showroom</a></div>;
 if(section!=='staff' && !canAccess(staff,section||invoiceSection(pathname||'')))return <div style={{padding:24}}><p>You do not have access to this section.</p><a href="/?view=admin">Back to showroom admin</a></div>;
 if(readyUid!==staff.uid)return <p style={{padding:24}}>Opening your workspace…</p>;
 return <>{children}</>;
}
