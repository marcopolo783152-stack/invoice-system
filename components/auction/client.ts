import {getAuth} from 'firebase/auth';
import {app} from '@/lib/firebase';
export async function auctionRequest(path:string,body?:object){
 const auth=getAuth(app);await auth.authStateReady();const user=auth.currentUser;
 if(!user||user.isAnonymous)throw Error('Please sign in to your account first.');
 const response=await fetch('/api/auction/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+await user.getIdToken(),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store'});
 const data=await response.json();if(!response.ok)throw Error(data.error||'Request failed.');return data;
}
export const auctionMoney=(c:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format((c||0)/100);
