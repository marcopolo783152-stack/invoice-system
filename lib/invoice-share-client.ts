import {auth} from './auth';
export async function createCustomerInvoiceLink(id:string,view:'invoice'|'tracking'='invoice'){
 const user=auth.currentUser;if(!user)throw Error('Please sign in again before sharing.');
 const r=await fetch('/api/invoices/share',{method:'POST',headers:{Authorization:'Bearer '+await user.getIdToken(),'Content-Type':'application/json'},body:JSON.stringify({id,view})});
 const data=await r.json();if(!r.ok)throw Error(data.error||'Could not create invoice link.');return data.url as string;
}
