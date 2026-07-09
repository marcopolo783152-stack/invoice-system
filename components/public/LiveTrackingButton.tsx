"use client";
import React, { useState, useEffect } from 'react';
import { useStore } from "@/context/StoreContext";

export default function LiveTrackingButton({ carrier, trackingNumber, orderId, currentOrderStatus }: { carrier: string, trackingNumber: string, orderId?: string, currentOrderStatus?: string }) {
  const { updateOrderStatus } = useStore();
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
          
          // Automatically mark order as delivered in the system if Shippo says it's delivered
          if (data?.tracking_status?.status === "DELIVERED" && orderId && currentOrderStatus === "Shipped") {
            updateOrderStatus(orderId, "Delivered");
          }
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

  if (loading) {
    return (
      <div className="mt-4 p-6 bg-[#F4F8FA] border border-[#E2E8F0] flex items-center justify-center h-48 animate-pulse">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 border-2 border-t-blue-800 border-blue-200 rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-blue-900 uppercase tracking-widest">Connecting to {carrier}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-4 bg-red-50 text-red-700 border border-red-200 text-xs">
        Failed to load live tracking: {error}
      </div>
    );
  }

  if (!trackingData || !trackingData.tracking_status) {
    return (
      <div className="mt-4 p-4 bg-gray-50 border border-gray-200 text-xs text-gray-500 italic">
        Tracking information is currently unavailable. The carrier may still be processing the package.
      </div>
    );
  }

  // Parse ETA if available
  let etaDate = null;
  if (trackingData.eta) {
    etaDate = new Date(trackingData.eta);
  }

  const history = trackingData.tracking_history || [];
  // Reverse history so newest is at the top
  const sortedHistory = [...history].reverse().slice(0, 5); 

  const currentStatus = trackingData.tracking_status.status;
  const isDelivered = currentStatus === "DELIVERED";

  return (
    <div className="mt-6 mb-2">
      <div className="flex flex-col md:flex-row shadow-sm border border-[#E1E6EB] bg-white text-[#333333] font-sans">
        
        {/* Left Side - ETA Panel */}
        <div className="w-full md:w-5/12 bg-[#E9F3F6] p-6 border-b md:border-b-0 md:border-r border-[#E1E6EB] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-[#185394]"></div>
          
          <h3 className="text-[15px] font-bold text-[#185394] mb-4">
            {isDelivered ? "Delivered On" : "Expected Delivery by"}
          </h3>
          
          {etaDate || isDelivered ? (
            <div className="flex items-end gap-3 mb-6">
              <div className="flex flex-col">
                <span className="text-lg font-bold text-[#185394] uppercase tracking-wide">
                  {(etaDate || new Date(trackingData.tracking_status.status_date)).toLocaleDateString('en-US', { weekday: 'long' })}
                </span>
                <span className="text-5xl font-black text-[#333333] leading-none mt-1">
                  {(etaDate || new Date(trackingData.tracking_status.status_date)).getDate()}
                </span>
              </div>
              <div className="flex flex-col pb-1">
                <span className="text-sm font-bold text-[#333333]">
                  {(etaDate || new Date(trackingData.tracking_status.status_date)).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                {!isDelivered && etaDate && (
                  <span className="text-sm text-[#333333] font-medium">
                    by {etaDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-[#555555] mb-6 italic">
              Delivery date will be updated when the package starts moving.
            </div>
          )}

          <div className="text-[11px] text-[#333333] border-t border-[#D0DFE5] pt-4 leading-relaxed">
            {trackingData.tracking_status.status_details}
            {trackingData.tracking_status.location?.city && ` in ${trackingData.tracking_status.location.city}, ${trackingData.tracking_status.location.state}.`}
          </div>
          
          <div className="mt-4 pt-4 border-t border-[#D0DFE5]">
            <a href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-[#185394] hover:underline flex items-center gap-1">
              View Official {carrier.toUpperCase()} Tracking ↗
            </a>
          </div>
        </div>

        {/* Right Side - Timeline Panel */}
        <div className="w-full md:w-7/12 p-6 bg-white">
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[7px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
            
            {/* Current Status Highlight */}
            <div className="relative flex items-start gap-4">
              <div className={`mt-1.5 w-3.5 h-3.5 rounded-full border-[3px] border-white ring-2 z-10 flex-shrink-0 ${isDelivered ? 'bg-green-600 ring-green-600' : 'bg-[#185394] ring-[#185394]'}`}></div>
              <div>
                <h4 className={`text-base font-bold ${isDelivered ? 'text-green-700' : 'text-[#185394]'}`}>
                  {trackingData.tracking_status.status === 'TRANSIT' ? 'On the Way' : trackingData.tracking_status.status}
                </h4>
                <div className="mt-2 text-xs text-[#333333] font-bold">
                  {trackingData.tracking_status.status_details}
                </div>
                {trackingData.tracking_status.location?.city && (
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {trackingData.tracking_status.location.city}, {trackingData.tracking_status.location.state} {trackingData.tracking_status.location.zip}
                  </div>
                )}
                <div className="text-[11px] text-gray-500 mt-0.5">
                  {new Date(trackingData.tracking_status.status_date).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* History Events */}
            {sortedHistory.map((event: any, i: number) => {
              // Don't show the very first event if it's the exact same as current status
              if (i === 0 && event.status_date === trackingData.tracking_status.status_date) return null;
              
              return (
                <div key={i} className="relative flex items-start gap-4">
                  <div className="mt-1.5 w-3.5 h-3.5 rounded-full bg-[#333333] border-2 border-white z-10 flex-shrink-0 opacity-80"></div>
                  <div>
                    <div className="text-xs font-bold text-[#333333]">
                      {event.status_details}
                    </div>
                    {event.location?.city && (
                      <div className="text-[11px] text-gray-500 mt-0.5 uppercase tracking-wide">
                        {event.location.city}, {event.location.state} {event.location.zip}
                      </div>
                    )}
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      {new Date(event.status_date).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
            
          </div>
        </div>
      </div>
    </div>
  );
}
