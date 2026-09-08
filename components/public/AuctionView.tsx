'use client';

import React, { useState, useEffect } from 'react';
import { 
  Gavel, 
  Clock, 
  ShieldCheck, 
  Lock, 
  CreditCard, 
  UserCheck, 
  CheckCircle2, 
  Eye, 
  ArrowUpRight, 
  AlertCircle, 
  X,
  FileText,
  DollarSign,
  Calendar,
  Sparkles
} from 'lucide-react';
import { AuctionItem, AuctionRegistration, AuctionBid } from '@/types';
import { INITIAL_AUCTIONS } from '@/data/auctions';

export const AuctionView: React.FC = () => {
  const [auctions, setAuctions] = useState<AuctionItem[]>(INITIAL_AUCTIONS);
  const [selectedLot, setSelectedLot] = useState<AuctionItem | null>(null);
  
  // Registration state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<AuctionRegistration | null>(null);
  const [regForm, setRegForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States',
    sameShipping: true,
    shipStreet: '',
    shipCity: '',
    shipState: '',
    shipZip: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
    agreeTerms: false
  });
  const [regSuccess, setRegSuccess] = useState(false);

  // Bidding state
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [bidError, setBidError] = useState<string>('');
  const [bidSuccessMessage, setBidSuccessMessage] = useState<string>('');

  // Load registered paddle from localStorage if any
  useEffect(() => {
    try {
      const saved = localStorage.getItem('marcopolo_auction_registration');
      if (saved) {
        setRegisteredUser(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleOpenLot = (item: AuctionItem) => {
    setSelectedLot(item);
    setBidAmount(item.currentBid + item.minBidIncrement);
    setBidError('');
    setBidSuccessMessage('');
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.agreeTerms) {
      alert('Please accept the auction registration terms and conditions.');
      return;
    }

    const randomPaddle = `P-${Math.floor(100 + Math.random() * 900)}`;
    const newRegistration: AuctionRegistration = {
      id: `reg-${Date.now()}`,
      paddleNumber: randomPaddle,
      fullName: regForm.fullName,
      email: regForm.email,
      phone: regForm.phone,
      billingAddress: {
        street: regForm.street,
        city: regForm.city,
        state: regForm.state,
        zip: regForm.zip,
        country: regForm.country
      },
      shippingAddress: {
        street: regForm.sameShipping ? regForm.street : regForm.shipStreet,
        city: regForm.sameShipping ? regForm.city : regForm.shipCity,
        state: regForm.sameShipping ? regForm.state : regForm.shipState,
        zip: regForm.sameShipping ? regForm.zip : regForm.shipZip,
        country: regForm.country
      },
      paymentMethod: {
        cardLast4: regForm.cardNumber.slice(-4) || '8842',
        cardBrand: 'Visa',
        expiryDate: regForm.cardExpiry || '12/28'
      },
      idVerified: true,
      status: 'Approved',
      registeredAt: new Date().toISOString()
    };

    setRegisteredUser(newRegistration);
    try {
      localStorage.setItem('marcopolo_auction_registration', JSON.stringify(newRegistration));
    } catch {
      // ignore
    }

    setRegSuccess(true);
    setTimeout(() => {
      setRegSuccess(false);
      setIsRegisterModalOpen(false);
    }, 2000);
  };

  const handlePlaceBid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLot) return;

    if (!registeredUser) {
      setBidError('You must be a registered bidder with verified paddle and billing details to bid.');
      setIsRegisterModalOpen(true);
      return;
    }

    const minRequired = selectedLot.currentBid + selectedLot.minBidIncrement;
    if (bidAmount < minRequired) {
      setBidError(`Minimum valid bid is $${minRequired.toLocaleString()}`);
      return;
    }

    const newBid: AuctionBid = {
      id: `bid-${Date.now()}`,
      auctionId: selectedLot.id,
      bidderName: registeredUser.fullName,
      bidderEmail: registeredUser.email,
      bidderPaddleNumber: registeredUser.paddleNumber,
      amount: bidAmount,
      timestamp: new Date().toISOString()
    };

    const updatedLot: AuctionItem = {
      ...selectedLot,
      currentBid: bidAmount,
      totalBids: selectedLot.totalBids + 1,
      bids: [newBid, ...selectedLot.bids]
    };

    setAuctions((prev) => prev.map((a) => (a.id === updatedLot.id ? updatedLot : a)));
    setSelectedLot(updatedLot);
    setBidError('');
    setBidSuccessMessage(`Bid of $${bidAmount.toLocaleString()} placed successfully with Paddle ${registeredUser.paddleNumber}!`);
    setBidAmount(bidAmount + selectedLot.minBidIncrement);
  };

  return (
    <div className="min-h-screen bg-[#FDFCF9] text-editorial-text selection:bg-amber-900/20 font-sans pb-24">
      
      {/* Editorial Luxury Top Banner (Nazmiyal Auctions style) */}
      <div className="bg-[#111111] text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-neutral-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#A68B67_0.5px,transparent_0.5px)] [background-size:20px_20px] opacity-15" />
        
        <div className="max-w-7xl mx-auto relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-900 border border-neutral-750 text-[11px] font-bold uppercase tracking-[0.25em] text-amber-300">
            <Gavel className="w-3.5 h-3.5 text-amber-400" />
            <span>Marco Polo Fine Art &amp; Antique Rug Auctions</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-light tracking-wide text-white">
            Fine Antique &amp; Collector Rug Auctions
          </h1>

          <p className="text-neutral-300 max-w-2xl mx-auto font-light text-sm sm:text-base leading-relaxed">
            Curated masterworks from prominent estate collections in Washington D.C., Georgetown, and Virginia. Bid online with certified authenticity, transparent provenance, and insured delivery.
          </p>

          {/* Bidder Status Bar */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-4 text-xs">
            {registeredUser ? (
              <div className="inline-flex items-center gap-3 bg-neutral-900/90 border border-amber-600/40 px-5 py-2.5 rounded-none text-neutral-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Verified Paddle: <strong className="font-mono text-amber-300">{registeredUser.paddleNumber}</strong></span>
                <span className="text-neutral-500">|</span>
                <span>Bidder: <strong>{registeredUser.fullName}</strong></span>
                <span className="text-neutral-500">|</span>
                <span className="text-emerald-400 font-semibold">Payment &amp; Billing on File</span>
              </div>
            ) : (
              <button
                onClick={() => setIsRegisterModalOpen(true)}
                className="px-6 py-3 bg-amber-800 hover:bg-amber-700 text-white font-bold uppercase tracking-widest text-xs transition shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Register to Bid (Paddle Approval)</span>
              </button>
            )}

            <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-900 border border-neutral-800 text-neutral-400">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Authenticity Guaranteed • Encrypted Billing</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Auction Lots Showcase */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-stone-200">
          <div>
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-amber-800">Current Catalog</span>
            <h2 className="font-serif text-2xl sm:text-3xl font-light text-neutral-900">
              Live Lots Open for Bidding
            </h2>
          </div>
          <div className="text-xs font-mono text-neutral-500">
            {auctions.length} Catalogued Masterpieces Available
          </div>
        </div>

        {/* Lots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-8">
          {auctions.map((lot) => (
            <div
              key={lot.id}
              className="bg-white border border-stone-200 overflow-hidden flex flex-col group hover:shadow-xl hover:border-amber-800/40 transition-all duration-300"
            >
              {/* Lot Image with Lot # and SKU Overlay */}
              <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden cursor-pointer" onClick={() => handleOpenLot(lot)}>
                <img
                  src={lot.images[0]}
                  alt={lot.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />

                {/* Lot Badge */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                  <span className="px-2.5 py-1 bg-neutral-950/90 text-white font-serif text-xs font-bold tracking-widest uppercase">
                    LOT #{lot.lotNumber}
                  </span>
                  <span className="px-2 py-0.5 bg-white/90 backdrop-blur-xs text-neutral-800 text-[10px] font-mono font-bold tracking-wider uppercase border border-stone-200">
                    SKU: {lot.sku}
                  </span>
                </div>

                {/* Live Status Tag */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span>Live Bidding</span>
                </div>

                {/* Dimensions overlay */}
                <div className="absolute bottom-2 inset-x-2 bg-neutral-900/80 backdrop-blur-xs text-white p-1 text-center text-xs font-mono tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                  {lot.dimensions} • {lot.origin}
                </div>
              </div>

              {/* Lot Details */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-amber-800 block">
                    {lot.origin} • {lot.age}
                  </span>

                  <h3
                    onClick={() => handleOpenLot(lot)}
                    className="font-serif text-lg text-neutral-900 font-medium group-hover:text-amber-800 transition-colors line-clamp-2 cursor-pointer"
                  >
                    {lot.title}
                  </h3>

                  <p className="text-xs text-neutral-500 line-clamp-2 font-light leading-relaxed">
                    {lot.description}
                  </p>
                </div>

                {/* Estimate & Current Bid Box */}
                <div className="bg-[#FAF9F6] p-3.5 border border-stone-200 space-y-2 font-sans text-xs">
                  <div className="flex justify-between text-neutral-500">
                    <span className="uppercase tracking-wider font-semibold text-[10px]">Estimate:</span>
                    <span className="font-mono">${lot.estimatedLow.toLocaleString()} - ${lot.estimatedHigh.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-baseline pt-1 border-t border-stone-200">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider font-bold text-neutral-400">Current Bid</span>
                      <span className="font-serif text-xl font-bold text-neutral-950">
                        ${lot.currentBid.toLocaleString()}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="block text-[10px] uppercase tracking-wider text-neutral-400">Bids Placed</span>
                      <span className="font-mono text-xs font-bold text-neutral-700">{lot.totalBids} bids</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => handleOpenLot(lot)}
                    className="flex-1 py-2.5 bg-neutral-900 hover:bg-amber-800 text-white font-bold uppercase tracking-widest text-xs transition cursor-pointer text-center"
                  >
                    Bid / View Lot
                  </button>

                  <button
                    onClick={() => handleOpenLot(lot)}
                    title="View Provenance & Condition Report"
                    className="p-2.5 border border-stone-300 hover:bg-stone-100 text-neutral-700 transition cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>

      {/* Lot Detail & Bidding Modal */}
      {selectedLot && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-4xl w-full border border-stone-300 shadow-2xl relative animate-fadeIn flex flex-col md:flex-row overflow-hidden max-h-[92vh]">
            
            {/* Close Button */}
            <button
              onClick={() => setSelectedLot(null)}
              className="absolute top-4 right-4 z-20 p-2 bg-stone-100 hover:bg-stone-200 text-neutral-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left Column: Visuals & Spec Sheet */}
            <div className="w-full md:w-1/2 p-6 sm:p-8 bg-stone-50 border-r border-stone-200 overflow-y-auto space-y-6">
              <div className="relative aspect-[4/3] bg-stone-200 overflow-hidden border border-stone-300">
                <img
                  src={selectedLot.images[0]}
                  alt={selectedLot.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute top-3 left-3 px-3 py-1 bg-neutral-950 text-white font-serif text-xs font-bold uppercase tracking-wider">
                  LOT #{selectedLot.lotNumber}
                </span>
              </div>

              {/* Gallery Thumbnails */}
              {selectedLot.images.length > 1 && (
                <div className="flex gap-2">
                  {selectedLot.images.map((img, idx) => (
                    <div key={idx} className="w-20 h-16 border border-stone-300 overflow-hidden bg-stone-200">
                      <img src={img} alt="detail" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
              )}

              {/* Detailed Specs */}
              <div className="space-y-3 pt-2 text-xs">
                <h4 className="font-serif text-sm font-bold uppercase tracking-wider text-neutral-800 border-b border-stone-200 pb-1">
                  Catalog Specifications
                </h4>
                <div className="grid grid-cols-2 gap-y-2 text-neutral-600">
                  <div><strong>SKU:</strong> <span className="font-mono">{selectedLot.sku}</span></div>
                  <div><strong>Origin:</strong> {selectedLot.origin}</div>
                  <div><strong>Dimensions:</strong> {selectedLot.dimensions}</div>
                  <div><strong>Age:</strong> {selectedLot.age}</div>
                  <div><strong>Material:</strong> {selectedLot.material}</div>
                  <div><strong>Condition:</strong> {selectedLot.condition}</div>
                </div>

                <div className="pt-2">
                  <strong className="block text-neutral-800 mb-0.5">Provenance &amp; History:</strong>
                  <p className="text-neutral-600 italic font-light">{selectedLot.provenance || 'Acquired directly through Marco Polo Certified Showroom Estate Appraisals.'}</p>
                </div>
              </div>
            </div>

            {/* Right Column: Live Bidding Console */}
            <div className="w-full md:w-1/2 p-6 sm:p-8 overflow-y-auto flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <span className="text-xs uppercase tracking-widest text-amber-800 font-bold block">
                    Lot #{selectedLot.lotNumber} • SKU: {selectedLot.sku}
                  </span>
                  <h3 className="font-serif text-2xl font-light text-neutral-900 mt-1">
                    {selectedLot.title}
                  </h3>
                </div>

                {/* Estimate & Current Standing */}
                <div className="bg-[#FAF9F5] p-5 border border-stone-200 space-y-3">
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>Auction Estimate:</span>
                    <span className="font-mono font-medium">${selectedLot.estimatedLow.toLocaleString()} – ${selectedLot.estimatedHigh.toLocaleString()}</span>
                  </div>

                  <div className="pt-2 border-t border-stone-200 flex justify-between items-baseline">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold block">Current High Bid</span>
                      <span className="font-serif text-3xl font-bold text-neutral-900">
                        ${selectedLot.currentBid.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold block">Minimum Next Bid</span>
                      <span className="font-mono text-sm font-bold text-amber-800">
                        ${(selectedLot.currentBid + selectedLot.minBidIncrement).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Registered Bidder Status */}
                {registeredUser ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-900">
                    <UserCheck className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                    <div>
                      <span>Bidding authorized under Paddle <strong>{registeredUser.paddleNumber}</strong> ({registeredUser.fullName}).</span>
                      <span className="block text-[11px] text-emerald-700">Billing method: {registeredUser.paymentMethod.cardBrand} •••• {registeredUser.paymentMethod.cardLast4}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-700 flex-shrink-0" />
                      <span>Registration with billing &amp; address required to bid.</span>
                    </div>
                    <button
                      onClick={() => setIsRegisterModalOpen(true)}
                      className="px-3 py-1 bg-amber-800 text-white font-bold uppercase tracking-wider text-[10px] hover:bg-amber-900 transition"
                    >
                      Register
                    </button>
                  </div>
                )}

                {/* Bid Form */}
                <form onSubmit={handlePlaceBid} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                      Enter Bid Amount (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-serif text-base">$</span>
                      <input
                        type="number"
                        min={selectedLot.currentBid + selectedLot.minBidIncrement}
                        step={selectedLot.minBidIncrement}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(Number(e.target.value))}
                        className="w-full pl-8 pr-4 py-3 bg-stone-50 border border-stone-300 font-mono text-base font-bold text-neutral-900 outline-none focus:border-amber-800"
                        placeholder="e.g. 11000"
                      />
                    </div>
                    <span className="text-[11px] text-neutral-400 mt-1 block">
                      Increments of ${selectedLot.minBidIncrement.toLocaleString()} or more.
                    </span>
                  </div>

                  {bidError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{bidError}</span>
                    </div>
                  )}

                  {bidSuccessMessage && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>{bidSuccessMessage}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-neutral-950 hover:bg-amber-800 text-white font-bold uppercase tracking-widest text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Gavel className="w-4 h-4" />
                    <span>Confirm &amp; Place Official Bid</span>
                  </button>
                </form>

                {/* Bid Log Table */}
                <div className="pt-4 border-t border-stone-200 space-y-2">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    Recent Bid History ({selectedLot.bids.length})
                  </h5>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto text-xs font-mono text-neutral-600">
                    {selectedLot.bids.map((b) => (
                      <div key={b.id} className="flex justify-between py-1 px-2 bg-stone-50 border border-stone-100">
                        <span>Paddle {b.bidderPaddleNumber}</span>
                        <span className="font-bold text-neutral-900">${b.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              <div className="text-[11px] text-neutral-400 text-center border-t border-stone-200 pt-3">
                All winning bids are subject to standard auction terms, state tax, and insured carrier shipping.
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Customer Registration Modal (Address, Payment Info & Billing) */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full border border-stone-300 shadow-2xl relative p-6 sm:p-8 animate-fadeIn max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => setIsRegisterModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-900 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2 text-center pb-6 border-b border-stone-200">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold uppercase tracking-widest">
                <Lock className="w-3.5 h-3.5 text-amber-800" />
                <span>Bidder Registration &amp; Verification</span>
              </div>
              <h3 className="font-serif text-2xl font-light text-neutral-900">
                Register for Marco Polo Live Auctions
              </h3>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">
                Modeled after prestigious international auction galleries (Nazmiyal Auctions standard). A valid payment method and verified billing address are required to issue your official paddle.
              </p>
            </div>

            {regSuccess ? (
              <div className="py-12 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="font-serif text-xl font-bold text-neutral-900">
                  Registration Approved!
                </h4>
                <p className="text-xs text-neutral-600">
                  Your Paddle Number is <strong className="font-mono text-amber-800 text-base">{registeredUser?.paddleNumber}</strong>. You are now authorized to place live bids.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-6 pt-6 text-xs">
                
                {/* 1. Personal & Contact Details */}
                <div className="space-y-3">
                  <h4 className="font-serif text-sm font-bold uppercase tracking-wider text-neutral-800">
                    1. Bidder Identification
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-neutral-600 font-semibold mb-1">Full Legal Name *</label>
                      <input
                        type="text"
                        required
                        value={regForm.fullName}
                        onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                        placeholder="e.g. Victoria Sterling"
                        className="w-full bg-stone-50 border border-stone-300 p-2.5 outline-none focus:border-amber-800"
                      />
                    </div>

                    <div>
                      <label className="block text-neutral-600 font-semibold mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        value={regForm.phone}
                        onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                        placeholder="+1 (703) 555-0199"
                        className="w-full bg-stone-50 border border-stone-300 p-2.5 outline-none focus:border-amber-800"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-neutral-600 font-semibold mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={regForm.email}
                        onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                        placeholder="collector@example.com"
                        className="w-full bg-stone-50 border border-stone-300 p-2.5 outline-none focus:border-amber-800"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Billing Address */}
                <div className="space-y-3 pt-3 border-t border-stone-200">
                  <h4 className="font-serif text-sm font-bold uppercase tracking-wider text-neutral-800">
                    2. Billing Address
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-neutral-600 font-semibold mb-1">Street Address *</label>
                      <input
                        type="text"
                        required
                        value={regForm.street}
                        onChange={(e) => setRegForm({ ...regForm, street: e.target.value })}
                        placeholder="1234 Georgetown St NW"
                        className="w-full bg-stone-50 border border-stone-300 p-2.5 outline-none focus:border-amber-800"
                      />
                    </div>

                    <div>
                      <label className="block text-neutral-600 font-semibold mb-1">City *</label>
                      <input
                        type="text"
                        required
                        value={regForm.city}
                        onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                        placeholder="Washington"
                        className="w-full bg-stone-50 border border-stone-300 p-2.5 outline-none focus:border-amber-800"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-neutral-600 font-semibold mb-1">State *</label>
                        <input
                          type="text"
                          required
                          value={regForm.state}
                          onChange={(e) => setRegForm({ ...regForm, state: e.target.value })}
                          placeholder="DC"
                          className="w-full bg-stone-50 border border-stone-300 p-2.5 outline-none focus:border-amber-800"
                        />
                      </div>
                      <div>
                        <label className="block text-neutral-600 font-semibold mb-1">ZIP Code *</label>
                        <input
                          type="text"
                          required
                          value={regForm.zip}
                          onChange={(e) => setRegForm({ ...regForm, zip: e.target.value })}
                          placeholder="20007"
                          className="w-full bg-stone-50 border border-stone-300 p-2.5 outline-none focus:border-amber-800"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Payment Method & Billing Pre-Authorization */}
                <div className="space-y-3 pt-3 border-t border-stone-200">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif text-sm font-bold uppercase tracking-wider text-neutral-800">
                      3. Payment Card Pre-Authorization
                    </h4>
                    <span className="text-[10px] text-neutral-400 font-mono">256-Bit SSL Encrypted</span>
                  </div>

                  <p className="text-[11px] text-neutral-500 font-light">
                    No charge is processed upon registration. Your card is held on file strictly to guarantee legitimate auction bids.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-neutral-600 font-semibold mb-1">Card Number *</label>
                      <input
                        type="text"
                        required
                        maxLength={19}
                        value={regForm.cardNumber}
                        onChange={(e) => setRegForm({ ...regForm, cardNumber: e.target.value })}
                        placeholder="•••• •••• •••• ••••"
                        className="w-full bg-stone-50 border border-stone-300 p-2.5 font-mono outline-none focus:border-amber-800"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-neutral-600 font-semibold mb-1">MM/YY *</label>
                        <input
                          type="text"
                          required
                          maxLength={5}
                          value={regForm.cardExpiry}
                          onChange={(e) => setRegForm({ ...regForm, cardExpiry: e.target.value })}
                          placeholder="12/28"
                          className="w-full bg-stone-50 border border-stone-300 p-2.5 font-mono text-center outline-none focus:border-amber-800"
                        />
                      </div>
                      <div>
                        <label className="block text-neutral-600 font-semibold mb-1">CVC *</label>
                        <input
                          type="password"
                          required
                          maxLength={4}
                          value={regForm.cardCvc}
                          onChange={(e) => setRegForm({ ...regForm, cardCvc: e.target.value })}
                          placeholder="•••"
                          className="w-full bg-stone-50 border border-stone-300 p-2.5 font-mono text-center outline-none focus:border-amber-800"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Terms and Agreement */}
                <div className="pt-3 border-t border-stone-200">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={regForm.agreeTerms}
                      onChange={(e) => setRegForm({ ...regForm, agreeTerms: e.target.checked })}
                      className="mt-0.5 accent-amber-800"
                    />
                    <span className="text-[11px] text-neutral-600 font-light leading-relaxed">
                      I agree to the Marco Polo Auction terms. I confirm that all placed bids are legally binding contracts to purchase, and authorize Marco Polo Oriental Rugs to bill my card on file if an auction is won.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-amber-800 hover:bg-neutral-900 text-white font-bold uppercase tracking-widest text-xs transition shadow-md cursor-pointer"
                >
                  Verify &amp; Issue Bidding Paddle
                </button>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
