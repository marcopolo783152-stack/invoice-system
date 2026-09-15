'use client';
import {useState} from 'react';
import {auth} from '@/lib/auth';
import {useStaffAccess} from '@/hooks/useStaffAccess';
import {canAccess} from '@/lib/access-policy';
export default function OrderPaymentControls({orderId}:{orderId:string}){
 const {staff}=useStaffAccess();const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[done,setDone]=useState(false);
 if(!canAccess(staff,'orders','delete'))return null;
 const remove=async()=>{
  if(!window.confirm('Permanently remove saved payment details from this order? The order and its total will remain. This cannot be undone.'))return;
  setBusy(true);setMessage('');
  try{
   const token=await auth.currentUser?.getIdToken();if(!token)throw Error('Please sign in again.');
   const response=await fetch('/api/order-payment?orderId='+encodeURIComponent(orderId),{method:'DELETE',headers:{Authorization:'Bearer '+token}});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Could not remove payment details.');
   setDone(true);setMessage('Saved payment details removed. The order is unchanged.');
  }catch(error){setMessage(error instanceof Error?error.message:'Please try again.');}finally{setBusy(false);}
 };
 return <div style={{marginTop:12}}><button type="button" disabled={busy||done} onClick={remove} style={{padding:'8px 12px',border:'1px solid #c6cfc8',borderRadius:6,color:'#7c2525',background:'#fff'}}>{busy?'Removing…':done?'Payment details removed':'Remove saved payment details'}</button>{message&&<p role="status">{message}</p>}</div>;
}
