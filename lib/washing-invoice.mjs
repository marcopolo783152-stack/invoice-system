// Shared invoice readiness rules; financial fields are never recalculated here.
export function washingSummary(data){
 const rugs=data.items||[];
 const progress=data.washingProgress||{};
 const washed=i=>!!i.sku&&progress[i.id]?.sku===i.sku.toUpperCase()&&progress[i.id]?.status==='Checked & ready';
 const needsWash=i=>i.serviceType?.wash!==false||!i.serviceType?.repair||!!progress[i.id];
 const ready=i=>(!needsWash(i)||washed(i))&&(!i.serviceType?.repair||!!i.repairCompletedAt);
 const readyCount=rugs.filter(ready).length;
 const pendingWash=rugs.some(i=>needsWash(i)&&!washed(i));
 return {readyCount,total:rugs.length,status:data.status==='picked_up'?'picked_up':rugs.length&&readyCount===rugs.length?'ready':pendingWash?'washing':'repairing'};
}
export function mergeWashingProgress(current,incoming){
 if(!current.washingProgress)return incoming;
 const merged={...incoming,washingProgress:current.washingProgress};
 const summary=washingSummary(merged);
 return {...merged,status:current.status==='picked_up'?'picked_up':summary.status};
}
