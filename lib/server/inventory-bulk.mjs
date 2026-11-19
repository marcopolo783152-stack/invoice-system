import {eligibleRug,rugSnapshot} from '../auction/catalog.mjs';
import {prepareAuction} from '../auction/planning.mjs';
import {deliveredCents} from '../delivered-price.mjs';
import {createHash} from 'node:crypto';
import {weightPatch} from '../inventory/weight.mjs';
import {categorizeRug} from '../rug-categorization.mjs';
export const BULK_ACTIONS=['price','discount','remove_sale','category','availability','publish','unpublish','weight_sqft','weight_manual','shipping','construction','material','style','auction'];
export function bulkInput(b){
 if(!b||!BULK_ACTIONS.includes(b.operation)||!Array.isArray(b.ids)||!b.ids.length||b.ids.length>100||new Set(b.ids).size!==b.ids.length||b.ids.some(id=>typeof id!=='string'||!/^[-\w]{1,100}$/.test(id)))throw Error('Choose 1–100 unique rugs per batch and a valid action.');
 return b;
}
function number(value,min,max){const n=Number(value);if(value===''||!Number.isFinite(n)||n<min||n>max)throw Error(`Enter a number between ${min} and ${max}.`);return n;}
const money=n=>Math.round(n*100)/100;
export function inventoryChange(rug,operation,p={}){
 if(rug.liveOrderId||rug.auctionLotId)throw Error('Linked to a checkout or auction. Manage that order or lot first.');
 switch(operation){
 case 'price':return {price:money(number(p.value,.01,1000000)),originalPrice:null};
 case 'discount':{const base=Number(rug.originalPrice||rug.price);if(!(base>0))throw Error('Missing base price.');return {originalPrice:base,price:Math.max(.01,money(base*(1-number(p.value,.01,99.99)/100)))};}
 case 'remove_sale':if(!rug.originalPrice)throw Error('No sale price to remove.');return {price:rug.originalPrice,originalPrice:null};
 case 'category':if(p.value==='auto'){const r=categorizeRug({...rug,categoryMode:'auto'});return {categoryMode:'auto',sizeCategory:r.sizeCategory,shape:r.shape};}if(typeof p.value!=='string'||!p.value.trim()||p.value.length>100)throw Error('Enter a category.');return {sizeCategory:p.value.trim(),categoryMode:'manual'};
 case 'availability':if(!['In Stock','Sold','Reserved','On Hold','Unavailable'].includes(p.value))throw Error('Choose a valid availability.');return {availability:p.value};
 case 'publish':return {published:true};
 case 'unpublish':return {published:false};
 case 'weight_sqft':{const rate=number(p.value,.001,100);if((rug.weightMode==='manual'||!rug.weightMode&&Number(rug.weightLbs)>0)&&!p.replaceManual)throw Error('Manual weight preserved. Enable replacement to overwrite it.');return weightPatch({...rug,weightMode:'sqft',weightPerSqft:rate});}
 case 'weight_manual':return {weightMode:'manual',weightPerSqft:null,weightLbs:number(p.value,.01,1000)};
 case 'shipping':{const patch={};if(typeof p.free==='boolean')patch.isFreeShipping=p.free;if(p.package){const box={};for(const key of ['length','width','height','weight'])box[key]=number(p.package[key],.01,1000);patch.shippingPackage=box;}if(!Object.keys(patch).length)throw Error('Choose shipping settings.');return patch;}
 case 'construction':if(!['Handmade','Machine-made'].includes(p.value))throw Error('Choose a construction type.');return {construction:p.value,manufacturingType:p.value};
 case 'material':if(typeof p.value!=='string'||!p.value.trim()||p.value.length>200)throw Error('Enter a material.');return {material:p.value.trim()};
 case 'style':if(!['Antique','Modern','Traditional','Vintage','Tribal'].includes(p.value))throw Error('Choose a style.');return {style:p.value};
 case 'auction':if(rug.availability!=='In Stock'||rug.published===false)throw Error('Only available, published inventory can be added.');return {auctionDraft:true,startingBid:money(number(p.value,1,1000000))};
 default:throw Error('Choose an action.');
 }
}
export const operationHash=b=>createHash('sha256').update(JSON.stringify({operation:b.operation,params:b.params||{},ids:b.ids})).digest('hex');
export function validateProfiles(input){const out={};for(const type of ['Machine-made','Handmade']){if(input?.[type]!==''&&input?.[type]!=null)out[type]=number(input[type],.001,100);}return out;}

export const recordVersion=d=>d.updateTime?`${d.updateTime.seconds}.${d.updateTime.nanoseconds}`:'';
function inventoryPlan(d,b){const rug={...d.data(),id:d.id};try{if(!d.exists)throw Error('Rug no longer exists.');if(b.operation==='auction'&&!eligibleRug(rug))throw Error('Unavailable or held for review.');const changes=inventoryChange(rug,b.operation,b.params);return {id:d.id,sku:rug.sku||'',name:rug.name||'',expected:recordVersion(d),before:Object.fromEntries(Object.keys(changes).map(k=>[k,rug[k]??null])),changes,customerPriceBefore:deliveredCents(rug),customerPriceAfter:deliveredCents({...rug,...changes})};}catch(e){return {id:d.id,sku:rug.sku||'',name:rug.name||'',error:e.message};}}
export async function previewInventoryBatch(db,b){bulkInput(b);const docs=await db.getAll(...b.ids.map(id=>db.doc('showroom_rugs/'+id)));return {rows:docs.map(d=>inventoryPlan(d,b)),hash:operationHash(b)};}
export async function applyInventoryBatch(db,b,uid,now=new Date().toISOString()){
 bulkInput(b);if(typeof b.requestId!=='string'||!/^[-\w]{8,100}$/.test(b.requestId)||!Array.isArray(b.expected)||b.expected.length!==b.ids.length)throw Error('Preview these changes before applying.');
 const refs=b.ids.map(id=>db.doc('showroom_rugs/'+id)),receipt=db.doc('showroom_inventory_bulk/'+b.requestId),fingerprint=operationHash(b)+JSON.stringify(b.expected);
 return db.runTransaction(async tx=>{
 const prior=await tx.get(receipt);if(prior.exists){if(prior.data().fingerprint!==fingerprint||prior.data().by!==uid)throw Error('Operation reference conflict.');return prior.data().result;}
 const docs=await Promise.all(refs.map(ref=>tx.get(ref))),rows=docs.map((d,index)=>recordVersion(d)!==b.expected[index]?{id:d.id,sku:d.data()?.sku||'',error:'Changed since preview. Preview it again.'}:inventoryPlan(d,b));
 const ready=rows.filter(r=>!r.error),auctionId=b.operation==='auction'&&ready.length?'bulk-'+b.requestId:null;
 if(auctionId){const source=docs.filter(d=>ready.some(r=>r.id===d.id)),title=String(b.params?.title||'').trim();if(title.length<3||title.length>160)throw Error('Enter an auction draft title (3–160 characters).');
 const auction=prepareAuction({title,status:'draft',rows:source.map(d=>{const rug={...d.data(),id:d.id},snapshot=rugSnapshot(rug);return {rugId:d.id,title:String(rug.name||rug.sku).slice(0,160),sku:snapshot.sku,origin:snapshot.origin,dimensions:snapshot.dimensions,material:snapshot.material,condition:String(rug.condition||''),image:snapshot.images[0]||'',starting:String(b.params?.value||'1'),reserve:'0',loading:'0'};})});
 tx.create(db.doc('auction_workspaces_v1/'+auctionId),{...auction,version:1,updatedAt:Date.parse(now),createdAt:Date.parse(now),updatedBy:uid,publicEnabled:false});
 }else if(b.operation!=='auction'){for(const row of ready){const old=docs.find(d=>d.id===row.id).data(),publish=b.operation==='publish'?{publishedAt:now,firstPublishedAt:old.firstPublishedAt||old.publishedAt||now,publishBatchId:b.requestId,publishBatchLabel:String(b.params?.label||'Published batch').slice(0,120)}:{};tx.update(db.doc('showroom_rugs/'+row.id),{...row.changes,...publish,updatedAt:now});}}
 const result={rows,auctionId,updated:ready.length,skipped:rows.length-ready.length};tx.create(receipt,{fingerprint,by:uid,at:now,operation:b.operation,params:b.params||{},result});return result;
 });
}
