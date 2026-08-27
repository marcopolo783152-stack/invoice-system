"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore, StoreProvider } from "@/context/StoreContext";
import { LogOut, User as UserIcon, Package, MapPin, Heart } from "lucide-react";

function AccountContent() {
  const { currentUser, orders, rugs, logoutUser } = useStore();
  const router = useRouter();

  useEffect(() => {
    // Basic redirect if not logged in
    if (typeof window !== 'undefined' && !currentUser) {
      router.push("/");
    }
  }, [currentUser, router]);

  if (!currentUser) return null;

  const customerOrders = orders.filter(o => o.customerInfo && o.customerInfo.email.toLowerCase() === currentUser.email.toLowerCase());

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <div className="flex justify-between items-center bg-white p-6 rounded-md border border-neutral-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-serif font-bold text-neutral-900">Welcome, {currentUser.name}</h1>
            <p className="text-sm text-neutral-500 uppercase tracking-wider mt-1">Customer Portal</p>
          </div>
          <button 
            onClick={async () => {
              await logoutUser();
              router.push("/");
            }}
            className="px-4 py-2 bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-neutral-800 transition"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Profile & Addresses */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-md border border-neutral-200 shadow-sm">
              <h2 className="text-lg font-serif font-bold mb-4 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-editorial-accent" /> Profile Details
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-500 font-bold mb-1">Email</label>
                  <div className="font-mono">{currentUser.email}</div>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-500 font-bold mb-1">Phone</label>
                  <div>{currentUser.phone || "Not provided"}</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-md border border-neutral-200 shadow-sm">
              <h2 className="text-lg font-serif font-bold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-editorial-accent" /> Saved Addresses
              </h2>
              <div className="text-sm">
                {currentUser.address ? (
                  <p className="leading-relaxed">{currentUser.address}</p>
                ) : (
                  <p className="text-neutral-500 italic">No addresses saved yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Orders & Tracking */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-md border border-neutral-200 shadow-sm">
              <h2 className="text-lg font-serif font-bold mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-editorial-accent" /> Order History & Tracking
              </h2>
              
              {customerOrders.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-neutral-500 mb-4">You haven't placed any orders yet.</p>
                  <button onClick={() => router.push("/")} className="px-6 py-2 bg-editorial-accent text-white uppercase font-bold text-xs tracking-wider">Browse Rugs</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {customerOrders.map(order => (
                    <div key={order.id} className="border border-neutral-100 p-4 bg-stone-50">
                      <div className="flex justify-between mb-3 border-b border-neutral-200 pb-2">
                        <div>
                          <div className="font-bold text-neutral-800">Order #{order.id.split("-").pop()}</div>
                          <div className="text-xs text-neutral-500">{new Date(order.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-2 py-1 bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider rounded-sm">
                            {order.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Total Items:</span>
                          <span className="font-bold">{order.cartItems.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Total Amount:</span>
                          <span className="font-bold">${order.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-md border border-neutral-200 shadow-sm">
              <h2 className="text-lg font-serif font-bold mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-editorial-accent" /> Saved Rugs
              </h2>
              <div className="text-center py-6 text-neutral-500 text-sm">
                No saved items. Heart your favorite rugs to see them here!
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}


export default function AccountPage() {
  return (
    <StoreProvider>
      <AccountContent />
    </StoreProvider>
  );
}
