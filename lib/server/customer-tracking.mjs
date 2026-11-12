import {createHash} from 'node:crypto';
import {CheckoutError} from './rug-checkout.mjs';
export async function trackingLimit(db,request,kind='lookup',max=12,now=Date.now()){
 const ip=request.headers.get('x-real-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
 const ref=db.collection('showroom_tracking_limits').doc(createHash('sha256').update(kind+':'+ip).digest('hex'));
 await db.runTransaction(async tx=>{const old=(await tx.get(ref)).data(),window=Math.floor(now/60000),count=old?.window===window?Number(old.count||0):0;if(count>=max)throw new CheckoutError('Too many tracking requests. Please try again in one minute.',429);tx.set(ref,{window,count:count+1});});
}
/** @param {any} user */
export async function findCustomerOrder(db,reference,email,user=null){
 const raw=String(reference||'').trim(),upper=raw.toUpperCase(),mail=String(email||'').trim().toLowerCase();
 if(!/^[A-Za-z0-9_-]{3,100}$/.test(raw)||mail.length>254)throw new CheckoutError('Enter your order number and checkout email.',400);
 const verified=user?.email_verified===true,accountEmail=verified?String(user.email||'').toLowerCase():'';
 if(!verified&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail))throw new CheckoutError('Enter the email used at checkout to see your order.',400);
 const ref=db.collection('showroom_orders'),matches=await ref.where('orderNumber','==',upper).limit(2).get();
 const direct=await ref.doc(raw).get(),upperDoc=raw!==upper?await ref.doc(upper).get():null;
 const docs=new Map([...matches.docs,...(direct.exists?[direct]:[]),...(upperDoc?.exists?[upperDoc]:[])].map(d=>[d.id,d]));
 const allowed=[...docs.values()].filter(d=>{const o=d.data(),buyer=String(o.customerInfo?.email||'').trim().toLowerCase();return verified&&(o.customerId===user.uid||buyer&&buyer===accountEmail)||mail&&buyer===mail;});
 if(allowed.length!==1)throw new CheckoutError('We could not find an order matching that number and email. Check your receipt or call (703) 461-0207.',404);
 const doc=allowed[0],o=doc.data(),text=v=>typeof v==='string'?v.slice(0,2000):'',money=v=>Number.isFinite(Number(v))?Number(v):0;
 return {id:doc.id,orderNumber:text(o.orderNumber)||doc.id,status:text(o.status),createdAt:text(o.createdAt),deliveryOption:text(o.deliveryOption),trackingReadOnly:true,
 customerInfo:{name:text(o.customerInfo?.name)},subtotal:money(o.subtotal),tax:money(o.tax),shipping:money(o.shipping),total:money(o.total),
 shippingDetails:{carrier:text(o.shippingDetails?.carrier||o.carrier),trackingNumber:text(o.shippingDetails?.trackingNumber||o.trackingNumber),trackingUrl:text(o.shippingDetails?.trackingUrl),estimatedDelivery:text(o.shippingDetails?.estimatedDelivery)},
 cartItems:Array.isArray(o.cartItems)?o.cartItems.map(i=>({quantity:money(i.quantity)||1,rug:{id:text(i.rug?.id),name:text(i.rug?.name),sku:text(i.rug?.sku),dimensions:text(i.rug?.dimensions),price:money(i.rug?.price),images:Array.isArray(i.rug?.images)?i.rug.images.filter(v=>typeof v==='string'&&/^https?:\/\//.test(v)).slice(0,1):[]}})):[]};
}
