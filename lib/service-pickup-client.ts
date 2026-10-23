import {getAuth} from 'firebase/auth';
import {app} from './firebase';
export async function pickupRequest(query='',body?:object){const a=getAuth(app);await a.authStateReady();if(!a.currentUser||a.currentUser.isAnonymous)throw Error('Sign in as staff.');const r=await fetch('/api/service-pickups'+query,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+await a.currentUser.getIdToken(),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store'}),d=await r.json();if(!r.ok)throw Error(d.error||'Pickup request failed.');return d;}
