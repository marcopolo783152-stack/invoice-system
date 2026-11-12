import {getAuth} from 'firebase/auth';
import {app} from '@/lib/firebase';
export async function inventoryRequest(body?:object,path='/api/inventory/bulk'){
 const auth=getAuth(app);await auth.authStateReady();if(!auth.currentUser||auth.currentUser.isAnonymous)throw Error('Sign in as staff.');
 const r=await fetch(path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+await auth.currentUser.getIdToken(),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store'}),d=await r.json();if(!r.ok)throw Error(d.error||'Inventory request failed.');return d;
}
