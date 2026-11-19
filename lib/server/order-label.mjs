import {CheckoutError} from './rug-checkout.mjs';
export function labelEligibility(order,live){
 if(!order)throw new CheckoutError('Order not found.',404);
 if(order.deliveryOption!=='Delivery'||['Cancelled','Delivered','Returned'].includes(order.status))throw new CheckoutError('Only an active delivery order can have a shipping label.',409);
 if(live&&(order.paymentStatus!=='Paid'||order.reviewReason||order.refundedAmount>0||order.refundPending||order.refundRequest||['Delivered','Collected'].includes(order.fulfillment)))throw new CheckoutError('Only a verified paid delivery order without a refund or review hold can have a label.',409);
 if(order.shippingDetails?.transactionId||order.shippingDetails?.trackingNumber||order.trackingNumber)throw new CheckoutError('This order already has a label or tracking number. Review it in Shippo before buying another.',409);
}
export function labelAddress(order){
 const c=order.customerInfo||{},a=c.deliveryAddress||{},parts=String(c.shippingAddress||'').split(',').map(v=>v.trim()),stateZip=(parts[2]||'').match(/^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
 const address={name:c.name||'Customer',street1:a.street1||c.address1||c.street||parts[0]||'',street2:a.street2||c.address2||'',city:a.city||c.city||parts[1]||'',state:a.state||c.state||stateZip?.[1]||'',zip:a.zip||c.zip||c.zipCode||stateZip?.[2]||'',country:a.country||c.country||'US'};
 if(!address.street1||!address.city||!address.state||!address.zip||address.country!=='US')throw new CheckoutError('Complete the saved order street, city, state and ZIP before requesting rates.',400);return address;
}
