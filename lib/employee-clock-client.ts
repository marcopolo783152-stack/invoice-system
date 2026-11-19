import {getAuth} from 'firebase/auth';
import {app} from './firebase';
import {getCurrentStoreId} from './user-storage';
export async function kioskKey(rotate=false){const auth=getAuth(app);await auth.authStateReady();const u=auth.currentUser;if(!u||u.isAnonymous)throw Error('Please sign in as manager to create the Shop QR.');const r=await fetch('/api/employee-clock/access',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await u.getIdToken()},body:JSON.stringify({storeId:getCurrentStoreId(),rotate}),cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error);return d.token as string;}
export function kioskUrl(token:string,employeeId=''){return window.location.origin+'/admin/invoices/clock'+(employeeId?'?id='+encodeURIComponent(employeeId):'')+'#key='+token;}
export async function kioskQr(employeeId=''){const token=await kioskKey();const qr=require('qrcode');return qr.toDataURL(kioskUrl(token,employeeId),{width:500,margin:2,errorCorrectionLevel:'H'}) as Promise<string>;}
