export function needsOrderAttention(order){return order.needsAttention===true&&!['Cancelled','Delivered','Returned'].includes(order.status);}
export const unreadOrderCount=orders=>orders.filter(needsOrderAttention).length;
