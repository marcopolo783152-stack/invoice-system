import {check,validateProfile} from './engine.mjs';
import {validDate} from './settlement.mjs';
export function accountFields(input){
 const contact=validateProfile(input),out={...contact};
 for(const key of ['address2','homePhone','gender','incomeRange']){const value=String(input[key]||'').trim();check(value.length<=150,'Invalid '+key+'.');out[key]=value;}
 const birthDate=String(input.birthDate||'');check(!birthDate||validDate(birthDate),'Enter a valid birth date.');check(!birthDate||birthDate<=new Date().toISOString().slice(0,10),'Birth date cannot be in the future.');out.birthDate=birthDate;
 out.preferences={language:['en','fa'].includes(input.preferences?.language)?input.preferences.language:'en',emailOutbid:input.preferences?.emailOutbid!==false,emailReminders:input.preferences?.emailReminders!==false,emailMarketing:input.preferences?.emailMarketing===true};
 check(Array.isArray(input.savedSearches||[])&&(input.savedSearches||[]).length<=20,'Save at most 20 searches.');out.savedSearches=(input.savedSearches||[]).map(s=>{const q=String(s).trim();check(q.length>0&&q.length<=150,'Searches must be 1–150 characters.');return q;});return out;
}
export function buyerProjection(p){if(!p)return null;return Object.fromEntries(['accountStatus','statusReason','bidderNumber','firstName','lastName','phone','homePhone','email','address1','address2','city','region','postalCode','country','birthDate','gender','incomeRange','preferences','savedSearches','updatedAt'].filter(k=>p[k]!==undefined).map(k=>[k,p[k]]));}
export function buyerInvoice(i){const safe={...i,items:(i.items||[]).map(r=>Object.fromEntries(['lotId','sku','title','amount','loadingCents','collectedDate'].filter(k=>r[k]!==undefined).map(k=>[k,r[k]])))};return Object.fromEntries(['id','number','auctionId','items','delivery','subtotal','premium','loading','shipping','tax','total','paymentStatus','paymentFailure','readyDate','policy','storageWaiverCents','dispatchedAt','trackingReference','refundedCents','storagePaidCents','createdAt'].filter(k=>i[k]!==undefined).map(k=>[k,safe[k]]));}
