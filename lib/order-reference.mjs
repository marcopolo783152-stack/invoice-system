export function orderReference(order){return order?.orderNumber||(order?.id?.startsWith('MPR-LIVE-')?'Online order':order?.id||'');}
