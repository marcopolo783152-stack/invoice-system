"use client";
import React, { useState, useEffect } from 'react';

export default function LiveTrackingButton({ carrier, trackingNumber }: { carrier: string, trackingNumber: string }) {
  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchTracking = async () => {
      try {
        const formattedCarrier = carrier.toLowerCase();
        const res = await fetch(`/api/shipping/track?carrier=${formattedCarrier}&trackingNumber=${trackingNumber}`);
        if (!res.ok) throw new Error("Failed to fetch tracking details");
        const data = await res.json();
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

    fetchTracking();

    return () => {
      isMounted = false;
    };
  }, [carrier, trackingNumber]);

  return (
    <div className="mt-2 border-t border-neutral-100 pt-2">
      <div className="bg-neutral-50 p-3 text-xs rounded border border-neutral-200 shadow-inner">
        {loading && <div className="text-neutral-500 animate-pulse font-mono tracking-widest text-[10px] uppercase">Retrieving satellite tracking...</div>}
        
        {error && <div className="text-red-500">Error retrieving data: {error}</div>}
        
        {trackingData && trackingData.tracking_status && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className={`font-black uppercase tracking-widest px-2 py-0.5 rounded-sm text-[10px] shadow-sm border ${
                trackingData.tracking_status.status === 'DELIVERED' ? 'bg-green-100 text-green-700 border-green-200' :
                trackingData.tracking_status.status === 'TRANSIT' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                'bg-yellow-100 text-yellow-700 border-yellow-200'
              }`}>
                {trackingData.tracking_status.status}
              </span>
              <span className="text-neutral-400 font-mono text-[10px] tracking-wider">{new Date(trackingData.tracking_status.status_date).toLocaleString()}</span>
            </div>
            
            <p className="font-bold text-neutral-800 leading-tight pt-1">{trackingData.tracking_status.status_details}</p>
            
            {trackingData.tracking_status.location && trackingData.tracking_status.location.city && (
              <div className="flex items-center gap-1 text-neutral-500 pt-1 border-t border-neutral-200/50 mt-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                <span className="font-mono text-[10px] uppercase tracking-wider">{trackingData.tracking_status.location.city}, {trackingData.tracking_status.location.state}</span>
              </div>
            )}
          </div>
        )}

        {trackingData && !trackingData.tracking_status && (
          <div className="text-neutral-500 italic">No tracking updates available yet. The carrier may still be processing the package.</div>
        )}
      </div>
    </div>
  );
}
