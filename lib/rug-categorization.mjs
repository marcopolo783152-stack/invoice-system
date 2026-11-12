const rectangles=['1x2','2x3','3x4','3x5','4x6','5x7','5x8','6x8','6x9','7x10','8x10','8x11','8x12','9x11','9x12','10x12','10x13','10x14','10x16','12x14','12x15','12x16','13x14','13x15','13x18'];
function feet(text){
 const s=text.trim();if(/^\d+(?:\.\d+)?$/.test(s))return Number(s);
 const m=s.match(/^(\d+(?:\.\d+)?)\s*(?:ft|feet|')\s*(?:(\d+(?:\.\d+)?)\s*(?:inches|in|''|")?)?$/);
 if(!m||Number(m[2]||0)>=12)return NaN;
 return Number(m[1])+Number(m[2]||0)/12;
}
export function categoryMeasurements(value){
 const text=String(value||'').toLowerCase().replace(/[’′]/g,"'").replace(/[“”″]/g,'"').trim();
 const parts=text.replace(/\s+(?:round|square|oval|diameter)\s*$/,'').split(/\s*[x×]\s*/);
 const d=parts.map(feet);return d.length===2&&d.every(n=>Number.isFinite(n)&&n>0&&n<=100)?d.sort((a,b)=>a-b):parts.length===1&&Number.isFinite(d[0])&&d[0]>0&&d[0]<=100?[d[0],d[0]]:null;
}
function nearest(d,options){
 return options.map(label=>({label,d:label.split('x').map(Number)})).filter(o=>o.d.every((n,i)=>Math.abs(n-d[i])<=0.5+1e-9)).sort((a,b)=>a.d.reduce((s,n,i)=>s+Math.abs(n-d[i]),0)-b.d.reduce((s,n,i)=>s+Math.abs(n-d[i]),0))[0]?.label||null;
}
export function suggestRugCategory(rug){
 const d=categoryMeasurements(rug.dimensions);
 const explicit=String(rug.shape||'').toLowerCase();
 let shape=({runner:'Runner',round:'Round',square:'Square',oval:'Oval',rectangular:'Rectangular'})[explicit]||'';
 const title=String(rug.name||'');
 if(!shape&&/\bround\b/i.test(title))shape='Round';
 if(!shape&&/\bsquare\b/i.test(title))shape='Square';
 if(!shape&&/\boval\b/i.test(title))shape='Oval';
 if(!d||(!/[x×]/i.test(String(rug.dimensions||''))&&!['Round','Square'].includes(shape)))return {sizeCategory:null,shape:shape||null,reason:'Enter exact feet-and-inches measurements, or choose a category manually.'};
 if(!shape||shape==='Rectangular')shape=d[0]<=4.5&&d[1]/d[0]>=2.5?'Runner':'Rectangular';
 let category;
 if(shape==='Runner')category='Runner';
 else if(shape==='Round'||shape==='Square'){
  const n=Math.round(d[0]),values=shape==='Round'?[1,3,5,6,7,8,9,10,11]:[3,4,5,6,7,8,9,10];
  category=Math.abs(d[0]-d[1])<=0.5&&Math.abs(n-d[0])<=0.5&&values.includes(n)?n+' ft '+shape:shape==='Round'?'Rounds':'Squares';
 }else if(shape==='Oval'){const n=nearest(d,['4x6','6x7','6x10','7x10']);category=n?n+' Oval':'Ovals';}
 else category=nearest(d,rectangles)||(d[0]>=9.5||d[1]>=13.5?'Oversized':d[0]>=7?'Large':d[0]>=4.5?'Medium':'Small');
 return {sizeCategory:category,shape,reason:'Selected from exact measurements and shape. Exact measurements are kept unchanged.'};
}
/** @param {any} rug */
export function categorizeRug(rug){
 if(rug.categoryMode==='manual')return {...rug};
 const suggestion=suggestRugCategory(rug);
 if(!suggestion.sizeCategory)throw Error(suggestion.reason);
 return {...rug,categoryMode:'auto',sizeCategory:suggestion.sizeCategory,shape:suggestion.shape};
}
