'use client';
import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { StaffAccess } from '@/lib/access-policy';
import { subscribeStaff } from '@/lib/staff-access';
export function useStaffAccess() {
 const [state, setState] = useState<{ staff: StaffAccess | null; user: User | null; loading: boolean; error: string }>({ staff:null, user:null, loading:true, error:'' });
 useEffect(() => subscribeStaff((staff,user,error,loading=false) => {
  setState({staff,user,loading,error:error || ''});
 }), []);
 return state;
}
