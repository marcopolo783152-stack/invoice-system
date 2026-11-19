import {categoryMeasurements} from '../rug-categorization.mjs';
export function rugArea(rug){
 const d=categoryMeasurements(rug.dimensions),shape=String(rug.shape||'').toLowerCase();
 if(!d||(!/[x×]/i.test(String(rug.dimensions||''))&&!['round','square'].includes(shape)))return null;
 return /round|oval/.test(shape)?d[0]*d[1]*Math.PI/4:d[0]*d[1];
}
export function weightFor(rug,profiles={}){
 if(rug.weightMode==='manual'&&Number(rug.weightLbs)>0)return Number(rug.weightLbs);
 const basis=rug.manufacturingType||rug.construction,rate=rug.weightPerSqft||profiles[basis];
 if(rug.weightMode==='sqft'||!Number(rug.weightLbs)&&Number(rate)>0){const area=rugArea(rug);if(area===null||!Number.isFinite(Number(rate))||Number(rate)<=0)return null;return Math.ceil(area*Number(rate)*100-1e-8)/100;}
 return Number(rug.weightLbs)>0?Number(rug.weightLbs):null;
}
export function weightPatch(rug,profiles={}){
 const weight=weightFor(rug,profiles);if(!weight||!Number.isFinite(weight)||weight>1000)throw Error('Check dimensions and rug weight (up to 1,000 lb).');
 const rate=rug.weightPerSqft||profiles[rug.manufacturingType||rug.construction];
 return {weightLbs:weight,...((rug.weightMode==='sqft'||!Number(rug.weightLbs))&&rate?{weightMode:'sqft',weightPerSqft:Number(rate)}:{weightMode:'manual'})};
}
export function batchOptions(rugs,kind){const groups=new Map();for(const r of rugs){const id=r[kind==='upload'?'uploadBatchId':'publishBatchId'];if(id){const at=r[kind==='upload'?'uploadedAt':'publishedAt']||'';groups.set(id,{id,label:r[kind==='upload'?'uploadBatchLabel':'publishBatchLabel']||id,at});}}return [...groups.values()].sort((a,b)=>String(b.at).localeCompare(String(a.at)));}
export function matchesBatch(rug,filter){if(!filter||filter==='all')return true;if(filter==='unpublished')return rug.published===false;if(filter==='legacy')return !rug.uploadedAt&&!rug.createdAt;const [kind,...rest]=filter.split(':');return rug[kind==='upload'?'uploadBatchId':'publishBatchId']===rest.join(':');}
