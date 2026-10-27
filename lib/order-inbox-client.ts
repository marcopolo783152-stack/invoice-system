import {auth} from './auth';
export async function markOrdersSeen(ids:string[]){
 const user=auth.currentUser;if(!user)return;
 for(let offset=0;offset<ids.length;offset+=100){const group=ids.slice(offset,offset+100),r=await fetch('/api/order-inbox',{method:'POST',headers:{Authorization:'Bearer '+await user.getIdToken(),'Content-Type':'application/json'},body:JSON.stringify({ids:group})});if(!r.ok)throw Error('Could not save the order read status.');if(auth.currentUser?.uid!==user.uid)return;window.dispatchEvent(new CustomEvent('marcopolo-orders-seen',{detail:{uid:user.uid,ids:group}}));}
}
