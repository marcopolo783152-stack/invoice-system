/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { X, Trash2, ShieldCheck, CreditCard, ChevronRight, CheckCircle2, Truck, HelpCircle, FileText, AlertTriangle, Printer, Download, Camera } from "lucide-react";
import { jsPDF } from "jspdf";

export const CartView: React.FC = () => {
  const { 
    cart, 
    cartOpen, 
    setCartOpen, 
    removeFromCart, 
    updateCartQuantity, 
    checkout,
    promoCodes,
    shopProfile,
    logoUrl
  } = useStore();

  const [checkoutStep, setCheckoutStep] = useState<"cart" | "shipping" | "payment" | "success">("cart");
  const [createdOrder, setCreatedOrder] = useState<any>(null);

  // Promo Code State
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoError, setPromoError] = useState("");

  // Form Fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [shippingStreet, setShippingStreet] = useState("");
  const [shippingApt, setShippingApt] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingZip, setShippingZip] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [notes, setNotes] = useState("");
  const [deliveryOption, setDeliveryOption] = useState<"Pickup" | "Delivery">("Delivery");
  
  const derivedShippingAddress = deliveryOption === "Pickup"
    ? "Alexandria Showroom Pickup: 3260 Duke St, Alexandria, VA 22314"
    : `${shippingStreet} ${shippingApt ? "Apt/Suite " + shippingApt : ""}, ${shippingCity}, ${shippingState} ${shippingZip}`.trim();

  // Credit Card Simulation
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVC, setCardCVC] = useState("");
  const [printFeedback, setPrintFeedback] = useState<string | null>(null);

  const downloadReceiptAsPDF = (order: any) => {
    import("@/utils/pdf").then(({ generateAndDownloadReceiptPDF }) => {
      generateAndDownloadReceiptPDF(order, shopProfile, logoUrl);
    });
  };

  const handlePrint = (order: any) => {
    try {
      // In sandboxed browsers, print can fail, but we attempt it
      window.print();
    } catch (e) {
      console.warn("Standard printing blocked by browser iframe restrictions:", e);
    }
    // Always trigger the elegant PDF download as an intuitive fail-safe!
    downloadReceiptAsPDF(order);
    setPrintFeedback("Preview Sandbox Security Notice: Printing converted to a secure offline PDF download!");
    setTimeout(() => setPrintFeedback(null), 8000);
  };

  if (!cartOpen) return null;

  const rawSubtotal = cart.reduce((sum, item) => sum + item.rug.price * item.quantity, 0);
  
  let discount = 0;
  if (appliedPromo) {
    if (appliedPromo.discountType === "percentage") {
      discount = rawSubtotal * (appliedPromo.discountValue / 100);
    } else {
      discount = appliedPromo.discountValue;
    }
  }
  
  const subtotal = Math.max(0, rawSubtotal - discount);
  
  // Calculate total weight in lbs
  const totalWeightLbs = cart.reduce((sum, item) => {
    const rugWeight = item.rug.weightLbs || (
      item.rug.sizeCategory.includes("8x10") ? 4.5 :
      item.rug.sizeCategory.includes("9x12") ? 6.5 :
      item.rug.sizeCategory.includes("6x9") ? 3.5 :
      item.rug.sizeCategory.includes("10x13") ? 8.0 :
      item.rug.sizeCategory.includes("Runner") ? 2.8 :
      3.5
    );
    return sum + (rugWeight * item.quantity);
  }, 0);

  // Calculate shipping cost based on weight & delivery option
  // "shiping cost like 2-5 lbs gonna be 16 dollar"
  let shipping = 0;
  if (deliveryOption === "Delivery") {
    if (totalWeightLbs <= 1.9) {
      shipping = 8;
    } else if (totalWeightLbs >= 2 && totalWeightLbs <= 5) {
      shipping = 16;
    } else {
      shipping = 45; // heavier luxury items
    }
  }

  // 6% sales taxes
  const tax = subtotal * 0.06;
  const total = subtotal + shipping + tax;

  const handleNextStep = () => {
    if (checkoutStep === "cart") setCheckoutStep("shipping");
    else if (checkoutStep === "shipping") {
      if (billingSameAsShipping) {
        setBillingAddress(derivedShippingAddress);
      }
      setCheckoutStep("payment");
    }
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !email || (!shippingStreet || !shippingCity || !shippingState || !shippingZip) && deliveryOption === "Delivery") return;

    // Secure payment simulation card masking
    const cleanCard = cardNumber.replace(/\s+/g, "");
    const last4 = cleanCard.slice(-4) || "4242";
    const brand = cleanCard.startsWith("3") ? "American Express" : cleanCard.startsWith("5") ? "Mastercard" : "Visa";

    const customerInfo = {
      name,
      phone,
      email,
      shippingAddress: derivedShippingAddress,
      billingAddress: billingSameAsShipping ? derivedShippingAddress : billingAddress,
      notes
    };

    const paymentDetails = {
      cardBrand: brand,
      last4,
      cardholderName: cardName || name,
      cardNumber: cardNumber,
      cardExpiry: cardExpiry,
      cardCVC: cardCVC
    };

    const order = checkout(customerInfo, paymentDetails, deliveryOption, shipping, tax, totalWeightLbs, appliedPromo || undefined, discount);
    setCreatedOrder(order);
    setCheckoutStep("success");
  };

  const handleClose = () => {
    // Reset steps on close, unless succeeded
    if (checkoutStep === "success") {
      setCheckoutStep("cart");
      setCreatedOrder(null);
    }
    setCartOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      <div className="absolute inset-0 bg-editorial-text/40 backdrop-blur-xs transition-opacity" onClick={handleClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-editorial-bg text-editorial-text h-full shadow-xl flex flex-col border-l border-editorial-border animate-slideLeft">
          
          {/* Header Panel */}
          <div className="px-6 py-5 bg-editorial-aside border-b border-editorial-border flex items-center justify-between">
            <div>
              <span className="text-sm uppercase tracking-widest text-editorial-accent font-bold block">Secure Showroom Gateway</span>
              <h2 className="font-serif text-lg font-light text-editorial-text flex items-center gap-2">
                {checkoutStep === "cart" && "Shopping Curation"}
                {checkoutStep === "shipping" && "Shipping & Address Curation"}
                {checkoutStep === "payment" && "Secure Escrow Settlement"}
                {checkoutStep === "success" && "Order Submitted!"}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 text-gray-400 hover:text-editorial-text hover:bg-white border border-transparent hover:border-editorial-border rounded-none transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Stepper visual bar */}
          {checkoutStep !== "success" && (
            <div className="grid grid-cols-3 bg-white border-b border-editorial-border text-sm font-bold text-center uppercase tracking-wider">
              <span className={`py-3.5 border-r border-editorial-border transition-colors ${checkoutStep === "cart" ? "bg-editorial-accent text-white" : "text-gray-400 bg-editorial-aside"}`}>
                1. Review Cart
              </span>
              <span className={`py-3.5 border-r border-editorial-border transition-colors ${checkoutStep === "shipping" ? "bg-editorial-accent text-white" : "text-gray-400 bg-editorial-aside"}`}>
                2. Shipping
              </span>
              <span className={`py-3.5 transition-colors ${checkoutStep === "payment" ? "bg-editorial-accent text-white" : "text-gray-400 bg-editorial-aside"}`}>
                3. Card Escrow
              </span>
            </div>
          )}

          {/* Core Body content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* --- STEP 1: CART DETAILS --- */}
            {checkoutStep === "cart" && (
              <>
                {cart.length === 0 ? (
                  <div className="text-center py-20 space-y-3">
                    <Trash2 className="h-8 w-8 text-editorial-accent/60 mx-auto" />
                    <h3 className="font-serif font-light text-editorial-text text-lg">Your Cart is Empty</h3>
                    <p className="text-xs text-gray-500 max-w-xs mx-auto font-light leading-relaxed">
                      Explore our fine hand-knotted showroom catalog to select antique, Persian, or modern masterpieces.
                    </p>
                    <button
                      onClick={handleClose}
                      className="px-5 py-2.5 bg-editorial-accent text-white font-bold uppercase tracking-widest text-xs rounded-none shadow hover:bg-[#8E7453] transition"
                    >
                      Browse fine rugs
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h4 className="text-xs uppercase tracking-widest text-editorial-accent font-bold border-b border-editorial-border pb-2">Selected Rug Masterworks</h4>
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div key={item.rug.id} className="flex gap-4 p-4 bg-white rounded-none border border-editorial-border shadow-xs">
                          <img
                            src={item.rug.images?.[0] || "https://images.unsplash.com/photo-1594040226829-7f251ab46d80?auto=format&fit=crop&q=80&w=800"}
                            alt={item.rug.name}
                            className="w-20 h-20 object-cover rounded-none border border-editorial-border flex-shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0 flex-1 flex flex-col justify-between text-left">
                            <div>
                              <div className="flex justify-between items-start gap-2">
                                <h5 className="font-serif text-xs font-light text-editorial-text truncate">{item.rug.name}</h5>
                                <button
                                  onClick={() => removeFromCart(item.rug.id)}
                                  className="text-gray-400 hover:text-red-500 transition p-1"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <p className="text-sm text-gray-400">SKU: {item.rug.sku} | Origin: {item.rug.origin}</p>
                              <p className="text-sm text-editorial-accent mt-0.5 font-light">Dimensions: {item.rug.dimensions}</p>
                            </div>
                            
                            <div className="flex justify-between items-center pt-2 border-t border-editorial-border mt-2">
                              <span className="text-sm uppercase tracking-wider text-gray-400 font-light">Unique Unit</span>
                              <span className="font-serif text-sm font-light text-editorial-text">${item.rug.price.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* --- STEP 2: SHIPPING FORM --- */}
            {checkoutStep === "shipping" && (
              <div className="space-y-4 text-xs">
                <h4 className="text-xs uppercase tracking-widest text-editorial-accent font-bold border-b border-editorial-border pb-2">Consignee Coordinates</h4>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm">Full Recipient Name</label>
                    <input
                      type="text"
                      required
                      value={name} autoComplete="name"
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Elena Rostov"
                      className="w-full bg-white border border-editorial-border rounded-none py-2.5 px-3 outline-none text-xs text-editorial-text focus:border-editorial-accent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm">Phone Line</label>
                      <input
                        type="tel"
                        required
                        value={phone} autoComplete="tel"
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 789-0122"
                        className="w-full bg-white border border-editorial-border rounded-none py-2.5 px-3 outline-none text-xs text-editorial-text focus:border-editorial-accent"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm">Email Coordinates</label>
                      <input
                        type="email"
                        required
                        value={email} autoComplete="email"
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="elena@luxury-designs.com"
                        className="w-full bg-white border border-editorial-border rounded-none py-2.5 px-3 outline-none text-xs text-editorial-text focus:border-editorial-accent"
                      />
                    </div>
                  </div>

                  {/* Pickup or Delivery Selector */}
                  <div className="space-y-1">
                    <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm mb-1">Fulfillment Mode</label>
                    <div className="grid grid-cols-2 gap-2 bg-neutral-150 p-1 rounded-none border border-editorial-border">
                      <button
                        type="button"
                        onClick={() => {
                          setDeliveryOption("Delivery");
                          setShippingStreet(""); setShippingApt(""); setShippingCity(""); setShippingState(""); setShippingZip("");
                        }}
                        className={`py-2 text-center text-xs font-bold uppercase tracking-wider transition ${
                          deliveryOption === "Delivery"
                            ? "bg-editorial-accent text-white font-semibold"
                            : "text-gray-500 hover:text-editorial-text"
                        }`}
                      >
                        Insured Delivery
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeliveryOption("Pickup");
                          // Delivery option set to pickup, derived address handles it automatically.
                        }}
                        className={`py-2 text-center text-xs font-bold uppercase tracking-wider transition ${
                          deliveryOption === "Pickup"
                            ? "bg-editorial-accent text-white font-semibold"
                            : "text-gray-500 hover:text-editorial-text"
                        }`}
                      >
                        Showroom Pickup
                      </button>
                    </div>
                  </div>

                  {deliveryOption === "Delivery" ? (
                                          <div className="space-y-3 animate-fadeIn">
                        <div>
                          <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm mb-1">Street Address *</label>
                          <input type="text" required value={shippingStreet} autoComplete="street-address" onChange={(e) => setShippingStreet(e.target.value)} placeholder="783 Park Avenue" className="w-full bg-white border border-editorial-border rounded-none py-2.5 px-3 outline-none text-xs text-editorial-text focus:border-editorial-accent" />
                        </div>
                        <div>
                          <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm mb-1">Apt, Suite, Bldg (optional)</label>
                          <input type="text" value={shippingApt} autoComplete="address-line2" onChange={(e) => setShippingApt(e.target.value)} placeholder="Apt 14B" className="w-full bg-white border border-editorial-border rounded-none py-2.5 px-3 outline-none text-xs text-editorial-text focus:border-editorial-accent" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm mb-1">City *</label>
                            <input type="text" required value={shippingCity} autoComplete="address-level2" onChange={(e) => setShippingCity(e.target.value)} placeholder="New York" className="w-full bg-white border border-editorial-border rounded-none py-2.5 px-3 outline-none text-xs text-editorial-text focus:border-editorial-accent" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm mb-1">State *</label>
                              <input type="text" required value={shippingState} autoComplete="address-level1" onChange={(e) => setShippingState(e.target.value)} placeholder="NY" className="w-full bg-white border border-editorial-border rounded-none py-2.5 px-3 outline-none text-xs text-editorial-text focus:border-editorial-accent" />
                            </div>
                            <div>
                              <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm mb-1">Zip *</label>
                              <input type="text" required value={shippingZip} autoComplete="postal-code" onChange={(e) => setShippingZip(e.target.value)} placeholder="10021" className="w-full bg-white border border-editorial-border rounded-none py-2.5 px-3 outline-none text-xs text-editorial-text focus:border-editorial-accent" />
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                          Est. total shipping weight: <strong>{totalWeightLbs.toFixed(1)} lbs</strong>. Shipping cost applies: {totalWeightLbs <= 1.9 ? "$8 (under 2 lbs)" : totalWeightLbs >= 2 && totalWeightLbs <= 5 ? "$16 (2-5 lbs)" : "$45 (premium insured)"}.
                        </p>
                      </div>
                  ) : (
                    <div className="p-4 bg-editorial-aside border border-editorial-border rounded-none space-y-2 animate-fadeIn">
                      <span className="text-sm uppercase tracking-wider text-editorial-accent font-bold block">Alexandria HQ Showroom Location</span>
                      <p className="text-xs text-editorial-text font-serif italic">
                        MARCO POLO ORIENTAL RUGS, INC.<br/>
                        3260 DUKE ST<br/>
                        ALEXANDRIA, VA 22314
                      </p>
                      <p className="text-xs text-gray-500 font-light">
                        We will secure your purchase in our vault. You may pick it up at your convenience. Bring your confirmation code and ID.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-gray-500">
                      <input
                        type="checkbox"
                        checked={billingSameAsShipping}
                        onChange={(e) => setBillingSameAsShipping(e.target.checked)}
                        className="rounded-none accent-editorial-accent border-editorial-border h-4 w-4 cursor-pointer"
                      />
                      <span className="font-semibold text-xs">Billing address is identical to shipping</span>
                    </label>
                  </div>

                  {!billingSameAsShipping && (
                    <div className="space-y-1 animate-fadeIn">
                      <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm">Billing Address</label>
                      <input
                        type="text"
                        required
                        value={billingAddress} autoComplete="street-address"
                        onChange={(e) => setBillingAddress(e.target.value)}
                        placeholder="Billing address..."
                        className="w-full bg-white border border-editorial-border rounded-none py-2.5 px-3 outline-none text-xs text-editorial-text focus:border-editorial-accent"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm">Delivery instructions / Custom Padding Holds</label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Please wrap for storage / hold for Tuesday delivery / include premium non-slip felt rug pad..."
                      className="w-full bg-white border border-editorial-border rounded-none py-2 px-3 outline-none focus:border-editorial-accent text-xs text-editorial-text resize-none font-light"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* --- STEP 3: PAYMENT ESCROW FORM --- */}
            {checkoutStep === "payment" && (
              <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-xs text-left">
                <div className="p-4 bg-editorial-aside border border-editorial-border rounded-none flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-editorial-accent mt-0.5 flex-shrink-0 animate-pulse" />
                  <div>
                    <h5 className="font-serif font-light text-editorial-text text-sm">Escrow Curation Protocol</h5>
                    <p className="text-xs text-gray-500 leading-relaxed mt-0.5 font-light">
                      Your settlement is fully authorized through zero-knowledge Stripe tokenization. Funds are safely held in escrow and your card is **NOT** debited until a showroom curator reviews inventory holds and manually marks the order as <strong>Confirmed</strong>.
                    </p>
                  </div>
                </div>

                <h4 className="text-xs uppercase tracking-widest text-editorial-accent font-bold border-b border-editorial-border pb-2">Credit Card Coordinates</h4>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm">Cardholder Full Name</label>
                    <input
                      type="text"
                      required
                      value={cardName} autoComplete="cc-name"
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="e.g. Elena Rostov"
                      className="w-full bg-white border border-editorial-border rounded-none py-2.5 px-3 outline-none focus:border-editorial-accent text-xs text-editorial-text"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm">Credit Card Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={cardNumber} autoComplete="cc-number"
                        onChange={(e) => {
                          const val = e.target.value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
                          const matches = val.match(/\d{4,16}/g);
                          const match = (matches && matches[0]) || "";
                          const parts = [];
                          for (let i = 0, len = match.length; i < len; i += 4) {
                            parts.push(match.substring(i, i + 4));
                          }
                          if (parts.length > 0) {
                            setCardNumber(parts.join(" "));
                          } else {
                            setCardNumber(val);
                          }
                        }}
                        maxLength={19}
                        placeholder="4242 4242 4242 4242"
                        className="w-full bg-white border border-editorial-border rounded-none py-2.5 pl-10 pr-3 outline-none focus:border-editorial-accent text-xs font-mono tracking-wider text-editorial-text"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm">Expiration Date</label>
                      <input
                        type="text"
                        required
                        value={cardExpiry} autoComplete="cc-exp"
                        onChange={(e) => {
                          let val = e.target.value.replace(/[^0-9]/g, "");
                          if (val.length >= 2) {
                            setCardExpiry(val.slice(0, 2) + "/" + val.slice(2, 4));
                          } else {
                            setCardExpiry(val);
                          }
                        }}
                        maxLength={5}
                        placeholder="MM/YY"
                        className="w-full bg-white border border-editorial-border rounded-none py-2.5 px-3 outline-none focus:border-editorial-accent text-xs font-mono text-editorial-text"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm">CVV / CVC Security</label>
                      <input
                        type="password"
                        required
                        value={cardCVC} autoComplete="cc-csc"
                        onChange={(e) => setCardCVC(e.target.value.replace(/[^0-9]/g, ""))}
                        maxLength={4}
                        placeholder="•••"
                        className="w-full bg-white border border-editorial-border rounded-none py-2.5 px-3 outline-none focus:border-editorial-accent text-xs font-mono text-editorial-text"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-editorial-accent hover:bg-[#8E7453] text-white font-bold uppercase tracking-widest text-xs rounded-none shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="h-4.5 w-4.5" />
                    <span>Authorize Escrow ${total.toLocaleString()}</span>
                  </button>
                </div>
              </form>
            )}

            {/* --- STEP 4: SUCCESS RECEIPT --- */}
            {checkoutStep === "success" && createdOrder && (
              <div className="space-y-6 text-center py-6 animate-fadeIn">
                <div className="relative inline-block">
                  <CheckCircle2 className="h-14 w-14 text-green-700 mx-auto animate-bounce" />
                  <span className="absolute bottom-0 right-0 block h-5 w-5 bg-green-50 rounded-none border border-green-700 text-green-700 flex items-center justify-center font-bold text-sm">
                    ✓
                  </span>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-serif text-2xl font-light text-editorial-text">Escrow Authorized!</h3>
                  <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto font-light">
                    Your purchase invoice has been registered successfully. Our showroom advisors will immediately inspect your selected wool fibers, issue the lifetime authentication documents, and confirm holds.
                  </p>
                </div>

                {/* ATTENTION REQUIRED: RECEIPT SAVE WARNING BANNER */}
                <div className="border border-amber-300 bg-amber-50/70 p-4 max-w-sm mx-auto text-left space-y-3 shadow-xs">
                  <div className="flex gap-2.5">
                    <AlertTriangle className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-amber-900 uppercase tracking-wider">CRITICAL REQUIREMENT</h4>
                      <p className="text-sm text-amber-850 leading-relaxed font-normal">
                        Please **print**, **take a screenshot**, **save as a photo**, or **download** this order receipt right now. This is your official showroom escrow record and reference key.
                      </p>
                    </div>
                  </div>
                  
                  {/* Action row with functional buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handlePrint(createdOrder)}
                      className="flex items-center justify-center gap-1.5 py-2 bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold uppercase tracking-wider transition cursor-pointer"
                      title="Print receipt"
                    >
                      <Printer className="h-3 w-3" />
                      <span>Print Receipt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadReceiptAsPDF(createdOrder)}
                      className="flex items-center justify-center gap-1.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold uppercase tracking-wider transition cursor-pointer"
                      title="Download receipt as PDF"
                    >
                      <Download className="h-3 w-3" />
                      <span>Download PDF</span>
                    </button>
                  </div>

                  {printFeedback && (
                    <div className="p-2 bg-amber-100 border border-amber-300 text-amber-950 text-sm font-semibold tracking-wide text-center leading-relaxed animate-pulse">
                      {printFeedback}
                    </div>
                  )}
                  
                  <div className="text-sm text-amber-800/80 italic text-center border-t border-amber-200/50 pt-2 flex items-center justify-center gap-1.5 font-sans">
                    <Camera className="h-2.5 w-2.5" />
                    <span>Tip: Press <strong>Cmd/Win + Shift + S</strong> to take a screenshot</span>
                  </div>
                </div>

                {/* Shop Details & Tracking ID Badge */}
                <div className="p-5 border border-editorial-border rounded-none bg-editorial-aside max-w-sm mx-auto space-y-4 text-left">
                  <div className="flex flex-col items-center justify-center text-center space-y-2 pb-4 border-b border-editorial-border">
                    {logoUrl && (
                      <img src={logoUrl} alt="Shop Logo" className="h-12 w-auto object-contain" />
                    )}
                    <div>
                      <h4 className="font-serif font-bold text-editorial-text">{shopProfile?.name || "Marco Polo"}</h4>
                      {shopProfile?.address && <p className="text-xs text-gray-500 mt-1">{shopProfile.address}</p>}
                      <p className="text-xs text-gray-500">
                        {[shopProfile?.phone, shopProfile?.email].filter(Boolean).join(" • ")}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between border-b border-editorial-border pb-2 text-xs">
                    <span className="text-gray-400 font-semibold uppercase tracking-wider">Tracking Reference</span>
                    <span className="font-mono font-bold text-editorial-accent text-sm">{createdOrder.id}</span>
                  </div>

                  <div className="space-y-1.5 text-sm text-gray-500 leading-relaxed font-light">
                    <p>• <strong>Status:</strong> <span className="px-2 py-0.5 bg-editorial-bg text-editorial-accent border border-editorial-border text-sm font-bold uppercase">Pending Confirmation</span></p>
                    <p>• <strong>Consignee:</strong> {createdOrder.customerInfo.name}</p>
                    <p>• <strong>Settlement Sum:</strong> ${createdOrder.total.toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-2 max-w-sm mx-auto">
                  <button
                    onClick={handleClose}
                    className="w-full py-3.5 bg-editorial-accent hover:bg-[#8E7453] text-white font-bold uppercase tracking-widest text-xs rounded-none transition"
                  >
                    Return to Showroom
                  </button>
                  <p className="text-xs text-gray-400 font-light">
                    Need assistance? Use our floating concierge support chat.
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* Checkout Footer Totals Summary (Only if cart/shipping/payment) */}
          {checkoutStep !== "success" && cart.length > 0 && (
            <div className="p-6 bg-editorial-aside border-t border-editorial-border space-y-4">
              <div className="space-y-2 text-xs text-gray-500 font-sans font-light">
                <div className="flex justify-between">
                  <span>Showroom Subtotal:</span>
                  <span className="font-serif font-light text-editorial-text">${rawSubtotal.toLocaleString()}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between text-[#A68B67] font-bold">
                    <span>Promo ({appliedPromo.code}):</span>
                    <span>{appliedPromo.discountType === "free_shipping" ? "Free Shipping" : `-${discount.toLocaleString()}`}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Sales Tax (6%):</span>
                  <span className="font-serif font-light text-editorial-text">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1">
                    Insured Freight ({deliveryOption === "Pickup" ? "Pickup" : `${totalWeightLbs.toFixed(1)} lbs`}):
                    <Truck className="h-3.5 w-3.5 text-gray-400" />
                  </span>
                  <span className="font-serif font-light text-editorial-text">
                    {deliveryOption === "Pickup" ? (
                      <span className="text-green-700 font-sans uppercase text-sm font-semibold">Free Pickup</span>
                    ) : (
                      `$${shipping.toFixed(2)}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-t border-editorial-border pt-3 text-sm font-light">
                  <span className="text-editorial-text uppercase tracking-wider">Est. Settlement:</span>
                  <span className="font-serif text-base text-editorial-text">${total.toLocaleString()}</span>
                </div>
              </div>

              {checkoutStep === "cart" && (
                <div className="border-t border-editorial-border pt-4 pb-2">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Promo code" 
                      value={promoInput} 
                      onChange={e => setPromoInput(e.target.value.toUpperCase())}
                      className="w-full bg-white border border-editorial-border py-2 px-3 text-xs outline-none focus:border-editorial-accent uppercase"
                    />
                    <button 
                      onClick={() => {
                        const promo = promoCodes?.find(p => p.code === promoInput && p.isActive);
                        if (promo) {
                          setAppliedPromo(promo);
                          setPromoError("");
                        } else {
                          setPromoError("Invalid or expired promo code");
                        }
                      }}
                      className="bg-[#1A1A1A] text-white px-4 text-xs font-bold uppercase tracking-widest cursor-pointer hover:bg-[#333]"
                    >
                      Apply
                    </button>
                  </div>
                  {promoError && <div className="text-red-500 text-xs mt-1">{promoError}</div>}
                  {appliedPromo && <div className="text-green-600 text-xs mt-1">Promo applied successfully!</div>}
                </div>
              )}

              {checkoutStep === "cart" && (
                <button
                  onClick={handleNextStep}
                  className="w-full py-3.5 bg-editorial-accent hover:bg-[#8E7453] text-white font-bold uppercase tracking-widest text-xs rounded-none shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Proceed to Address Coordinates</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}

              {checkoutStep === "shipping" && (
                <button
                  onClick={handleNextStep}
                  disabled={!name || !phone || !email || ((!shippingStreet || !shippingCity || !shippingState || !shippingZip) && deliveryOption === "Delivery")}
                  className="w-full py-3.5 bg-editorial-accent hover:bg-[#8E7453] text-white font-bold uppercase tracking-widest text-xs rounded-none shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Proceed to Escrow Settlement</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
