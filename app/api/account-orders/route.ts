import {assignOrderNumber} from '@/lib/server/order-number.mjs';
import {classifyFirebaseFailure} from '@/lib/server/firebase-failure.mjs';
import {NextRequest,NextResponse} from 'next/server';
import {caller,serverDb} from '@/lib/server/firebase-admin';
import {canAccess,OWNER_UID,OWNER_EMAIL,StaffAccess} from '@/lib/access-policy';
export const runtime='nodejs';export const dynamic='force-dynamic';
function strings(value:any,keys:string[]){const out:Record<string,string>={};for(const key of keys)if(typeof value?.[key]==='string')out[key]=value[key].slice(0,2000);return out;}
export async function GET(req:NextRequest){
 try{
  const user=await caller(req);if(!user.email_verified)return NextResponse.json({error:'Verify your email first.'},{status:403});
  const db=serverDb(),role=(await db.doc('showroom_roles/'+user.uid).get()).data();
  const owner=user.uid===OWNER_UID&&user.email?.toLowerCase()===OWNER_EMAIL;
  const staff:StaffAccess|null=role&&role.email?.toLowerCase()===user.email?.toLowerCase()&&(role.active===true||(owner&&role.active!==false))&&(role.role!=='admin'||owner)?{uid:user.uid,email:user.email||'',name:role.name||'',role:role.role,active:true,permissions:role.permissions||{}}:null;
  const all=canAccess(staff,'orders');
  const ref=db.collection('showroom_orders');
  const owned=await (all?ref:ref.where('customerId','==',user.uid)).get();
  // A verified checkout email also recovers previous guest purchases without changing their owner ID.
  const emailMatches=!all&&user.email?await ref.where('customerInfo.email','==',user.email.trim().toLowerCase()).get():null;
  const snap={docs:[...new Map([...owned.docs,...(emailMatches?.docs||[])].map(d=>[d.id,d])).values()]};
  const readDocs=all?await db.collection('showroom_order_inboxes').doc(user.uid).collection('seen').get():null;
  const readIds=new Set(readDocs?.docs.map(d=>d.id)||[]);
  const orders=await Promise.all(snap.docs.map(async doc=>{
   const d=doc.data();
   if(d.liveManaged)d.orderNumber=(await assignOrderNumber(db,doc.id)).orderNumber;
   // Deliberate allowlist: never serialize raw legacy payment fields.
   return {id:doc.id,...(all?{needsAttention:!readIds.has(doc.id)&&!['Cancelled','Delivered','Returned'].includes(d.status),notificationAt:d.paidAt||d.createdAt}:{}),customerId:d.customerId||'',...strings(d,['orderNumber','status','createdAt','deliveryOption','cancellationReason','appliedPromoCode']),
    customerInfo:strings(d.customerInfo,['name','email','phone','address','street','city','state','zip','country','shippingAddress','billingAddress','address1','address2','notes']),
    subtotal:Number(d.subtotal||0),tax:Number(d.tax||0),shipping:Number(d.shipping||0),total:Number(d.total||0),discountAmount:Number(d.discountAmount||0),
    paymentDetails:strings(d.paymentDetails,['cardBrand','last4']),
    shippingDetails:strings(d.shippingDetails,all?['carrier','trackingNumber','trackingUrl','estimatedDelivery','shippedAt','labelCreatedAt','refundStatus','transactionId','labelUrl']:['carrier','trackingNumber','trackingUrl','estimatedDelivery','shippedAt']),
    notificationStatus:all?{confirmation:d.notifications?.confirmation?.status||'unknown',invoice:d.notifications?.invoice?.status||'unknown'}:undefined,
    cartItems:Array.isArray(d.cartItems)?d.cartItems.map((item:any)=>({quantity:Number(item.quantity||1),rug:{...strings(item.rug,['id','name','sku','material','origin','dimensions','sizeCategory','style','age']),price:Number(item.rug?.price||0),images:Array.isArray(item.rug?.images)?item.rug.images.filter((url:any)=>typeof url==='string').slice(0,2):[]}})):[]
   };
  }));
  return NextResponse.json({orders},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){
  const failure=classifyFirebaseFailure(error);
  console.error('[account-orders]',failure.diagnostic);
  return NextResponse.json({error:failure.status===401?'Please sign out and sign in again to load your orders.':'Orders are temporarily unavailable. Please contact the showroom.',supportCode:failure.diagnostic},{status:failure.status,headers:{'Cache-Control':'private, no-store'}});
 }
}
