import {auth} from './auth';
/** Notify only after a confirmed save; failures never make a successful save look unsuccessful. */
export async function customerEmailEvent(collection:string,id:string,observe=false):Promise<string>{
 try{
  await auth.authStateReady();const user=auth.currentUser;if(!user)return 'unavailable';
  const response=await fetch('/api/customer-emails',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await user.getIdToken()},signal:AbortSignal.timeout(15000),body:JSON.stringify({action:observe?'observe':'event',collection,id})});
  const result=await response.json();
  return response.ok&&typeof result.status==='string'?result.status:'unavailable';
 }catch{console.warn('Email event will be checked by the scheduled worker.');return 'unavailable';}
}
