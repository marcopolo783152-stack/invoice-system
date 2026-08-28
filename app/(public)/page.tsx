/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import React, { useState, useEffect } from "react";
import { StoreProvider, useStore } from "@/context/StoreContext";
import { Navbar } from "@/components/public/Navbar";
import { Hero } from "@/components/public/Hero";
import { ShopView } from "@/components/public/ShopView";
import { BlogView } from "@/components/public/BlogView";
import { TrackingView } from "@/components/public/TrackingView";
import { ProductDetail } from "@/components/public/ProductDetail";
import { CartView } from "@/components/public/CartView";
import { ChatWidget } from "@/components/public/ChatWidget";
import { AdminDashboard } from "@/components/public/AdminDashboard";
import AppointmentForm from "@/components/public/AppointmentForm";
import EstimateForm from "@/components/public/EstimateForm";
import { Instagram, Facebook, Youtube, Twitter, Globe, Edit2, Save } from "lucide-react";
import Link from "next/link";

function AppContent() {
  const { activeView, showroomAnnouncement, socialLinks, setActiveView, logoutUser, currentUser, isEditMode, setIsEditMode, saveWebsiteContent } = useStore();
  const [currentTab, setCurrentTab] = useState("home");
  const [selectedRugId, setSelectedRugIdState] = useState<string | null>(null);

  // Wrapper to update URL when opening/closing a rug
  const setSelectedRugId = (id: string | null) => {
    setSelectedRugIdState(id);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (id) {
        url.searchParams.set("item", id);
      } else {
        url.searchParams.delete("item");
      }
      window.history.pushState({}, "", url.toString());
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const path = window.location.pathname.toLowerCase();

      if (urlParams.get("track")) {
        setCurrentTab("track");
      } else if (urlParams.get("item")) {
        setCurrentTab("shop");
        setSelectedRugIdState(urlParams.get("item"));
      } else if (path === "/shop") {
        setCurrentTab("shop");
      } else if (path === "/cart") {
        setCurrentTab("shop"); // or home, then open cart? We'll just set shop.
      } else if (path === "/about") {
        // We don't have an about tab, maybe stay on home
      }
    }
  }, []);

  // If active role is Admin Panel, render the administrative workspace directly
  if (activeView === "admin") {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col">
        {showroomAnnouncement && (
          <div className="bg-amber-950 text-amber-200 text-center py-2 px-4 text-sm font-sans font-medium tracking-wide border-b border-amber-900 flex items-center justify-center gap-2">
            <span>{showroomAnnouncement}</span>
          </div>
        )}
        <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />
        <AdminDashboard />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-editorial-bg text-editorial-text selection:bg-editorial-accent/20">
      
      {/* Dynamic Showroom Announcement Banner */}
      {showroomAnnouncement && (
        <div className="bg-amber-950 text-amber-200 text-center py-2 px-4 text-sm font-sans font-medium tracking-wide border-b border-amber-900 flex items-center justify-center gap-2">
          <span>{showroomAnnouncement}</span>
        </div>
      )}

      {/* Hidden SEO H1 and local content for Googlebot */}
      <div className="sr-only">
        <h1>Handmade Oriental &amp; Persian Rugs in Alexandria, Virginia</h1>
        <p>
          Marco Polo Oriental Rugs is your premier destination for authentic, handmade Persian rugs, antique carpets, and fine oriental rugs in Alexandria, VA. We proudly serve the Washington, D.C. area and Northern Virginia with curated selections, expert rug cleaning, repair, and restoration services.
        </p>
      </div>

      {/* Luxury sticky Header Navigation bar */}
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Main Content Router */}
      
      {/* Floating Edit Mode Bar for Admins */}
      {currentUser?.role === 'admin' && (
        <div className="fixed bottom-4 left-4 z-[9999] bg-neutral-900 text-white p-3 rounded-lg shadow-2xl flex items-center gap-4 border border-neutral-700">
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isEditMode ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-500'}`} />
                <span className="font-bold uppercase tracking-wider text-xs">Live Edit Mode</span>
            </div>
            
            <button onClick={() => setIsEditMode(!isEditMode)} className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition ${isEditMode ? 'bg-neutral-700 text-white' : 'bg-editorial-accent text-white'}`}>
                <Edit2 size={14} className="inline mr-1" /> {isEditMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
            </button>
            
            {isEditMode && (
                <button onClick={saveWebsiteContent} className="px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition bg-emerald-600 hover:bg-emerald-500 text-white">
                    <Save size={14} className="inline mr-1" /> Publish Changes
                </button>
            )}
        </div>
      )}
      
      <div className="flex-1">
        {currentTab === "home" && (
          <Hero 
            onSelectRugId={(id) => {
              setSelectedRugId(id);
              setCurrentTab("shop");
            }} 
            setCurrentTab={setCurrentTab}
          />
        )}
        
        {currentTab === "shop" && (
          <ShopView onSelectRugId={setSelectedRugId} />
        )}
        
        {currentTab === "blog" && (
          <BlogView 
            onSelectRugId={(id) => {
              setSelectedRugId(id);
            }} 
            setCurrentTab={setCurrentTab}
          />
        )}
        
        {currentTab === "track" && (
          <TrackingView />
        )}
        
        {currentTab === "book" && (
          <div className="bg-neutral-50 py-16 px-4 sm:px-6 lg:px-8 min-h-screen">
            <AppointmentForm />
          </div>
        )}
      </div>

      {/* --- Footer Layout --- */}
      <footer className="bg-white text-editorial-text py-12 border-t border-editorial-border text-xs font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 text-left">
          
          <div className="space-y-4">
            <h3 className="font-serif text-editorial-accent text-sm tracking-[0.2em] uppercase font-bold">MARCO POLO ORIENTAL RUGS, INC.</h3>
            <p className="text-gray-500 leading-relaxed text-sm max-w-xs font-light">
              Direct source curators of antique, Persian, Turkish, and Oriental masterpiece weavers. Establishing trust through manual escrow certifications since 1982.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="uppercase tracking-[0.2em] text-xs text-editorial-text font-bold">Curator Collections</h4>
            <ul className="space-y-1.5 text-gray-500 text-sm font-light">
              <li><button onClick={() => { setCurrentTab("shop"); window.scrollTo(0,0); }} className="hover:text-editorial-accent transition-colors duration-200">Persian Heirlooms</button></li>
              <li><button onClick={() => { setCurrentTab("shop"); window.scrollTo(0,0); }} className="hover:text-editorial-accent transition-colors duration-200">Afghan Tribal Weaves</button></li>
              <li><button onClick={() => { setCurrentTab("shop"); window.scrollTo(0,0); }} className="hover:text-editorial-accent transition-colors duration-200">Anatolian Antiques</button></li>
              <li><button onClick={() => { setCurrentTab("shop"); window.scrollTo(0,0); }} className="hover:text-editorial-accent transition-colors duration-200">Modern Natural Silks</button></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="uppercase tracking-[0.2em] text-xs text-editorial-text font-bold">Design Services</h4>
            <ul className="space-y-1.5 text-gray-500 text-sm font-light">
              <li><Link href="/services/rug-cleaning-alexandria-va" className="hover:text-editorial-accent transition-colors duration-200">Professional Rug Cleaning</Link></li>
              <li><Link href="/services/rug-repair-restoration-alexandria-va" className="hover:text-editorial-accent transition-colors duration-200">Repair &amp; Restoration</Link></li>
              <li><Link href="/services" className="hover:text-editorial-accent transition-colors duration-200">All Services &amp; Care</Link></li>
              <li><a href="#services" className="hover:text-editorial-accent transition-colors duration-200">In-Home Curation Approvals</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="uppercase tracking-[0.2em] text-xs text-editorial-text font-bold">Alexandria Showroom Hours</h4>
            <p className="text-gray-500 leading-relaxed text-sm font-light">
              3260 DUKE ST, ALEXANDRIA, VA 22314<br />
              Mon - Sat: 10:00 AM - 6:00 PM EST<br />
              Private Curating by Scheduled Request.<br />
              <span className="text-editorial-accent font-bold">Showroom Line: +1 (703) 461-0207</span><br />
              <a href="mailto:marcopolorugs@aol.com" className="text-gray-400 font-mono text-xs hover:text-editorial-accent transition">marcopolorugs@aol.com</a>
            </p>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mt-8 border-t border-editorial-border flex flex-col items-center sm:items-start gap-4">
          {socialLinks && socialLinks.some(l => l.url) && (
            <div className="flex items-center gap-4">
              {socialLinks.map((link) => {
                if (!link.url) return null;
                let Icon = Globe;
                if (link.platform === "instagram") Icon = Instagram;
                else if (link.platform === "facebook") Icon = Facebook;
                else if (link.platform === "youtube") Icon = Youtube;
                else if (link.platform === "twitter") Icon = Twitter;
                return (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-editorial-accent transition"
                    title={`Follow us on ${link.platform}`}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          )}
          <div className="w-full text-xs text-gray-400 flex flex-col sm:flex-row justify-between gap-4">
            <p>© 2026 Marco Polo Oriental Rugs, Inc. All certified assets protected under global Escrow Escutcheon acts.</p>
            <p className="uppercase tracking-[0.1em]">Handcrafted under Zero-Force Trade standards.</p>
          </div>
        </div>
      </footer>

      {/* --- OVERLAY SCREENS & SLIDE-OUT PANEL DRAWER PROTOCOLS --- */}
      
      {/* 1. Shopping Cart Panel Overlay Drawer */}
      <CartView />

      {/* 2. Floating Live Concierge Support Chat Widget bubble */}
      <ChatWidget />

      {/* 3. High-Resolution Interactive Zoom Rug Detail Modal */}
      {selectedRugId && (
        <ProductDetail 
          rugId={selectedRugId} 
          onClose={() => setSelectedRugId(null)} 
          onSelectRugId={setSelectedRugId}
        />
      )}

    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
