import {randomUUID} from 'node:crypto';
import {safeTracking} from '../shipment-tracking.mjs';
const day=v=>/^\d{8}$/.test(v||'')?`${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}`:null;
const clock=v=>/^\d{6}$/.test(v||'')?`${v.slice(0,2)}:${v.slice(2,4)}:${v.slice(4,6)}`:null;
function stamp(a){
 const gd=day(a.gmtDate),gt=clock(String(a.gmtTime||'').padStart(6,'0'));
 if(gd&&gt)return `${gd}T${gt}Z`;
 const d=day(a.date),t=clock(a.time),offset=a.gmtOffset;
 return d&&t&&/^[+-]\d{2}:\d{2}$/.test(offset||'')?`${d}T${t}${offset}`:null;
}
const status=s=>({D:'DELIVERED',I:'TRANSIT',P:'TRANSIT',M:'PRE_TRANSIT',X:'FAILURE',RS:'RETURNED'})[s?.type]||'UNKNOWN';
export function normalizeUpsTracking(raw,number){
 const packages=(raw?.trackResponse?.shipment||[]).flatMap(s=>s.package||[]);
 const p=packages.find(p=>String(p.trackingNumber).toUpperCase()===number.toUpperCase());
 if(!p)throw Error('UPS returned a different shipment');
 if(p.suppressionIndicators?.includes('DETAIL'))throw Error('UPS tracking details are unavailable');
 const events=(p.activity||[]).map(a=>({status:status(a.status),status_details:a.status?.description,status_date:stamp(a),location:{city:a.location?.address?.city,state:a.location?.address?.stateProvince,country:a.location?.address?.countryCode||a.location?.address?.country}}));
 const latest=events[0]||{status:status(p.currentStatus),status_details:p.currentStatus?.description};
 const delivery=(p.deliveryDate||[]).find(d=>d.type==='RDD')||(p.deliveryDate||[]).find(d=>d.type==='SDD');
 const time=p.deliveryTime;
 const result=safeTracking({carrier:'ups',tracking_number:number,tracking_status:latest,tracking_history:events,eta:day(delivery?.date),source:'ups_direct',delivery_window:time&&['EDW','CDW','IDW'].includes(time.type)?{start:clock(time.startTime),end:clock(time.endTime)}:null});
 return result;
}
let token=null;
export async function getUpsTracking(number,{clientId,clientSecret,fetcher=fetch}){
 const credential=clientId+':'+clientSecret;
 if(!token||token.credential!==credential||token.expiresAt<Date.now()+30000){
 const r=await fetcher('https://onlinetools.ups.com/security/v1/oauth/token',{method:'POST',headers:{Authorization:'Basic '+Buffer.from(credential).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials',cache:'no-store',signal:AbortSignal.timeout(3000)});
 if(!r.ok)throw Error('UPS authorization unavailable');const data=await r.json();
 if(!data.access_token)throw Error('UPS authorization unavailable');
 token={credential,value:data.access_token,expiresAt:Date.now()+Math.min(Number(data.expires_in)||300,3600)*1000};
 }
 const r=await fetcher(`https://onlinetools.ups.com/api/track/v1/details/${encodeURIComponent(number)}?locale=en_US&returnSignature=false&returnPOD=false`,{headers:{Authorization:'Bearer '+token.value,transId:randomUUID(),transactionSrc:'MarcoPoloRugs'},cache:'no-store',signal:AbortSignal.timeout(6000)});
 if(r.status===401)token=null;
 if(!r.ok)throw Error('UPS tracking unavailable');
 return normalizeUpsTracking(await r.json(),number);
}
