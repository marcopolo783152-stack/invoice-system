"use client";
import React, { useState, useEffect } from 'react';
import {Truck,MapPin,ExternalLink,PackageCheck} from "lucide-react";
import styles from "./ShipmentTracking.module.css";
import {carrierToken,carrierTrackingUrl,shipmentCarrierName} from "@/lib/shipment-tracking.mjs";

export default function LiveTrackingButton({ carrier: savedCarrier, trackingNumber, orderId, currentOrderStatus, trackingUrl }: { carrier: string, trackingNumber: string, orderId?: string, currentOrderStatus?: string, trackingUrl?: string }) {
  const carrier=shipmentCarrierName(savedCarrier,trackingNumber,trackingUrl);
  const carrierUrl=carrierTrackingUrl(carrier,trackingNumber,trackingUrl);
  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchTracking = async () => {
      try {
        const formattedCarrier = carrierToken(carrier);
        if(!formattedCarrier)throw Error("This carrier’s live updates are available through its tracking link.");
        const res = await fetch(`/api/shipping/track?carrier=${encodeURIComponent(formattedCarrier)}&trackingNumber=${encodeURIComponent(trackingNumber)}`,{cache:"no-store",signal:AbortSignal.timeout(15000)});
        const data = await res.json();
        if (!res.ok) throw new Error(data.error||"Carrier updates are temporarily unavailable.");
        if (isMounted) {
          setTrackingData(data);
          setError(null);
          

        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    setLoading(true);setTrackingData(null);setError(null);
    fetchTracking();
    const timer=setInterval(fetchTracking,60000);
    const focus=()=>{if(document.visibilityState==='visible')void fetchTracking();};
    window.addEventListener('focus',focus);

    return () => {
      isMounted = false;clearInterval(timer);window.removeEventListener('focus',focus);
    };
  }, [carrier, trackingNumber]);

  const carrierLink=carrierUrl ? <a className={styles.carrierLink} href={carrierUrl} target="_blank" rel="noopener noreferrer">Track with {carrier}<ExternalLink size={14}/></a> : null;
  const date=(value:string,withTime=false)=>{const parsed=new Date(/^\d{4}-\d{2}-\d{2}$/.test(value||'')?value+'T12:00:00':value);return value&&Number.isFinite(parsed.getTime()) ? parsed.toLocaleString('en-US',withTime?{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}:{weekday:'long',month:'long',day:'numeric'}) : '';};
  const place=(event:any)=>[event?.location?.city,event?.location?.state,event?.location?.country].filter(Boolean).join(', ');
  if(loading)return <section className={styles.card} aria-busy="true"><div className={styles.empty}><span className={styles.spinner}/><span className={styles.eyebrow}>Shipment tracking</span><h3>Connecting to {carrier}</h3><p>Getting the latest update for your rug.</p></div></section>;
  if(error||!trackingData?.tracking_status)return <section className={styles.card}><div className={styles.empty}><Truck size={26}/><span className={styles.eyebrow}>{carrier} shipment</span><h3>Following your delivery</h3><p role="status">{error||'The carrier has not posted a tracking update yet. Check again soon.'}</p>{carrierLink}</div></section>;
  const current=trackingData.tracking_status,delivered=current.status==='DELIVERED';
  const status=({PRE_TRANSIT:'Label created',TRANSIT:'On the way',DELIVERED:'Delivered',RETURNED:'Returning to sender',FAILURE:'Delivery needs attention',UNKNOWN:'Awaiting carrier update'} as Record<string,string>)[current.status]||'Carrier update';
  const arrival=date(delivered?current.status_date:trackingData.eta);
  const history=[...(trackingData.tracking_history||[])].sort((a,b)=>Date.parse(b.status_date)-Date.parse(a.status_date)).filter(e=>!(e.status_date===current.status_date&&e.status===current.status)).slice(0,10);
  return <section className={styles.card} aria-label={carrier+' shipment tracking'}>
    <header className={styles.header}><div className={styles.heading}><span className={styles.icon}>{delivered?<PackageCheck size={22}/>:<Truck size={22}/>}</span><div><span className={styles.eyebrow}>From our showroom to your home</span><h3>Your rug’s journey</h3></div></div><span className={styles.carrier}>{carrier}</span></header>
    <div className={styles.overview}><div><span className={styles.eyebrow}>{delivered?'Delivered on':'Estimated arrival'}</span><p className={styles.arrival}>{arrival||(delivered?'Delivery confirmed':'Awaiting a delivery date')}</p>{!delivered&&trackingData.delivery_window?.start&&trackingData.delivery_window?.end&&<p className={styles.muted}>{trackingData.delivery_window.start.slice(0,5)} – {trackingData.delivery_window.end.slice(0,5)} (delivery local time)</p>}{!delivered&&<p className={styles.muted}>{arrival?'Estimate provided by '+carrier+'.':'Your carrier will confirm the date as your shipment moves.'}</p>}</div><div className={styles.status}><span className={styles.dot}/>{status}</div></div>
    <div className={styles.timeline}><article className={styles.event}><span className={styles.marker}/><div><span className={styles.eyebrow}>Latest carrier update</span><h4>{current.status_details||status}</h4>{place(current)&&<p className={styles.location}><MapPin size={13}/>{place(current)}</p>}{date(current.status_date,true)&&<time className={styles.muted} dateTime={current.status_date}>{date(current.status_date,true)}</time>}</div></article>
    {history.length>0&&<details className={styles.history}><summary>Shipment history <span>{history.length} earlier {history.length===1?'update':'updates'}</span></summary><div>{history.map((event:any,index:number)=><article className={styles.event} key={event.status_date+'-'+index}><span className={styles.historyMarker}/><div><h4>{event.status_details||event.status?.replaceAll('_',' ')||'Carrier update'}</h4>{place(event)&&<p className={styles.location}><MapPin size={13}/>{place(event)}</p>}{date(event.status_date,true)&&<time className={styles.muted} dateTime={event.status_date}>{date(event.status_date,true)}</time>}</div></article>)}</div></details>}</div>
    <footer className={styles.footer}><div className={styles.muted}>{trackingData.source==='ups_direct'?'Updates directly from '+carrier:carrier+' updates via shipping provider'}{date(trackingData.checkedAt,true)&&<> · Checked {date(trackingData.checkedAt,true)}</>}<span className={styles.refresh}>Checks every minute · Scan times above show when the carrier recorded each event</span>{trackingData.source!=='ups_direct'&&<span className={styles.refresh}>Recent scans may appear on {carrier} tracking before reaching this feed.</span>}</div>{carrierLink}</footer>
  </section>;
}
