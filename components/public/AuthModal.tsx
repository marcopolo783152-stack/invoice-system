/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { X, ShieldAlert, KeyRound, UserPlus, LogIn, ClipboardList, MapPin, Phone, LogOut, CheckCircle, HelpCircle } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, loginUser, signupUser, logoutUser, orders, cleaningBookings } = useStore();
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  
  // Feedback
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (isSignUp) {
      if (!name || !email || !password) {
        setError("Please fill out all required fields.");
        return;
      }
      const res = signupUser(name, email, password, phone, address);
      if (res.success) {
        setSuccess(res.message);
        setTimeout(() => {
          onClose();
          setSuccess("");
          resetForm();
        }, 1500);
      } else {
        setError(res.message);
      }
    } else {
      if (!email || !password) {
        setError("Please enter your email and password.");
        return;
      }
      const res = loginUser(email, password);
      if (res.success) {
        setSuccess(res.message);
        setTimeout(() => {
          onClose();
          setSuccess("");
          resetForm();
        }, 1500);
      } else {
        setError(res.message);
      }
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setPhone("");
    setAddress("");
    setError("");
    setSuccess("");
  };

  // Filter user specific logs
  const customerOrders = orders.filter(
    (o) => o.customerInfo.email.toLowerCase() === currentUser?.email.toLowerCase()
  );

  const customerCleanings = cleaningBookings.filter(
    (b) => b.email.toLowerCase() === currentUser?.email.toLowerCase()
  );

  return (
    <div className="fixed inset-0 z-[9999] bg-neutral-950/80 backdrop-blur-xs flex justify-center items-start p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-none w-full max-w-lg shadow-2xl border border-editorial-border animate-fadeIn relative my-4 sm:my-8 flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-editorial-border flex justify-between items-center bg-stone-50">
          <div>
            <h3 className="font-serif font-semibold text-base uppercase tracking-wider text-editorial-text">
              {currentUser ? "My Account Portal" : isSignUp ? "Create Ambassador Account" : "Ambassador Sign In"}
            </h3>
            <p className="text-xs uppercase tracking-widest text-gray-400 mt-1">
              {currentUser ? "Exclusive Curation History" : "Unlock personalized support & orders"}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-stone-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-950 transition cursor-pointer border border-neutral-300 rounded-none flex items-center justify-center"
            title="Close Portal"
            aria-label="Close"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {currentUser ? (
            /* Logged-In Customer Profile View */
            <div className="space-y-6 text-xs text-left">
              <div className="bg-neutral-50 p-5 border border-editorial-border space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-serif font-bold text-neutral-800">{currentUser.name}</h4>
                    <span className="inline-block px-2 py-0.5 bg-neutral-200 text-sm uppercase tracking-wider font-semibold text-neutral-600 rounded-none mt-1">
                      {currentUser.role === "admin" ? "Administrator Privilege" : "Fine Arts Patron"}
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      logoutUser();
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-red-700 text-white font-sans uppercase tracking-widest text-sm font-bold transition cursor-pointer"
                  >
                    <LogOut className="h-3 w-3" />
                    <span>Log Out</span>
                  </button>
                </div>

                <div className="border-t border-neutral-200 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-neutral-600 font-sans">
                  <div className="flex items-center gap-1.5">
                    <LogIn className="h-3.5 w-3.5 text-neutral-400" />
                    <span>Email: <strong>{currentUser.email}</strong></span>
                  </div>
                  {currentUser.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-neutral-400" />
                      <span>Phone: <strong>{currentUser.phone}</strong></span>
                    </div>
                  )}
                  {currentUser.address && (
                    <div className="flex items-start gap-1.5 sm:col-span-2">
                      <MapPin className="h-3.5 w-3.5 text-neutral-400 mt-0.5" />
                      <span>Delivery Address: <strong>{currentUser.address}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order History */}
              <div className="space-y-3">
                <h4 className="font-serif font-bold text-neutral-800 border-b border-editorial-border pb-1.5 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <ClipboardList className="h-4 w-4 text-editorial-accent" />
                  <span>My Active Purchases ({customerOrders.length})</span>
                </h4>

                {customerOrders.length === 0 ? (
                  <p className="text-stone-400 text-sm italic">No artisan orders registered with this email account yet.</p>
                ) : (
                  <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                    {customerOrders.map((order) => (
                      <div key={order.id} className="p-3 border border-neutral-100 bg-neutral-50/50 flex justify-between items-center text-sm">
                        <div>
                          <div className="font-bold text-neutral-800">ID: {order.id}</div>
                          <div className="text-stone-400 text-xs">{new Date(order.createdAt).toLocaleDateString()}</div>
                          <div className="text-stone-500 mt-1 font-serif">
                            {order.cartItems.map((item) => `${item.rug.name} (${item.rug.dimensions})`).join(", ")}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="block font-bold text-neutral-800">${order.total.toLocaleString()}</span>
                          <span className="inline-block mt-1 text-sm uppercase font-bold text-editorial-accent tracking-wider">
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Rug Cleaning Bookings */}
              <div className="space-y-3 pt-2">
                <h4 className="font-serif font-bold text-neutral-800 border-b border-editorial-border pb-1.5 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span>Organic Washing & Repair History ({customerCleanings.length})</span>
                </h4>

                {customerCleanings.length === 0 ? (
                  <p className="text-stone-400 text-sm italic">No cleaning evaluation logs booked on this account.</p>
                ) : (
                  <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                    {customerCleanings.map((bk) => (
                      <div key={bk.id} className="p-3 border border-neutral-100 bg-stone-50 flex justify-between items-center text-sm">
                        <div>
                          <div className="font-mono text-xs text-neutral-400">{bk.id}</div>
                          <div className="font-bold text-neutral-800">Rug dimensions entered: {bk.sizeDescription}</div>
                          <div className="text-neutral-500 text-xs mt-0.5">
                            Method: {bk.serviceOption === "Pickup" ? "White-glove Pickup" : "Self Drop-off"} • Preferred Date: {new Date(bk.preferredDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="block font-bold text-neutral-800">${bk.totalPrice.toFixed(2)}</span>
                          <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-none text-xs uppercase tracking-wider font-bold mt-1">
                            {bk.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Login & Registration Forms */
            <form onSubmit={handleSubmit} className="space-y-4 text-xs text-left font-sans">
              
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-none text-sm flex items-center gap-2 animate-fadeIn">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-none text-sm flex items-center gap-2 animate-fadeIn">
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{success}</span>
                </div>
              )}

              {isSignUp && (
                <div className="space-y-1">
                  <label className="block text-neutral-600 uppercase font-bold tracking-wider text-xs">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full bg-stone-50 border border-neutral-200 rounded-none py-2.5 px-3 outline-none focus:border-editorial-accent text-xs"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-neutral-600 uppercase font-bold tracking-wider text-xs">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. client@example.com"
                  className="w-full bg-stone-50 border border-neutral-200 rounded-none py-2.5 px-3 outline-none focus:border-editorial-accent text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-neutral-600 uppercase font-bold tracking-wider text-xs">Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-stone-50 border border-neutral-200 rounded-none py-2.5 px-3 outline-none focus:border-editorial-accent text-xs font-mono tracking-widest"
                />
              </div>

              {isSignUp && (
                <>
                  <div className="space-y-1">
                    <label className="block text-neutral-600 uppercase font-bold tracking-wider text-xs">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +1 (555) 019-2834"
                      className="w-full bg-stone-50 border border-neutral-200 rounded-none py-2.5 px-3 outline-none focus:border-editorial-accent text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-neutral-600 uppercase font-bold tracking-wider text-xs">Shipping Address</label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street, City, State, ZIP"
                      rows={2}
                      className="w-full bg-stone-50 border border-neutral-200 rounded-none py-2.5 px-3 outline-none focus:border-editorial-accent text-xs resize-none"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold uppercase tracking-widest text-xs rounded-none transition flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {isSignUp ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                <span>{isSignUp ? "Register Account" : "Access Curator Vault"}</span>
              </button>

              <div className="text-center pt-2.5 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError("");
                  }}
                  className="text-xs text-stone-500 hover:text-editorial-accent uppercase tracking-wider font-semibold underline cursor-pointer"
                >
                  {isSignUp ? "Already have an account? Sign In" : "New Curator? Establish Credentials"}
                </button>
              </div>

              {/* Admin note snippet inside the sign in page */}
              {!isSignUp && (
                <div className="p-3 bg-stone-50 border border-editorial-border text-sm text-stone-500 space-y-1 font-mono rounded mt-4">
                  <span className="block font-bold text-neutral-700 uppercase tracking-widest text-xs">Curator Notes:</span>
                  <p>Administrators can access full controls by signing in using the certified administrator key pairs.</p>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
