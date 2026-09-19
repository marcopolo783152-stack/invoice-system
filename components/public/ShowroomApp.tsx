/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import React, { useState, useEffect, useRef } from "react";
import { StoreProvider, useStore } from "@/context/StoreContext";
import { Navbar } from "@/components/public/Navbar";
import { Hero } from "@/components/public/Hero";
import { DynamicPageRenderer } from "@/components/public/DynamicPageRenderer";
import { ShopView } from "@/components/public/ShopView";
import { BlogView } from "@/components/public/BlogView";
import { TrackingView } from "@/components/public/TrackingView";
import { ProductDetail } from "@/components/public/ProductDetail";
import { CartView } from "@/components/public/CartView";
import { ChatWidget } from "@/components/public/ChatWidget";
import { AdminDashboard } from "@/components/public/AdminDashboard";
import AppointmentForm from "@/components/public/AppointmentForm";
import { AuctionView } from "@/components/public/AuctionView";
import { InlineRugCalculator } from "@/components/public/InlineRugCalculator";
import { Instagram, Facebook, Youtube, Twitter, Globe, Edit2, Save } from "lucide-react";
import Link from "next/link";

type Props = {initialRugId?: string; initialRug?: import("@/types").Rug};
function AppContent({initialRugId,initialRug}: Props) {
  const { publicRugs, activeView, showroomAnnouncement, socialLinks, setActiveView, logoutUser, currentUser, isEditMode, setIsEditMode, websiteContent, saveWebsiteContent } = useStore();
  const [currentTab, setTab] = useState(initialRugId ? "shop" : "home");
  const [selectedRugId, setSelectedRugIdState] = useState<string | null>(initialRugId || null);
  const returnUrl = useRef("/?view=shop");
  const setCurrentTab = (tab: string) => {
    setTab(tab); setSelectedRugIdState(null);
    window.history.pushState({}, "", tab === "home" ? "/" : "/?view=" + tab);
  };
  const setSelectedRugId = (id: string | null) => {
    if(id && !selectedRugId) returnUrl.current = window.location.pathname.startsWith("/shop/") ? "/?view=shop" : window.location.pathname + window.location.search;
    setSelectedRugIdState(id);
    window.history.pushState({}, "", id ? "/shop/" + encodeURIComponent(id) : returnUrl.current);
  };
  useEffect(() => {
    const sync = () => {
      const params = new URLSearchParams(window.location.search);
      const path = window.location.pathname;
      const id = path.startsWith("/shop/") ? decodeURIComponent(path.slice(6)) : params.get("item");
      setSelectedRugIdState(id);
      const view = params.get("view");
      setTab(id ? "shop" : params.has("track") ? "track" : ["home","shop","book","blog","track","auction"].includes(view || "") ? view! : path === "/shop" || path === "/cart" ? "shop" : /auctions?/.test(path) ? "auction" : "home");
    };
    sync(); window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  // If active role is Admin Panel, render the administrative workspace directly
  if (activeView === "admin") {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col">
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

      {/* CMS PROMO BANNER */}
      {websiteContent?.announcement_text && (
        <div className="bg-neutral-900 text-white text-center py-2 px-4 text-xs font-bold uppercase tracking-widest relative z-50">
          {websiteContent?.announcement_link ? (
            <a href={websiteContent.announcement_link} className="hover:text-editorial-accent transition-colors">
              {websiteContent.announcement_text}
            </a>
          ) : (
            <span>{websiteContent.announcement_text}</span>
          )}
        </div>
      )}

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
          <DynamicPageRenderer 
            slug="home" 
            fallback={
              <Hero 
                onSelectRugId={(id) => {
                  setSelectedRugId(id);
                  setTab("shop");
                }} 
                setCurrentTab={setCurrentTab}
              />
            } 
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
            <AppointmentForm publicRugs={publicRugs} />
          </div>
        )}

        {currentTab === "auction" && (
          <AuctionView rugs={publicRugs} onSelectRug={setSelectedRugId} />
        )}
      </div>

      
      <footer className="bg-[#183f35] text-white px-6 py-12">
        <div className="max-w-7xl mx-auto grid gap-8 md:grid-cols-3">
          <div><h2 className="text-2xl font-serif">Marco Polo Rugs</h2><p className="mt-3">Alexandria, Virginia · Since 1988</p><p className="mt-3">3260 Duke St, Alexandria, VA 22314</p><a href="tel:+17034610207">(703) 461-0207</a><p>Daily, 10:00 AM–6:00 PM</p></div>
          <div className="flex flex-col gap-3"><a href="/?view=shop">Shop rugs</a><a href="/?view=shop&saved=1">Saved rugs</a><a href="/?view=book">Book a showroom visit</a><a href="/services/rug-cleaning-alexandria-va">Cleaning & repair</a><a href="/?view=track">Track your order</a></div>
          <div><h3 className="font-bold">Shop with clear expectations</h3><p className="mt-3">Free padding with every rug. Delivery charges are shown at checkout.</p><p className="mt-3">All sales are final. Exchanges within one week. Full payment is required before pickup or delivery.</p></div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-white/20 flex flex-wrap gap-5">
          {socialLinks?.filter(l=>l.url).map(l=><a key={l.platform} href={l.url} target="_blank" rel="noopener noreferrer">{l.platform}</a>)}
          <p>© {new Date().getFullYear()} Marco Polo Oriental Rugs, Inc.</p>
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
          initialRug={initialRug} 
          onClose={() => setSelectedRugId(null)} 
          onSelectRugId={setSelectedRugId}
        />
      )}

    </div>
  );
}

export default function ShowroomApp(props: Props) {
  return (
    <StoreProvider>
      <AppContent {...props} />
    </StoreProvider>
  );
}
