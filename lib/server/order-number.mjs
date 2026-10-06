import {randomBytes,randomInt} from 'node:crypto';
import {CheckoutError} from './rug-checkout.mjs';
export async function assignOrderNumber(db,id){
 for(let attempt=0;attempt<5;attempt++){
  const orderNumber='MP-'+String.fromCharCode(65+randomInt(26))+randomBytes(5).toString('hex').toUpperCase()+randomInt(10);
  const result=await db.runTransaction(async tx=>{
   const ref=db.collection('showroom_live_orders').doc(id),o=(await tx.get(ref)).data();
   if(!o)throw new CheckoutError('Order not found.',404);if(o.orderNumber)return o;
   const reservation=db.collection('showroom_order_references').doc(orderNumber),mirror=db.collection('showroom_orders').doc(id);
   const [existing,order]=await Promise.all([tx.get(reservation),tx.get(mirror)]);if(existing.exists)return null;
   tx.set(reservation,{orderId:id});tx.update(ref,{orderNumber});if(order.exists)tx.update(mirror,{orderNumber});return {...o,orderNumber};
  });if(result)return result;
 }
 throw new CheckoutError('Order reference could not be reserved. Please retry.',503);
}
