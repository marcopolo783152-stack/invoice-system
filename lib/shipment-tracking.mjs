export function carrierToken(value){
 const key=String(value||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
 if(/^ups_(?:ground|next_day|2nd_day|3_day|standard|worldwide|surepost|mail_innovations)/.test(key))return 'ups';
 if(/^usps_(?:priority|ground|first_class|express)/.test(key))return 'usps';
 if(/^fedex_(?:ground|home|express|2day|overnight)/.test(key))return 'fedex';
 return ({ups:'ups',united_parcel_service:'ups',usps:'usps',united_states_postal_service:'usps',fedex:'fedex',federal_express:'fedex',dhl:'dhl_express',dhl_express:'dhl_express',dhl_ecommerce:'dhl_ecommerce',ontrac:'ontrac',lasership:'lasership',canada_post:'canada_post',canadapost:'canada_post'})[key]||null;
}
export function shipmentCarrier(carrier,number,saved=''){
 const n=String(number||'').replace(/\s+/g,'').toUpperCase();
 // A full UPS 1Z number is distinctive, including when old records say USPS.
 if(/^1Z[A-Z0-9]{16}$/.test(n))return 'ups';
 const declared=carrierToken(carrier);if(declared)return declared;
 // Use only distinctive postal formats; numeric lengths alone overlap carriers.
 if(/^(?:92|93|94|95)\d{20}$/.test(n)||/^[A-Z]{2}\d{9}US$/.test(n))return 'usps';
 try{const u=new URL(saved);if(u.protocol!=='https:')return null;const h=u.hostname;
 for(const [domain,token] of [['ups.com','ups'],['usps.com','usps'],['fedex.com','fedex'],['dhl.com','dhl_express'],['ontrac.com','ontrac'],['canadapost-postescanada.ca','canada_post']])if(h===domain||h.endsWith('.'+domain))return token;
 }catch{}
 return null;
}
export function shipmentCarrierName(carrier,number,saved=''){
 const token=shipmentCarrier(carrier,number,saved);
 return ({ups:'UPS',usps:'USPS',fedex:'FedEx',dhl_express:'DHL Express',dhl_ecommerce:'DHL eCommerce',ontrac:'OnTrac',lasership:'LaserShip',canada_post:'Canada Post'})[token]||String(carrier||'Carrier');
}
export function carrierTrackingUrl(carrier,number,saved=''){
 const token=shipmentCarrier(carrier,number,saved),n=encodeURIComponent(String(number||'').replace(/\s+/g,''));
 const urls={ups:`https://www.ups.com/track?loc=en_US&tracknum=${n}`,usps:`https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`,fedex:`https://www.fedex.com/fedextrack/?trknbr=${n}`,dhl_express:`https://www.dhl.com/us-en/home/tracking.html?tracking-id=${n}`,dhl_ecommerce:`https://www.dhl.com/us-en/home/tracking.html?tracking-id=${n}`,ontrac:`https://www.ontrac.com/tracking/?number=${n}`,lasership:`https://www.ontrac.com/tracking/?number=${n}`,canada_post:`https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${n}`};
 if(token)return urls[token];
 try{const u=new URL(saved);if(u.protocol==='https:'&&/^(?:[a-z0-9-]+\.)*(?:ups\.com|usps\.com|fedex\.com|dhl\.com|ontrac\.com|canadapost-postescanada\.ca)$/.test(u.hostname))return u.href;}catch{}
 return null;
}
export function safeTracking(data){
 const str=v=>typeof v==='string'?v.slice(0,1500):null;
 const event=e=>e?{status:str(e.status),status_details:str(e.status_details),status_date:str(e.status_date),location:e.location?{city:str(e.location.city),state:str(e.location.state),country:str(e.location.country)}:null}:null;
 const history=Array.isArray(data.tracking_history)?data.tracking_history.map(event).filter(Boolean).sort((a,b)=>(Date.parse(b.status_date)||0)-(Date.parse(a.status_date)||0)).slice(0,50):[];
 const summary=event(data.tracking_status);
 const latest=history[0]&&Date.parse(history[0].status_date)> (Date.parse(summary?.status_date)||0)?history[0]:summary;
 return {source:data.source==='ups_direct'?'ups_direct':'shippo',delivery_window:data.delivery_window?{start:str(data.delivery_window.start),end:str(data.delivery_window.end)}:null,carrier:str(data.carrier),tracking_number:str(data.tracking_number),eta:str(data.eta),tracking_status:latest,tracking_history:history,checkedAt:new Date().toISOString()};
}
