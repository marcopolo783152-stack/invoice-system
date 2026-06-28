/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { Search, Compass, Truck, ShieldCheck, ClipboardCheck, PackageCheck, AlertCircle, ShoppingBag, MapPin, Send } from "lucide-react";

export const TrackingView: React.FC = () => {
  const { orders, cleaningBookings, sendChatMessage } = useStore();
  const [searchId, setSearchId] = useState("");
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [activeCleaning, setActiveCleaning] = useState<any>(null);
  const [searched, setSearched] = useState(false);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
    const idClean = searchId.trim().toUpperCase();
    
    const foundOrder = orders.find((o) => o.id === idClean);
    const foundCleaning = cleaningBookings.find((b) => b.id === idClean);
    
    setActiveOrder(foundOrder || null);
    setActiveCleaning(foundCleaning || null);
  };

  const orderStatuses = [
    { label: "Pending Confirmation", desc: "Showroom curator reviewing inventory holds" },
    { label: "Confirmed", desc: "Order approved & authenticity certificates generated" },
    { label: "Preparing for Shipping", desc: "Delicately cleaned & bound in weather sleeves" },
    { label: "Shipped", desc: "Handed to secure premium freight carriers" },
    { label: "Delivered", desc: "Safely unrolled with white-glove signature" }
  ];

  const getStatusIndex = (status: string) => {
    if (status === "Cancelled") return -1;
    return orderStatuses.findIndex(s => s.label === status);
  };

  const handleContactSupport = () => {
    if (!activeOrder) return;
    const inquiryText = `Hi! I am asking about my order tracking ID ${activeOrder.id}. Is there any update on shipping?`;
    window.dispatchEvent(new CustomEvent("open-marcopolo-chat", {
      detail: { initialMessage: inquiryText }
    }));
  };

  return (
    <div className="bg-[#F9F7F5] min-h-screen py-12 font-sans text-xs">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-left">
        
        {/* Title */}
        <div className="text-center space-y-2">
          <span className="text-xs uppercase tracking-[0.3em] text-editorial-accent font-bold block">Live Freight Logistics</span>
          <h1 className="font-serif text-3xl font-light text-editorial-text tracking-tight">Track Your Masterpiece</h1>
          <p className="text-xs text-gray-500 max-w-md mx-auto font-light">
            Input your purchase tracking ID (e.g., MPR-10294) to monitor hand-knotted authenticity approvals, packaging logs, and freight delivery.
          </p>
        </div>

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
              placeholder="Enter Order ID (e.g., MPR-49204)"
              className="w-full bg-editorial-aside border border-editorial-border rounded-none py-3.5 pl-11 pr-4 outline-none text-xs focus:border-editorial-accent text-editorial-text tracking-widest uppercase font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3.5 bg-editorial-accent hover:bg-[#8E7453] text-white font-bold uppercase tracking-widest rounded-none transition cursor-pointer text-xs"
          >
            Monitor Delivery
          </button>
        </form>

        {/* --- TRACKING RESULT BOARD --- */}
        {searched && (
          <div className="animate-fadeIn">
            {!activeOrder && !activeCleaning ? (
              <div className="bg-white p-10 rounded-none border border-editorial-border shadow-sm text-center space-y-3">
                <AlertCircle className="h-10 w-10 text-editorial-accent/60 mx-auto" />
                <h3 className="font-serif text-base font-light text-editorial-text">Reference Number Not Found</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed font-light">
                  We could not locate a registered invoice or booking matching "{searchId.toUpperCase()}". Please verify the code on your success screen or contact concierge support.
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
                      <span className="text-sm uppercase tracking-wider text-gray-400 font-semibold block">Active Invoice Registry</span>
                      <h3 className="font-serif text-base font-light text-editorial-text">{activeOrder.id}</h3>
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
                      <p className="font-bold">Order Cancelled</p>
                      <p className="text-xs">This transaction has been cancelled. For details or custom refund processing, contact our master advisors.</p>
                    </div>
                  ) : (
                    <div className="py-4 space-y-6">
                      <h4 className="text-xs uppercase tracking-widest text-editorial-accent font-bold">Curated Progress</h4>
                      
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
                  {activeOrder.shippingDetails && (
                    <div className="p-5 bg-editorial-text rounded-none text-white border border-editorial-border space-y-3">
                      <div className="flex items-center gap-2 text-editorial-accent font-bold uppercase tracking-wider text-xs">
                        <Truck className="h-4.5 w-4.5" />
                        <span>Insured Carrier Dispatch Documents</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs border-t border-gray-700 pt-3">
                        <div>
                          <span className="text-gray-400 block uppercase font-light">Carrier Partner:</span>
                          <span className="font-semibold text-white">{activeOrder.shippingDetails.carrier}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block uppercase font-light">Tracking Number:</span>
                          <span className="font-mono font-bold text-[#C2B29F]">{activeOrder.shippingDetails.trackingNumber}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-400 block uppercase font-light">Estimated Delivery:</span>
                          <span className="font-semibold text-white">{activeOrder.shippingDetails.estimatedDelivery || "Showroom pending verification"}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions row */}
                  <div className="pt-4 border-t border-editorial-border flex flex-wrap gap-2 justify-between items-center">
                    <span className="text-xs text-gray-400 font-mono">Registered on: {new Date(activeOrder.createdAt).toLocaleString()}</span>
                    <button
                      onClick={handleContactSupport}
                      className="px-4 py-2 bg-editorial-aside border border-editorial-border hover:border-editorial-accent hover:text-editorial-accent rounded-none text-xs font-bold uppercase tracking-wider transition"
                    >
                      Contact Curator About Order
                    </button>
                  </div>

                </div>

                {/* Invoice contents */}
                <div className="bg-white p-6 rounded-none border border-editorial-border shadow-sm space-y-4">
                  <h4 className="text-xs uppercase tracking-widest text-editorial-accent font-bold border-b border-editorial-border pb-2">Itemized Curation Invoice</h4>
                  
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
                      <span>Showroom Sum:</span>
                      <span className="font-light font-serif text-editorial-text">${activeOrder.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Insured Freight Transport:</span>
                      <span className="font-light font-serif text-editorial-text">${activeOrder.shipping.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-editorial-border pt-2 text-xs font-semibold">
                      <span className="uppercase text-editorial-text">Total Authorized Value:</span>
                      <span className="font-serif text-sm text-editorial-text">${activeOrder.total.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-400 space-y-1 border-t border-editorial-border pt-3 text-left font-light">
                    <p>• <strong>Consignee Name:</strong> {activeOrder.customerInfo.name}</p>
                    <p>• <strong>Shipping Coordinates:</strong> {activeOrder.customerInfo.shippingAddress}</p>
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
