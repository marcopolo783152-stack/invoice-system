import {auth} from '@/lib/auth';
export const usd=(cents:number|null)=>cents===null?'To be confirmed':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
export async function orderRequest(path:string,body?:unknown,attempt?:string){
  const user=auth.currentUser;const guest=!!user?.isAnonymous&&(path==='/api/live-orders'||path.startsWith('/api/live-orders?'));if(!user||(!guest&&(user.isAnonymous||!user.emailVerified)))throw Error('Please sign in and verify your account email.');
  const response=await fetch(path,{method:body?'POST':'GET',cache:'no-store',headers:{...(guest?{'X-Checkout-Guest':'true'}:{}),Authorization:'Bearer '+await user.getIdToken(),...(body?{'Content-Type':'application/json'}:{}),...(attempt?{'X-Checkout-Attempt':attempt}:{})},...(body?{body:JSON.stringify(body)}:{})});
  let data;try{data=await response.json();}catch{throw Error('The website could not complete this request. Please retry.');}
  if(auth.currentUser?.uid!==user.uid)throw Error('Your sign-in changed. Please refresh.');
  if(!response.ok)throw Error(data.error||'The request could not be completed.');return data;
}
export function dollarsToCents(value:string){
  if(!/^\d+(\.\d{1,2})?$/.test(value.trim()))throw Error('Enter a dollar amount with at most two decimal places.');
  const [d,c='']=value.trim().split('.');const n=Number(d)*100+Number(c.padEnd(2,'0'));
  if(!Number.isSafeInteger(n)||n>99999999)throw Error('Amount is too large.');return n;
}
export type LiveOrder={receiptEmailStatus?:string;receiptEmailError?:string;refundPending?:boolean;pricingPolicy?:string;id:string;customerInfo:{name:string;email:string;phone:string;shippingAddress:string;billingAddress:string;notes:string};
  deliveryOption:'Pickup'|'Delivery';items:{id:string;name:string;sku:string;image:string;dimensions:string;unitAmount:number}[];
  subtotal:number;discount:number;shipping:number|null;tax:number|null;total:number|null;status:string;version:number;quoteExpiresAt:number;quoteNote:string;taxNote:string;paymentStatus:string;createdAt:string;paidAt?:string;fulfillment:string;trackingNumber?:string;carrier?:string;reviewReason?:string;refundedAmount?:number;restockedAt?:string;freeShipping?:boolean;shippingIncluded?:boolean;automaticTax?:boolean;shippingService?:string};
