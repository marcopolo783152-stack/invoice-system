import {check} from './engine.mjs';
export const STAGES=['draft','ready','coming_soon','next_auction','archived'];
export function dollars(value){const s=String(value??'').trim();check(/^\d{1,7}(\.\d{1,2})?$/.test(s),'Use a dollar amount with at most two decimals.');const [a,b='']=s.split('.');const n=Number(a)*100+Number(b.padEnd(2,'0'));check(n<=100000000,'Amount exceeds $1,000,000.');return n;}
export function prepareAuction(input){
 const title=String(input.title||'').trim();check(title.length>=3&&title.length<=160,'Enter an auction name (3–160 characters).');
 check(STAGES.includes(input.status),'Invalid preparation stage.');check(Array.isArray(input.rows)&&input.rows.length<=100,'An auction supports up to 100 lots.');
 const startAt=Number(input.startAt)||0,endAt=Number(input.endAt)||0,stagger=Number(input.stagger)||0;
 check(Number.isSafeInteger(startAt)&&Number.isSafeInteger(endAt)&&startAt>=0&&endAt>=0,'Invalid dates.');check(Number.isInteger(stagger)&&stagger>=0&&stagger<=600,'Stagger must be 0–600 seconds.');
 const seen=new Set();const rows=input.rows.map((r,i)=>{const out={};for(const k of ['rugId','title','sku','origin','dimensions','material','condition','image']){out[k]=String(r[k]||'').trim();check(out[k].length<=(k==='condition'?3000:k==='image'?2000:160),`Row ${i+1}: ${k} is too long.`);}
 check(!out.rugId||/^[\w-]{1,100}$/.test(out.rugId),`Row ${i+1}: invalid inventory ID.`);const key=out.rugId||out.sku.toLowerCase();check(!key||!seen.has(key),`Row ${i+1}: duplicate rug or SKU.`);if(key)seen.add(key);
 check(!out.image||/^https:\/\//.test(out.image),`Row ${i+1}: photo must be an HTTPS URL.`);
 for(const k of ['starting','reserve','loading']){try{out[k]=dollars(r[k]||'0')/100;}catch(e){throw Error(`Row ${i+1}, ${k}: ${e.message}`);}}
 check(!out.reserve||out.reserve>=out.starting,`Row ${i+1}: reserve is below starting bid.`);return out;
 });
 const issues=[];if(!rows.length)issues.push('Add at least one rug.');if(!startAt||endAt<=startAt)issues.push('Set opening and closing dates.');
 rows.forEach((r,i)=>{for(const k of ['title','sku','origin','dimensions','material','image'])if(!r[k])issues.push(`Lot ${i+1}: add ${k}.`);if(r.condition.length<10)issues.push(`Lot ${i+1}: add a condition report (at least 10 characters).`);if(r.starting<1)issues.push(`Lot ${i+1}: starting bid must be at least $1.`);if(!r.rugId)issues.push(`Lot ${i+1}: link to reviewed showroom inventory before marking ready.`);});
 if(['ready','coming_soon','next_auction'].includes(input.status)){check(!issues.length,issues.slice(0,5).join(' '));check(startAt>Date.now(),'Planned opening must be in the future.');}
 return {title,status:input.status,startAt,endAt,stagger,rows,issues};
}
