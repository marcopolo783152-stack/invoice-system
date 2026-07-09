"use client";
import React, { useState } from 'react';

export default function LiveTrackingButton({ carrier, trackingNumber }: { carrier: string, trackingNumber: string }) {
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const fetchTracking = async () => {
    if (open && trackingData) {
      setOpen(false);
      return;
    }
    
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      // Shippo carrier names are typically lowercase for the API: "usps", "ups"
      const formattedCarrier = carrier.toLowerCase();
      const res = await fetch(`/api/shipping/track?carrier=${formattedCarrier}&trackingNumber=${trackingNumber}`);
      if (!res.ok) throw new Error("Failed to fetch tracking details");
      const data = await res.json();
      setTrackingData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 border-t border-neutral-100 pt-2">
      <button 
        onClick={fetchTracking}
        className="text-[10px] uppercase tracking-wider font-bold text-blue-600 hover:text-blue-800 transition flex items-center gap-1 bg-blue-50 px-2 py-1 rounded"
      >
        {loading ? (
          <span>Loading Live Status...</span>
        ) : open ? (
          <span>Hide Live Status ▴</span>
        ) : (
          <span>View Live Status ▾</span>
        )}
      </button>

      {open && (
        <div className="mt-2 bg-neutral-50 p-2 text-xs rounded border border-neutral-200 shadow-inner">
          {loading && <div className="text-neutral-500 animate-pulse">Contacting {carrier} satellite...</div>}
          
          {error && <div className="text-red-500">Error: {error}</div>}
          
          {trackingData && trackingData.tracking_status && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`font-black uppercase tracking-widest px-1.5 py-0.5 rounded text-[10px] ${
                  trackingData.tracking_status.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                  trackingData.tracking_status.status === 'TRANSIT' ? 'bg-blue-100 text-blue-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {trackingData.tracking_status.status}
                </span>
                <span className="text-neutral-500">{new Date(trackingData.tracking_status.status_date).toLocaleString()}</span>
              </div>
              <p className="font-medium text-neutral-800 mt-1">{trackingData.tracking_status.status_details}</p>
              
              {trackingData.tracking_status.location && trackingData.tracking_status.location.city && (
                <p className="text-neutral-500">Location: {trackingData.tracking_status.location.city}, {trackingData.tracking_status.location.state}</p>
              )}
            </div>
          )}

          {trackingData && !trackingData.tracking_status && (
            <div className="text-neutral-500 italic">No tracking updates available yet. The carrier may still be processing the package.</div>
          )}
        </div>
      )}
    </div>
  );
}
