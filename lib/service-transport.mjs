/** @type {Record<string, {label:string, legs:string[]}>} */
export const transportMethods = {
 pickup_delivery: {label:'Pickup & delivery',legs:['pickup','delivery']},
 showroom_dropoff_pickup: {label:'Showroom drop-off & pickup',legs:[]},
 showroom_dropoff_delivery: {label:'Showroom drop-off & delivery',legs:['delivery']},
 pickup_only: {label:'Pickup only · customer collects at showroom',legs:['pickup']},
};
export function transportErrors(value){
 if(value==null)return [];
 const method=Object.hasOwn(transportMethods,value.method)?transportMethods[value.method]:null;
 if(!method)return ['Choose a valid pickup and delivery arrangement.'];
 return method.legs.flatMap(leg=>{
 const fee=value[leg];
 if(!fee||!['free','charge'].includes(fee.pricing))return [`Choose Free or Charge for ${leg}.`];
 if(fee.pricing==='charge'&&(!Number.isFinite(fee.amount)||fee.amount<=0||fee.amount>1000000||Math.abs(fee.amount*100-Math.round(fee.amount*100))>0.000001))return [`Enter a positive ${leg} charge with at most two decimal places.`];
 return [];
 });
}
/** @returns {{label:string, rows:Array<{label:string,amount:number}>, total:number}} */
export function transportSummary(value){
 const method=Object.hasOwn(transportMethods,value?.method)?transportMethods[value.method]:null;
 if(!method)return {label:'',rows:[],total:0};
 const rows=method.legs.map(leg=>({label:leg==='pickup'?'Pickup':'Delivery',amount:value[leg]?.pricing==='charge'&&Number.isFinite(value[leg]?.amount)&&value[leg].amount>0?Math.round(value[leg].amount*100)/100:0}));
 return {label:method.label,rows,total:rows.reduce((sum,row)=>sum+Math.round(row.amount*100),0)/100};
}
export function customerTransport(value){
 const method=Object.hasOwn(transportMethods,value?.method)?transportMethods[value.method]:null;
 if(!method)return null;
 return Object.fromEntries([['method',value.method],...method.legs.map(leg=>[leg,{pricing:value[leg]?.pricing,amount:value[leg]?.pricing==='free'?0:value[leg]?.amount}])]);
}
