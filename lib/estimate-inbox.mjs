export const estimateStatuses=['New','Contacted','No Answer','Bringing to Showroom','Pickup Requested','Thinking About It','On Hold','Converted to Invoice','Estimate Provided','Pickup Scheduled','In Service','Ready','Delivered','Completed','Declined','Closed','Cancelled'];
export const estimateTabs=[{id:'new',label:'New'},{id:'progress',label:'In progress'},{id:'closed',label:'Completed / Closed'},{id:'all',label:'All'}];
/** Reading is independent of workflow: only an action removes a request from New. */
export function estimateBucket(estimate){
 const status=String(estimate?.status||'New').trim().toLowerCase();
 if(status==='new'||!status)return 'new';
 return ['converted to invoice','delivered','completed','declined','closed','cancelled','canceled'].includes(status)?'closed':'progress';
}
export function estimateCounts(estimates){return estimates.reduce((counts,e)=>{counts[estimateBucket(e)]++;counts.all++;return counts;},{new:0,progress:0,closed:0,all:0});}
export function filterEstimates(estimates,tab,query=''){
 const text=query.trim().toLowerCase();
 return estimates.filter(e=>(tab==='all'||estimateBucket(e)===tab)&&(!text||[e.id,e.name,e.phone,e.email,e.zip,e.status,e.notes,e.service,e.description,...(e.rugs||[]).flatMap(r=>[r.service,r.description,r.rugType,r.dimensions])].filter(Boolean).join(' ').toLowerCase().includes(text))).sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
}
/** Only workflow fields are updated; photos, contacts and rug details remain intact. */
export async function saveEstimateStatus({id,status,write,now=()=>new Date().toISOString()}){
 if(!estimateStatuses.includes(status))throw Error('Choose a valid request status.');
 await write(id,{status,statusUpdatedAt:now()});
}
export async function saveEstimateRead({id,write,now=()=>new Date().toISOString()}){await write(id,{readAt:now()});}
