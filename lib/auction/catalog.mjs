import {isRugOnReviewHold} from '../catalog-visibility.mjs';
import {check,cents} from './engine.mjs';
export function eligibleRug(rug) {return !!rug && rug.availability === 'In Stock' && !isRugOnReviewHold(rug);}
export function lotFields(input) {
 const out={};
 for(const [key,min,max] of [['title',3,160],['eventTitle',3,160],['condition',10,3000],['description',0,5000]]){
  const value=String(input[key]||'').trim();check(value.length>=min&&value.length<=max,`Check ${key} (${min}–${max} characters).`);out[key]=value;
 }
 out.startingCents=cents(input.startingCents);check(out.startingCents>=100,'Starting bid must be at least $1.');
 out.reserveCents=cents(input.reserveCents||0);check(!out.reserveCents||out.reserveCents>=out.startingCents,'Reserve must be at least the opening bid.');
 out.loadingCents=cents(input.loadingCents||0);
 out.startAt=input.startAt?Number(input.startAt):null;out.endAt=input.endAt?Number(input.endAt):null;
 check((out.startAt===null&&out.endAt===null)||(Number.isSafeInteger(out.startAt)&&Number.isSafeInteger(out.endAt)&&out.startAt>0&&out.endAt>out.startAt),'Enter both planned dates, with closing after opening, or leave both empty.');
 out.shippingOffered=input.shippingOffered===true;
 out.buyerPremiumBps=0;out.currency='USD';
 return out;
}
export function rugSnapshot(rug){return {rugId: rug.id,name:String(rug.name||''),sku:String(rug.sku||''),origin:String(rug.origin||''),dimensions:String(rug.dimensions||''),material:String(rug.material||''),construction:String(rug.construction||rug.manufacturingType||''),images:(Array.isArray(rug.images)?rug.images:[]).filter(url=>typeof url==='string'&&url.startsWith('https://')).slice(0,15)};}
// Explicit allowlist; no reserve amount, maximum bids, customer data or staff metadata.
export function publicLot(id,lot,rug){
 if(lot.status!=='preview'||!eligibleRug(rug))return null;
 return {id,lotNumber:lot.lotNumber,title:lot.title,eventTitle:lot.eventTitle,condition:lot.condition,description:lot.description,startingCents:lot.startingCents,hasReserve:lot.reserveCents>0,loadingCents:lot.loadingCents,startAt:lot.startAt,endAt:lot.endAt,shippingOffered:lot.shippingOffered,buyerPremiumBps:0,currency:'USD',status:'preview',biddingEnabled:false,bidCount:0,snapshot:rugSnapshot(rug)};
}
