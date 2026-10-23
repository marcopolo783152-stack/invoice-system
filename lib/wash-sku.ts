import {getAuth} from 'firebase/auth';
import {app,browserSessionReady} from './firebase';
export async function reserveWashSkuBatch(requestId:string,count:number):Promise<string[]> {
 await browserSessionReady;
 const auth=getAuth(app);await auth.authStateReady();
 if(!auth.currentUser||auth.currentUser.isAnonymous)throw Error('Please sign in to reserve wash SKUs.');
 const response=await fetch('/api/invoices/wash-skus',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await auth.currentUser.getIdToken()},body:JSON.stringify({requestId,count})});
 const data=await response.json();
 if(!response.ok)throw Error(data.error||'Could not reserve wash SKUs.');
 if(!Array.isArray(data.skus)||data.skus.length!==count||data.skus.some((s:unknown)=>typeof s!=='string'||!/^MPW\d+$/.test(s)))throw Error('Invalid wash SKU reservation response.');
 return data.skus;
}
