export function address(input){
 const a={};for(const key of ['name','company','phone','email','street1','street2','city','state','zip','country']){if(input?.[key]!==undefined&&typeof input[key]!=='string')throw Error('Enter valid address details.');a[key]=(input?.[key]||'').trim();if(a[key].length>200)throw Error('Address field is too long.');}
 a.country=(a.country||'US').toUpperCase();a.state=a.state.toUpperCase();
 if(!a.name||!a.street1||!a.city||!a.state||!a.zip||!a.phone)throw Error('Name, phone and complete shipping address are required.');
 if(a.country!=='US')throw Error('This label tool currently supports US domestic shipments.');
 if(!/^[A-Z]{2}$/.test(a.state)||!/^\d{5}(-\d{4})?$/.test(a.zip)||a.phone.replace(/\D/g,'').length<10)throw Error('Check the state, ZIP code and phone number.');
 if(a.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email))throw Error('Enter a valid email address.');
 return a;
}
export function packageDetails(input){const p={};for(const key of ['weight','length','width','height']){const n=Number(input?.[key]);if(!Number.isFinite(n)||n<=0||n>1000)throw Error('Enter package weight and dimensions greater than zero and no more than 1,000.');p[key]=String(n);}return {...p,distance_unit:'in',mass_unit:'lb'};}
export function availableRates(rates=[]){return rates.filter(r=>r.object_id&&r.currency==='USD'&&Number.isFinite(Number(r.amount))&&Number(r.amount)>=0).map(r=>({id:r.object_id,carrier:r.provider||'Carrier',service:r.servicelevel?.name||'Shipping',amount:String(r.amount),currency:'USD',days:r.estimated_days??null})).sort((a,b)=>Number(a.amount)-Number(b.amount));}
export function selectRate(quote,id,now=Date.now()){if(!quote||quote.expiresAt<=now)throw Error('Rates expired. Get new rates.');const rate=quote.rates.find(r=>r.id===id);if(!rate)throw Error('Choose one of the quoted rates.');return rate;}
export function safeProviderUrl(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:'';}catch{return '';}}
