import {isRugOnReviewHold} from './catalog-visibility.mjs';
export const money = value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value)||0);
export const availableRugs = rugs => rugs.filter(r => !isRugOnReviewHold(r) && r.availability === 'In Stock');
export function dimensions(rug) {
  const parts = String(rug.dimensions || '').toLowerCase().replace(/[’′]/g,"'").split(/\s*[x×]\s*/);
  if(parts.length !== 2) return null;
  const parse = s => { const m=s.trim().match(/^(\d+(?:\.\d+)?)\s*(?:'|ft|feet)\s*(\d+(?:\.\d+)?)?/); return m ? +m[1] + +(m[2]||0)/12 : /^\d+(?:\.\d+)?$/.test(s.trim()) ? +s : NaN; };
  const values=parts.map(parse); return values.every(v=>Number.isFinite(v)&&v>0) ? values.sort((a,b)=>a-b) : null;
}
export function sizeGroup(rug) {
  const d=dimensions(rug);
  if(String(rug.shape).toLowerCase()==='runner' || /runner/i.test(rug.sizeCategory||'') || (d && d[1]/d[0]>=2.5)) return 'Runners';
  if(!d) return 'Other sizes';
  return d[0] >=9.5 || d[1]>=13.5 ? 'Oversized' : d[0]>=7 ? 'Large' : d[0]>=4.5 ? 'Medium' : 'Small';
}
// Nominal shopping sizes; exact stored dimensions are never modified.
export const SHOP_SIZE_OPTIONS = ['2 × 3','3 × 5','4 × 6','5 × 7','5 × 8','6 × 9','7 × 10','8 × 10','8 × 11','9 × 12','10 × 11','10 × 13','10 × 14','12 × 15','12 × 18','2 × 6','2 × 8','2 × 10','3 × 8','3 × 10','3 × 12','Runners','Small','Medium','Large','Oversized','Other sizes'];
export function matchesSize(rug, size) {
  if (!size) return true;
  const target = dimensions({dimensions:size});
  if (!target) return sizeGroup(rug) === size;
  const actual = dimensions(rug);
  return !!actual && actual.every((value,index)=>Math.abs(value-target[index]) <= 0.5 + 1e-9);
}
export function construction(rug) { return rug.manufacturingType || rug.construction || ''; }
export function matchesSearch(rug,query) {
  const hay=[rug.name,rug.sku,rug.origin,rug.material,rug.style,rug.shape,rug.dimensions,rug.sizeCategory,construction(rug),...(rug.colors||[])].join(' ').toLowerCase();
  const sizes = [];
  const measurement = String.raw`\d+(?:\.\d+)?(?:\s*(?:ft|feet|')\s*(?:\d+(?:\.\d+)?\s*(?:inches|in|")?)?)?`;
  const sizePattern = new RegExp(`\\b${measurement}\\s*[x×]\\s*${measurement}`, 'g');
  const text = query.toLowerCase().replace(/[’′]/g,"'").replace(sizePattern, match=>{ sizes.push(match); return ' '; });
  return sizes.every(size=>matchesSize(rug,size)) && text.trim().split(/\s+/).every(word=>hay.includes(word));
}
export function approvedReviews(reviews,id) {return reviews.filter(r=>r.rugId===id && r.isApproved===true && Number.isFinite(r.rating) && r.rating>=1 && r.rating<=5);}
export function relatedRugs(rugs,seed,{runnersOnly=false}={}) {
  const d=dimensions(seed), colors=(seed.colors||[]).map(c=>c.toLowerCase());
  return availableRugs(rugs).filter(r=>r.id!==seed.id && (!runnersOnly||sizeGroup(r)==='Runners')).map(r=>{
    const rd=dimensions(r); let score=0;
    if(construction(r)&&construction(r)===construction(seed))score+=4;
    if(r.material&&r.material.toLowerCase()===String(seed.material).toLowerCase())score+=3;
    score+=(r.colors||[]).filter(c=>colors.includes(c.toLowerCase())).length*3;
    if(d&&rd)score+=Math.max(0,5-Math.abs(d[0]-rd[0])-Math.abs(d[1]-rd[1]));
    if(r.price>0&&seed.price>0)score+=Math.max(0,3-3*Math.abs(Math.log(r.price/seed.price)));
    if(r.style===seed.style && !/new/i.test(r.style))score+=2;
    return {rug:r,score};
  }).sort((a,b)=>b.score-a.score||a.rug.id.localeCompare(b.rug.id)).map(x=>x.rug);
}
export function filterRugs(rugs,filters) {
  return availableRugs(rugs).filter(r=>matchesSearch(r,filters.q||'') && matchesSize(r,filters.size) && (!filters.color||(r.colors||[]).some(c=>c.toLowerCase().includes(filters.color.toLowerCase()))) && (!filters.material||String(r.material).toLowerCase().includes(filters.material.toLowerCase())) && (!filters.origin||r.origin===filters.origin) && (!filters.construction||construction(r)===filters.construction) && (!filters.budget||r.price<=Number(filters.budget)));
}
