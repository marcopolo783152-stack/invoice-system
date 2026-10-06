import {auth} from "@/lib/auth";
import {carrierTrackingUrl} from "@/lib/shipment-tracking.mjs";
import {useRef} from "react";
import {orderReference} from '@/lib/order-reference.mjs';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useStore } from "@/context/StoreContext";
import { Search, Compass, Truck, ShieldCheck, ClipboardCheck, PackageCheck, AlertCircle, ShoppingBag, MapPin, Send } from "lucide-react";
import { generateAndDownloadReceiptPDF } from "@/utils/pdf";
import LiveTrackingButton from "./LiveTrackingButton";

export const TrackingView: React.FC = () => {
  const { orders, cleaningBookings, sendChatMessage, shopProfile, logoUrl, updateOrderStatus } = useStore();
  const [checkoutEmail,setCheckoutEmail]=useState("");
  const [lookupBusy,setLookupBusy]=useState(false),[lookupError,setLookupError]=useState("");
  const lookupSequence=useRef(0);
  const [searchId, setSearchId] = useState("");
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [activeCleaning, setActiveCleaning] = useState<any>(null);
  const [searched, setSearched] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [recoveredOrders, setRecoveredOrders] = useState<any[]>([]);

  useEffect(() => {
    const reference=new URLSearchParams(window.location.search).get('track');
    if(reference)setSearchId(reference);
  }, []);

  const loadTracking=async(reference:string)=>{
    const sequence=++lookupSequence.current;
    setLookupBusy(true);setLookupError('');setActiveOrder(null);setActiveCleaning(null);setRecoveredOrders([]);setSearched(false);
    try{
      const headers:Record<string,string>={'Content-Type':'application/json'};
      const user=auth.currentUser;if(user&&!user.isAnonymous&&user.emailVerified)headers.Authorization='Bearer '+await user.getIdToken();
      const r=await fetch('/api/order-tracking',{method:'POST',headers,body:JSON.stringify({reference,email:checkoutEmail}),cache:'no-store',signal:AbortSignal.timeout(15000)});
      const data=await r.json();if(!r.ok)throw Error(data.error||'Unable to load your order.');
      if(sequence===lookupSequence.current){setActiveOrder(data.order);setSearched(true);}
    }catch(e){if(sequence===lookupSequence.current){setLookupError((e as Error).message);setSearched(true);}}
    finally{if(sequence===lookupSequence.current)setLookupBusy(false);}
  };

  useEffect(()=>{
    if(!activeOrder?.id)return;
    let stopped=false;
    const refresh=async()=>{if(document.visibilityState!=='visible')return;try{
      const headers:Record<string,string>={'Content-Type':'application/json'},user=auth.currentUser;
      if(user&&!user.isAnonymous&&user.emailVerified)headers.Authorization='Bearer '+await user.getIdToken();
      const r=await fetch('/api/order-tracking',{method:'POST',headers,body:JSON.stringify({reference:activeOrder.orderNumber||activeOrder.id,email:checkoutEmail}),cache:'no-store',signal:AbortSignal.timeout(15000)});
      if(r.ok){const d=await r.json();if(!stopped)setActiveOrder(d.order);}
    }catch{}};
    const timer=setInterval(refresh,60000);return()=>{stopped=true;clearInterval(timer);};
  },[activeOrder?.id,checkoutEmail]);

  const handleRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
    const emailClean = recoveryEmail.trim().toLowerCase();
    const phoneClean = recoveryPhone.trim();
    
    if (!emailClean && !phoneClean) return;
    
    const found = orders.filter((o) => {
      const eMatch = emailClean && o.customerInfo?.email?.toLowerCase().includes(emailClean);
      const pMatch = phoneClean && o.customerInfo?.phone?.includes(phoneClean);
      return eMatch || pMatch;
    });
    
    setRecoveredOrders(found);
    setActiveOrder(null);
    setActiveCleaning(null);
  };
  
  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const idClean=searchId.trim().toUpperCase();
    const cleaning=cleaningBookings.find(b=>b.id===idClean);
    if(cleaning){setActiveCleaning(cleaning);setActiveOrder(null);setLookupError('');setSearched(true);return;}
    void loadTracking(searchId);
  };

  const orderStatuses = [
    { label: "Pending Confirmation", desc: "We have received your order" },
    { label: "Confirmed", desc: "Your order is confirmed" },
    { label: "Preparing for Shipping", desc: "We are preparing your shipment" },
    { label: "Shipped", desc: "Your shipment has been handed to the carrier" },
    { label: "Delivered", desc: "The carrier has confirmed delivery" }
  ];

  const getStatusIndex = (status: string) => {
    if (status === "Cancelled") return -1;
    return orderStatuses.findIndex(s => s.label === status);
  };

  
  const handleCancelOrder = (orderId: string) => {
    if (confirm("Are you sure you want to cancel this order? This cannot be undone.")) {
      updateOrderStatus(orderId, "Cancelled");
      setActiveOrder((prev: any) => prev && prev.id === orderId ? { ...prev, status: "Cancelled" } : prev);
      setRecoveredOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "Cancelled" } : o));
      alert("Your order has been cancelled.");
    }
  };

  const handleContactSupport = () => {
    if (!activeOrder) return;
    const inquiryText = `Hi! I am asking about my order tracking ID ${orderReference(activeOrder)}. Is there any update on shipping?`;
    window.dispatchEvent(new CustomEvent("open-marcopolo-chat", {
      detail: { initialMessage: inquiryText }
    }));
  };

  return (
    <div className="customer-surface bg-[#F9F7F5] min-h-screen py-12 font-sans text-xs">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-left">
        
        {/* Title */}
        <div className="text-center space-y-2">
          <span className="text-xs uppercase tracking-[0.3em] text-editorial-accent font-bold block">Your order, at a glance</span>
          <h1 className="font-serif text-3xl font-light text-editorial-text tracking-tight">Track your order</h1>
          <p className="text-xs text-gray-500 max-w-md mx-auto font-light">
            Enter your order number and the email used at checkout. No account needed. Follow shipment updates from the carrier handling your delivery.
          </p>
        </div>

        <label className="block bg-white p-5 rounded-xl border border-editorial-border text-sm font-semibold">Checkout email
          <input type="email" autoComplete="email" value={checkoutEmail} onChange={e=>setCheckoutEmail(e.target.value)} placeholder="The email on your receipt" className="mt-2 w-full border border-editorial-border rounded-lg p-3 font-normal"/>
          <span className="block mt-2 text-xs text-gray-500 font-normal">Use the same email you entered when buying. Signed-in customers can also track their own orders.</span>
        </label>
        {/* Input box */}
        <form onSubmit={handleTrack} className="bg-white p-6 rounded-none border border-editorial-border shadow-sm flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-400">
              <Search className="h-4.5 w-4.5" />
            </div>
            <input
              type="text"
              required
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Order number from your receipt"
              className="w-full bg-editorial-aside border border-editorial-border rounded-none py-3.5 pl-11 pr-4 outline-none text-xs focus:border-editorial-accent text-editorial-text tracking-widest uppercase font-mono"
            />
          </div>
          <button
            disabled={lookupBusy}
            type="submit"
            className="px-6 py-3.5 bg-editorial-accent hover:bg-[#8E7453] text-white font-bold uppercase tracking-widest rounded-none transition cursor-pointer text-xs"
          >
            {lookupBusy?"Loading your order…":"Track order"}
          </button>
        </form>

        {orders.length>0 && <div className="text-center mt-2">
          <button 
            type="button"
            onClick={() => setShowRecovery(!showRecovery)}
            className="text-editorial-accent font-bold tracking-wider uppercase text-[10px] hover:underline cursor-pointer"
          >
            Find a purchase in your signed-in account
          </button>
        </div>}

        {showRecovery && (
          <form onSubmit={handleRecovery} className="bg-white p-6 rounded-none border border-editorial-border shadow-sm flex flex-col sm:flex-row gap-3 animate-fadeIn mt-2">
            <div className="relative flex-1">
              <input
                type="email"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                placeholder="Enter Email Address"
                className="w-full bg-editorial-aside border border-editorial-border rounded-none py-3.5 px-4 outline-none text-xs focus:border-editorial-accent text-editorial-text tracking-widest"
              />
            </div>
            <div className="relative flex-1">
              <input
                type="text"
                value={recoveryPhone}
                onChange={(e) => setRecoveryPhone(e.target.value)}
                placeholder="Or Phone Number"
                className="w-full bg-editorial-aside border border-editorial-border rounded-none py-3.5 px-4 outline-none text-xs focus:border-editorial-accent text-editorial-text tracking-widest"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3.5 bg-neutral-800 hover:bg-black text-white font-bold uppercase tracking-widest rounded-none transition cursor-pointer text-xs"
            >
              Find Orders
            </button>
          </form>
        )}

        {/* --- TRACKING RESULT BOARD --- */}
        {searched && (
          <div className="animate-fadeIn">
            {!activeOrder && !activeCleaning && recoveredOrders.length > 0 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-white p-6 border border-editorial-border shadow-sm">
                  <h3 className="font-serif text-lg text-editorial-text border-b border-editorial-border pb-3 mb-4">Found {recoveredOrders.length} Order(s)</h3>
                  <div className="space-y-4">
                    {recoveredOrders.map((ro) => (
                      <div key={ro.id} className="p-4 border border-editorial-border bg-editorial-aside flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <p className="font-mono text-xs font-bold text-editorial-text">Order: {orderReference(ro)}</p>
                          <p className="text-xs text-gray-500 mt-1">Status: {ro.status}</p>
                          <p className="text-xs text-gray-500">Date: {new Date(ro.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                          <button 
                            onClick={() => {
                              setSearchId(orderReference(ro));
                              setActiveOrder(ro);
                              setRecoveredOrders([]);
                            }}
                            className="px-4 py-2 bg-neutral-900 hover:bg-black text-white text-[10px] font-bold uppercase tracking-widest transition cursor-pointer"
                          >
                            View Details
                          </button>
                          <button 
                            onClick={() => generateAndDownloadReceiptPDF(ro, shopProfile, logoUrl)}
                            className="px-4 py-2 bg-editorial-accent hover:bg-[#8E7453] text-white text-[10px] font-bold uppercase tracking-widest transition cursor-pointer"
                          >
                            Download PDF
                          </button>
                          {ro.status === "Pending Confirmation" && (
                            <button 
                              onClick={() => handleCancelOrder(ro.id)}
                              className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white text-[10px] font-bold uppercase tracking-widest transition cursor-pointer"
                            >
                              Cancel Order
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!activeOrder && !activeCleaning && recoveredOrders.length === 0 ? (
              <div className="bg-white p-10 rounded-none border border-editorial-border shadow-sm text-center space-y-3">
                <AlertCircle className="h-10 w-10 text-editorial-accent/60 mx-auto" />
                <h3 className="font-serif text-base font-light text-editorial-text">{lookupError?"Check your order details":"Order not found"}</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed font-light">
                  {lookupError||`Check the order number and checkout email on your receipt. For help call (703) 461-0207.`}
                </p>
                <button
                  onClick={() => {
                    const lastOrder = orders[0];
                    if (lastOrder) {
                      setSearchId(lastOrder.id);
                      setActiveOrder(lastOrder);
                      setActiveCleaning(null);
                    }
                  }}
                  className="px-4 py-2.5 bg-editorial-accent hover:bg-[#8E7453] text-white text-xs font-bold uppercase tracking-wider rounded-none transition"
                >
                  Prefill Latest Order
                </button>
              </div>
            ) : activeOrder ? (
              <div className="space-y-6">
                
                {/* Active Info Banner */}
                <div className="bg-white p-6 rounded-none border border-editorial-border shadow-sm space-y-4">
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-editorial-border pb-4 gap-2">
                    <div>
                      <span className="text-sm uppercase tracking-wider text-gray-400 font-semibold block">Your order</span>
                      <h3 className="font-serif text-base font-light text-editorial-text">{orderReference(activeOrder)}</h3>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-sm uppercase tracking-wider text-gray-400 font-semibold block">Current Status</span>
                      <span className={`inline-block px-2.5 py-0.5 rounded-none text-sm font-bold uppercase tracking-wider border ${
                        activeOrder.status === "Cancelled" ? "bg-red-50 text-red-700 border-red-200" :
                        activeOrder.status === "Delivered" ? "bg-green-50 text-green-700 border-green-200" :
                        "bg-editorial-aside text-editorial-accent border-editorial-border animate-pulse"
                      }`}>
                        {activeOrder.status}
                      </span>
                    </div>
                  </div>

                  {/* Visual Timeline Stepper */}
                  {activeOrder.status === "Cancelled" ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-none text-red-800 space-y-1">
                      <p className="font-bold text-sm">Order Cancelled</p>
                      {activeOrder.cancellationReason ? (
                        <p className="text-xs text-red-700 italic">Reason: {activeOrder.cancellationReason}</p>
                      ) : (
                        <p className="text-xs">This transaction has been cancelled. For details or custom refund processing, contact our master advisors.</p>
                      )}
                    </div>
                  ) : (
                    <div className="py-4 space-y-6">
                      <h4 className="text-xs uppercase tracking-widest text-editorial-accent font-bold">Order progress</h4>
                      
                      <div className="relative pl-6 space-y-6 border-l border-editorial-border">
                        {orderStatuses.map((step, idx) => {
                          const currentIdx = getStatusIndex(activeOrder.status);
                          const isCompleted = idx < currentIdx;
                          const isActive = idx === currentIdx;

                          return (
                            <div key={idx} className="relative">
                              {/* Glowing node dot */}
                              <span className={`absolute -left-9 top-1.5 flex h-5 w-5 items-center justify-center rounded-none border transition ${
                                isCompleted ? "bg-editorial-accent border-editorial-accent text-white font-bold text-sm" :
                                isActive ? "bg-white border-editorial-accent text-editorial-accent ring-4 ring-[#C2B29F]/15 text-sm font-bold" :
                                "bg-white border-editorial-border text-gray-400 text-sm"
                              }`}>
                                {isCompleted ? "✓" : idx + 1}
                              </span>

                              <div className="space-y-0.5">
                                <h5 className={`font-serif text-xs ${
                                  isActive ? "text-editorial-accent font-medium text-sm" :
                                  isCompleted ? "text-editorial-text font-light" : "text-gray-400 font-light"
                                }`}>
                                  {step.label}
                                </h5>
                                <p className={`text-xs ${isActive ? "text-gray-500 font-light" : "text-gray-400 font-light"}`}>
                                  {step.desc}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  )}

                  {/* Freight shipping tracking details if available */}
                  {(activeOrder.shippingDetails?.trackingNumber || activeOrder.shippingDetails?.carrier) && (
                    <div className="p-5 bg-[#f7f4ed] rounded-2xl text-[#203e37] border border-[#e5ddcf] space-y-3">
                      <div className="flex items-center gap-2 text-editorial-accent font-bold uppercase tracking-wider text-xs">
                        <Truck className="h-4.5 w-4.5" />
                        <span>Shipment tracking</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-xs border-t border-[#e5ddcf] pt-4">
                        <div>
                          <span className="text-[#817666] block uppercase tracking-wider text-[10px] font-semibold">Carrier:</span>
                          <span className="font-semibold text-[#203e37]">{activeOrder.shippingDetails.carrier}</span>
                        </div>
                        <div>
                          <span className="text-[#817666] block uppercase tracking-wider text-[10px] font-semibold">Tracking Number:</span>
                          {carrierTrackingUrl(activeOrder.shippingDetails.carrier,activeOrder.shippingDetails.trackingNumber,activeOrder.shippingDetails.trackingUrl) ? (
                            <a 
                              href={carrierTrackingUrl(activeOrder.shippingDetails.carrier,activeOrder.shippingDetails.trackingNumber,activeOrder.shippingDetails.trackingUrl)||undefined} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="font-mono font-semibold text-[#203e37] hover:text-[#927951] transition underline break-all"
                            >
                              {activeOrder.shippingDetails.trackingNumber}
                            </a>
                          ) : (
                            <span className="font-mono font-semibold text-[#203e37] break-all">{activeOrder.shippingDetails.trackingNumber}</span>
                          )}
                        </div>
                        <div className="col-span-2">
                          <span className="text-[#817666] block uppercase tracking-wider text-[10px] font-semibold">Estimated Delivery:</span>
                          <span className="font-semibold text-[#203e37]">{activeOrder.shippingDetails.estimatedDelivery || "See carrier updates below"}</span>
                        </div>
                        
                        {/* Live Tracking Feature */}
                        {activeOrder.shippingDetails.carrier && activeOrder.shippingDetails.trackingNumber && (
                          <div className="col-span-2 pt-2 border-t border-gray-700/50 mt-1">
                            <LiveTrackingButton 
                              carrier={activeOrder.shippingDetails.carrier} 
                              trackingNumber={activeOrder.shippingDetails.trackingNumber} 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions row */}
                  <div className="pt-4 border-t border-editorial-border flex flex-wrap gap-2 justify-between items-center">
                    <span className="text-xs text-gray-400 font-mono">Registered on: {new Date(activeOrder.createdAt).toLocaleString()}</span>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={handleContactSupport}
                        className="px-4 py-2 bg-neutral-900 hover:bg-black text-white font-bold uppercase tracking-wider rounded-none text-[10px] transition cursor-pointer"
                      >
                        Contact Curator
                      </button>
                      <button
                        onClick={() => generateAndDownloadReceiptPDF(activeOrder, shopProfile, logoUrl)}
                        className="px-4 py-2 bg-editorial-accent hover:bg-[#8E7453] text-white font-bold uppercase tracking-wider rounded-none text-[10px] transition cursor-pointer"
                      >
                        Download PDF
                      </button>
                      {!activeOrder.trackingReadOnly && activeOrder.status === "Pending Confirmation" && (
                        <button
                          onClick={() => handleCancelOrder(activeOrder.id)}
                          className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white font-bold uppercase tracking-wider rounded-none text-[10px] transition cursor-pointer"
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                  </div>

                </div>

                {/* Invoice contents */}
                <div className="bg-white p-6 rounded-none border border-editorial-border shadow-sm space-y-4">
                  <h4 className="text-xs uppercase tracking-widest text-editorial-accent font-bold border-b border-editorial-border pb-2">Order summary</h4>
                  
                  <div className="space-y-3">
                    {activeOrder.cartItems.map((item: any) => (
                      <div key={item.rug.id} className="flex gap-4 items-center justify-between py-2 border-b border-stone-50">
                        <div className="flex gap-3 items-center">
                          <img
                            src={item.rug.images?.[0] || "https://images.unsplash.com/photo-1594040226829-7f251ab46d80?auto=format&fit=crop&q=80&w=800"}
                            alt={item.rug.name}
                            className="w-12 h-12 object-cover rounded-none border border-editorial-border"
                            referrerPolicy="no-referrer"
                          />
                          <div className="text-left">
                            <h5 className="font-serif font-light text-editorial-text text-xs">{item.rug.name}</h5>
                            <span className="text-sm text-gray-400">Dimensions: {item.rug.dimensions} | SKU: {item.rug.sku}</span>
                          </div>
                        </div>
                        <span className="font-serif font-light text-editorial-text text-xs">${item.rug.price.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <div className="text-xs text-gray-500 space-y-1 bg-editorial-aside p-4 rounded-none border border-editorial-border text-left">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-light font-serif text-editorial-text">${activeOrder.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping:</span>
                      <span className="font-light font-serif text-editorial-text">${activeOrder.shipping.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-editorial-border pt-2 text-xs font-semibold">
                      <span className="uppercase text-editorial-text">Order total:</span>
                      <span className="font-serif text-sm text-editorial-text">${activeOrder.total.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-400 space-y-1 border-t border-editorial-border pt-3 text-left font-light">
                    <p>• <strong>Consignee Name:</strong> {activeOrder.customerInfo.name}</p>
                    {activeOrder.customerInfo.shippingAddress && <p>• <strong>Delivery address:</strong> {activeOrder.customerInfo.shippingAddress}</p>}
                    {activeOrder.customerInfo.notes && <p>• <strong>Curator instructions:</strong> "{activeOrder.customerInfo.notes}"</p>}
                  </div>

                </div>

              </div>
            ) : activeCleaning ? (
              <div className="space-y-6">
                
                {/* Active Cleaning Banner */}
                <div className="bg-white p-6 rounded-none border border-editorial-border shadow-sm space-y-4">
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-editorial-border pb-4 gap-2">
                    <div>
                      <span className="text-sm uppercase tracking-wider text-gray-400 font-semibold block">Specialty Care Registry</span>
                      <h3 className="font-serif text-base font-light text-editorial-text">{activeCleaning.id}</h3>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-sm uppercase tracking-wider text-gray-400 font-semibold block">Current Status</span>
                      <span className={`inline-block px-2.5 py-0.5 rounded-none text-sm font-bold uppercase tracking-wider border ${
                        activeCleaning.status === "Cancelled" ? "bg-red-50 text-red-700 border-red-200" :
                        activeCleaning.status === "Completed" ? "bg-green-50 text-green-700 border-green-200" :
                        "bg-editorial-aside text-editorial-accent border-editorial-border animate-pulse"
                      }`}>
                        {activeCleaning.status}
                      </span>
                    </div>
                  </div>

                  {/* Visual Timeline Stepper */}
                  {activeCleaning.status === "Cancelled" ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-none text-red-800 space-y-1">
                      <p className="font-bold">Booking Cancelled</p>
                      <p className="text-xs">This specialty service booking has been cancelled. Contact our master advisors for more information.</p>
                    </div>
                  ) : (
                    <div className="py-4 space-y-6">
                      <h4 className="text-xs uppercase tracking-widest text-editorial-accent font-bold">Service Progress</h4>
                      
                      <div className="relative pl-6 space-y-6 border-l border-editorial-border">
                        {[
                          { label: "Pending", desc: "Reviewing specialty service and logistics" },
                          { label: "Confirmed", desc: "Scheduled & Approved" },
                          { label: "Completed", desc: "Service finished, cleaned & balance settled" }
                        ].map((step, idx) => {
                          const statusOrder = ["Pending", "Confirmed", "Completed"];
                          const currentIdx = statusOrder.indexOf(activeCleaning.status);
                          const isCompleted = idx < currentIdx;
                          const isActive = idx === currentIdx;

                          return (
                            <div key={idx} className="relative">
                              <span className={`absolute -left-9 top-1.5 flex h-5 w-5 items-center justify-center rounded-none border transition ${
                                isCompleted ? "bg-editorial-accent border-editorial-accent text-white font-bold text-sm" :
                                isActive ? "bg-white border-editorial-accent text-editorial-accent ring-4 ring-[#C2B29F]/15 text-sm font-bold" :
                                "bg-white border-editorial-border text-gray-400 text-sm"
                              }`}>
                                {isCompleted ? "✓" : idx + 1}
                              </span>

                              <div className="space-y-0.5">
                                <h5 className={`font-serif text-xs ${
                                  isActive ? "text-editorial-accent font-medium text-sm" :
                                  isCompleted ? "text-editorial-text font-light" : "text-gray-400 font-light"
                                }`}>
                                  {step.label}
                                </h5>
                                <p className={`text-xs ${isActive ? "text-gray-500 font-light" : "text-gray-400 font-light"}`}>
                                  {step.desc}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Actions row */}
                  <div className="pt-4 border-t border-editorial-border flex flex-wrap gap-2 justify-between items-center">
                    <span className="text-xs text-gray-400 font-mono">Booked on: {new Date(activeCleaning.createdAt).toLocaleString()}</span>
                    <button
                      onClick={() => {
                        const inquiryText = `Hi! I am asking about my specialty service booking ${activeCleaning.id}.`;
                        window.dispatchEvent(new CustomEvent("open-marcopolo-chat", {
                          detail: { initialMessage: inquiryText }
                        }));
                      }}
                      className="px-4 py-2 bg-editorial-aside border border-editorial-border hover:border-editorial-accent hover:text-editorial-accent rounded-none text-xs font-bold uppercase tracking-wider transition"
                    >
                      Contact Curator About Booking
                    </button>
                  </div>

                </div>

                {/* Booking details */}
                <div className="bg-white p-6 rounded-none border border-editorial-border shadow-sm space-y-4">
                  <h4 className="text-xs uppercase tracking-widest text-editorial-accent font-bold border-b border-editorial-border pb-2">Service Details</h4>
                  
                  <div className="text-xs text-gray-500 space-y-1 bg-editorial-aside p-4 rounded-none border border-editorial-border text-left">
                    <div className="flex justify-between">
                      <span>Service Option:</span>
                      <span className="font-light font-serif text-editorial-text">{activeCleaning.serviceOption}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Organic Wash Fee:</span>
                      <span className="font-light font-serif text-editorial-text">${activeCleaning.cleaningFee.toFixed(2)}</span>
                    </div>
                    {activeCleaning.pickupFee > 0 && (
                      <div className="flex justify-between">
                        <span>Concierge Pickup:</span>
                        <span className="font-light font-serif text-editorial-text">${activeCleaning.pickupFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-editorial-border pt-2 text-xs font-semibold">
                      <span className="uppercase text-editorial-text">Total Estimated Value:</span>
                      <span className="font-serif text-sm text-editorial-text">${activeCleaning.totalPrice.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-400 space-y-1 border-t border-editorial-border pt-3 text-left font-light">
                    <p>• <strong>Patron Name:</strong> {activeCleaning.fullName}</p>
                    <p>• <strong>Contact:</strong> {activeCleaning.phone} / {activeCleaning.email}</p>
                    <p>• <strong>Location:</strong> {activeCleaning.address}</p>
                    <p>• <strong>Rug Size:</strong> {activeCleaning.sizeDescription}</p>
                    <p>• <strong>Preferred Date:</strong> {activeCleaning.preferredDate} {activeCleaning.preferredTime && `at ${activeCleaning.preferredTime}`}</p>
                  </div>

                </div>

              </div>
            ) : null}
          </div>
        )}

      </div>
    </div>
  );
};
