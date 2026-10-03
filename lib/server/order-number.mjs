import {CheckoutError} from './rug-checkout.mjs';
export async function assignOrderNumber(db,id){
 return db.runTransaction(async tx=>{
  const ref=db.collection('showroom_live_orders').doc(id),o=(await tx.get(ref)).data();
  if(!o)throw new CheckoutError('Order not found.',404);
  if(o.orderNumber)return o;
  const counter=db.collection('showroom_counters').doc('online_orders'),mirror=db.collection('showroom_orders').doc(id);
  const [count,order]=await Promise.all([tx.get(counter),tx.get(mirror)]);
  const last=count.data()?.last||0,next=last+1;
  if(!Number.isSafeInteger(next)||next>999999999)throw new CheckoutError('Order numbering requires review.',503);
  const orderNumber='MP-'+String(next).padStart(6,'0');
  tx.set(counter,{last:next});tx.update(ref,{orderNumber});if(order.exists)tx.update(mirror,{orderNumber});
  return {...o,orderNumber};
 });
}
