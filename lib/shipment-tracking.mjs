export function carrierToken(value){
 const key=String(value||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
 return ({ups:'ups',united_parcel_service:'ups',usps:'usps',united_states_postal_service:'usps',fedex:'fedex',federal_express:'fedex',dhl:'dhl_express',dhl_express:'dhl_express',dhl_ecommerce:'dhl_ecommerce',ontrac:'ontrac',lasership:'lasership',canada_post:'canada_post',canadapost:'canada_post'})[key]||null;
}
export function carrierTrackingUrl(carrier,number,saved=''){
 const token=carrierToken(carrier),n=encodeURIComponent(String(number||''));
 const urls={ups:`https://www.ups.com/track?loc=en_US&tracknum=${n}`,usps:`https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`,fedex:`https://www.fedex.com/fedextrack/?trknbr=${n}`,dhl_express:`https://www.dhl.com/us-en/home/tracking.html?tracking-id=${n}`,dhl_ecommerce:`https://www.dhl.com/us-en/home/tracking.html?tracking-id=${n}`,ontrac:`https://www.ontrac.com/tracking/?number=${n}`,lasership:`https://www.ontrac.com/tracking/?number=${n}`,canada_post:`https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${n}`};
 if(token)return urls[token];
 try{const u=new URL(saved);if(u.protocol==='https:'&&/^(?:[a-z0-9-]+\.)*(?:ups\.com|usps\.com|fedex\.com|dhl\.com|ontrac\.com|canadapost-postescanada\.ca)$/.test(u.hostname))return u.href;}catch{}
 return null;
}
export function safeTracking(data){
 const str=v=>typeof v==='string'?v.slice(0,1500):null;
 const event=e=>e?{status:str(e.status),status_details:str(e.status_details),status_date:str(e.status_date),location:e.location?{city:str(e.location.city),state:str(e.location.state),country:str(e.location.country)}:null}:null;
 return {carrier:str(data.carrier),tracking_number:str(data.tracking_number),eta:str(data.eta),tracking_status:event(data.tracking_status),tracking_history:Array.isArray(data.tracking_history)?data.tracking_history.slice(-50).map(event).filter(Boolean):[],checkedAt:new Date().toISOString()};
}
