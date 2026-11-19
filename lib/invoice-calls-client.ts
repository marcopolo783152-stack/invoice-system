import {getAuth} from 'firebase/auth';
import {app} from './firebase';
import {getStorePrefix} from './user-storage';
export async function invoiceCallRequest(invoiceId:string,call?:object,cursor=''){
 const auth=getAuth(app);await auth.authStateReady();
 if(!auth.currentUser||auth.currentUser.isAnonymous)throw Error('Sign in as staff.');
 const collection=getStorePrefix()+'invoices';
 const query=new URLSearchParams({collection,id:invoiceId,...(cursor?{cursor}:{})});
 const response=await fetch('/api/invoice-calls'+(call?'':'?'+query),{method:call?'POST':'GET',headers:{Authorization:'Bearer '+await auth.currentUser.getIdToken(),'Content-Type':'application/json'},...(call?{body:JSON.stringify({collection,invoiceId,call})}:{}),cache:'no-store'});
 const data=await response.json();if(!response.ok)throw Error(data.error||'Could not save or load the call.');return data;
}
