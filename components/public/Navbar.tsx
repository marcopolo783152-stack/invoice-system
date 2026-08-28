/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { ChevronDown, ShoppingBag, Menu, X, Landmark, User, Settings, Phone, LogIn, ShieldAlert, Instagram, Facebook, Youtube, Twitter, Globe, Calculator } from "lucide-react";
import RugCalculatorModal from "../RugCalculatorModal";
import { AuthModal } from "./AuthModal";

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { cart, activeView, setActiveView, setCartOpen, currentUser, logoutUser, socialLinks, logoUrl } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const navItems = [
    { id: "home", label: "Home" },
    { id: "shop", label: "Shop Collection" },
    { id: "blog", label: "Interior Blog" },
    { id: "track", label: "Track Order" },
    { id: "book", label: "Book Appointment" }
  ];

  const handleNavClick = (tabId: string) => {
    setCurrentTab(tabId);
    setMobileMenuOpen(false);
    if (activeView === "admin") {
      setActiveView("customer");
    }
  };

  const isAdmin = currentUser?.role === "admin";

  return (
    <>
      {/* Elegantly styled utility bar displaying official showroom credentials */}
      <div className="bg-neutral-900 text-white text-sm sm:text-xs py-2 px-4 border-b border-editorial-accent/20 flex flex-col sm:flex-row justify-between items-center gap-1.5 font-sans tracking-[0.1em] uppercase font-light w-full">
        <div className="flex items-center gap-1.5 text-gray-300">
          <span className="text-editorial-accent font-semibold">Alexandria HQ:</span>
          <span>3260 Duke St, Alexandria, VA 22314</span>
        </div>
        <div className="flex items-center gap-4 text-gray-300">
          <a href="tel:+17034610207" className="hover:text-white transition flex items-center gap-1">
            <Phone className="h-3 w-3 text-editorial-accent" />
            <span>+1 (703) 461-0207</span>
          </a>
          <span className="hidden sm:inline text-neutral-600">|</span>
          <a href="mailto:marcopolorugs@aol.com" className="hover:text-white transition lowercase">
            marcopolorugs@aol.com
          </a>
          {socialLinks && socialLinks.some(l => l.url) && (
            <>
              <span className="hidden md:inline text-neutral-600">|</span>
              <div className="flex items-center gap-2">
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
                      <Icon className="h-3.5 w-3.5" />
                    </a>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-editorial-border text-editorial-text w-full">
        <div className="w-full max-w-[1920px] mx-auto px-4 lg:px-12">
          <div className="flex items-center justify-between h-20">
            
            {/* Logo Brand */}
            <div className="flex-shrink-0 flex items-center gap-3 cursor-pointer lg:w-[250px]" onClick={() => handleNavClick("home")}>
              {logoUrl ? (
                <img src={logoUrl} alt="Store Logo" className="h-10 w-auto object-contain" referrerPolicy="no-referrer" />
              ) : (
                <>
                  <div className="p-2 bg-editorial-aside rounded-none text-editorial-accent border border-editorial-border shadow-xs">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-serif text-sm sm:text-base tracking-[0.15em] font-light uppercase text-editorial-text block leading-tight">
                      Marco Polo
                    </span>
                    <span className="font-serif text-xs sm:text-sm tracking-[0.1em] font-medium italic text-editorial-accent block leading-tight">
                      Oriental Rugs, Inc.
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="hidden lg:flex items-center justify-center gap-8 font-sans text-xs uppercase tracking-widest font-medium flex-1 px-4">
              <button
                  onClick={() => handleNavClick('home')}
                  className={`relative py-2 transition-all duration-300 hover:text-editorial-accent ${currentTab === 'home' ? 'text-editorial-text font-medium italic' : 'text-gray-400'}`}
              >
                  Home
                  {currentTab === 'home' && <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-editorial-accent" />}
              </button>
              <button
                  onClick={() => handleNavClick('shop')}
                  className={`relative py-2 transition-all duration-300 hover:text-editorial-accent ${currentTab === 'shop' ? 'text-editorial-text font-medium italic' : 'text-gray-400'}`}
              >
                  Shop Collection
                  {currentTab === 'shop' && <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-editorial-accent" />}
              </button>
              
              <div className="group relative">
                <button className={`relative py-2 transition-all duration-300 hover:text-editorial-accent flex items-center gap-1 ${['blog', 'track', 'book'].includes(currentTab) ? 'text-editorial-text font-medium italic' : 'text-gray-400'}`}>
                  Categories
                  <ChevronDown className="h-3.5 w-3.5" />
                  {['blog', 'track', 'book'].includes(currentTab) && <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-editorial-accent" />}
                </button>
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-0 w-56 bg-white border border-editorial-border shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 flex flex-col z-50">
                  <button onClick={() => handleNavClick('blog')} className="text-left px-5 py-3.5 hover:bg-stone-50 hover:text-editorial-accent border-b border-stone-100 text-gray-500 transition tracking-widest font-bold">Interior Blog</button>
                  <button onClick={() => handleNavClick('track')} className="text-left px-5 py-3.5 hover:bg-stone-50 hover:text-editorial-accent border-b border-stone-100 text-gray-500 transition tracking-widest font-bold">Track Order</button>
                  <button onClick={() => handleNavClick('book')} className="text-left px-5 py-3.5 hover:bg-stone-50 hover:text-editorial-accent text-gray-500 transition tracking-widest font-bold">Book Appointment</button>
                </div>
              </div>
            </div>

          {/* Action buttons (Right side) */}
          <div className="hidden lg:flex items-center gap-2">
            {/* Direct Line Badge */}
            <a
              href="tel:+17034610207"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-editorial-aside text-gray-600 hover:text-editorial-accent text-sm transition border border-editorial-border font-sans uppercase tracking-wider"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>+1 (703) 461-0207</span>
            </a>

            {/* Calculator Button */}
            <button
                onClick={() => setCalculatorOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-editorial-accent text-white hover:bg-neutral-800 text-sm transition border border-editorial-accent font-sans uppercase tracking-wider font-bold cursor-pointer"
            >
                <Calculator className="h-3.5 w-3.5" />
                <span>Calculator</span>
            </button>
            
            {/* Account access button */}
            {!currentUser ? (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-editorial-aside text-gray-700 hover:text-editorial-accent text-sm transition border border-editorial-border font-sans uppercase tracking-wider font-bold cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </button>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-stone-100 text-stone-900 hover:text-editorial-accent text-sm transition border border-editorial-border font-sans uppercase tracking-wider font-bold cursor-pointer"
              >
                <User className="h-3.5 w-3.5" />
                <span>My Dashboard</span>
              </button>
            )}

            {/* Admin Toggle Switch - ONLY visible to verified administrator */}
            {isAdmin && (
              <div className="flex items-center bg-stone-100 rounded-none p-0.5 border border-stone-200">
                <button
                  onClick={() => setActiveView("customer")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-none text-sm font-bold uppercase tracking-wider transition cursor-pointer ${
                    activeView === "customer"
                      ? "bg-editorial-accent text-white"
                      : "text-gray-500 hover:text-editorial-text"
                  }`}
                >
                  <User className="h-2.5 w-2.5" />
                  <span>Customer</span>
                </button>
                <button
                  onClick={() => setActiveView("admin")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-none text-sm font-bold uppercase tracking-wider transition cursor-pointer ${
                    activeView === "admin"
                      ? "bg-editorial-accent text-white"
                      : "text-gray-500 hover:text-editorial-text"
                  }`}
                >
                  <Settings className="h-2.5 w-2.5" />
                  <span>Admin</span>
                </button>
              </div>
            )}

            {/* Shopping Cart Trigger */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2 bg-editorial-aside rounded-none text-editorial-accent hover:bg-white transition border border-editorial-border cursor-pointer"
            >
              <ShoppingBag className="h-4.5 w-4.5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-none bg-editorial-accent text-xs font-mono text-white ring-1 ring-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

          {/* Mobile Cart and Menu Toggles */}
          <div className="flex md:hidden items-center space-x-3">
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2 bg-editorial-aside rounded-none text-editorial-accent border border-editorial-border"
            >
              <ShoppingBag className="h-4.5 w-4.5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-none bg-editorial-accent text-xs font-mono text-white">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 bg-editorial-aside rounded-none text-gray-600 border border-editorial-border"
            >
              {mobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-editorial-bg border-t border-editorial-border px-4 py-6 space-y-4 animate-fadeIn">
          <div className="flex flex-col space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`text-left py-2.5 px-3 rounded-none text-xs uppercase tracking-widest font-bold transition ${
                  currentTab === item.id
                    ? "bg-editorial-aside text-editorial-accent border-l-2 border-editorial-accent"
                    : "text-gray-500 hover:bg-editorial-aside"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Mobile authentication switcher */}
          <div className="pt-4 border-t border-editorial-border space-y-2">
            {!currentUser ? (
              <button
                onClick={() => {
                  setAuthModalOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2 bg-stone-150 border border-stone-300 text-stone-700 text-center text-xs uppercase font-bold tracking-widest font-sans flex items-center justify-center gap-1"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In / Create Account</span>
              </button>
            ) : (
              <div className="flex justify-between items-center text-xs">
                <span>Account: <strong>{currentUser.name}</strong></span>
                <button
                  onClick={() => {
                    setAuthModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="py-1 px-3 bg-stone-200 text-stone-800 text-xs uppercase font-bold tracking-widest underline"
                >
                  My Dashboard
                </button>
              </div>
            )}
          </div>

          {/* Quick Support Phone */}
          <div className="pt-4 border-t border-editorial-border flex justify-between items-center text-xs text-gray-500">
            <span className="font-serif italic font-light">Concierge: +1 (703) 461-0207</span>
            <span className="text-editorial-accent font-bold uppercase tracking-wider text-xs">Call to Consult</span>
          </div>

          {/* Role view switcher in mobile (ONLY for Admin) */}
          {isAdmin && (
            <div className="pt-4 border-t border-editorial-border">
              <p className="text-sm uppercase tracking-widest text-gray-400 mb-2 font-semibold">Switch Workspace Profile</p>
              <div className="grid grid-cols-2 gap-2 bg-editorial-aside rounded-none p-1 border border-editorial-border">
                <button
                  onClick={() => {
                    setActiveView("customer");
                    setMobileMenuOpen(false);
                  }}
                  className={`py-2 px-3 rounded-none text-center text-xs font-bold uppercase tracking-wider transition ${
                    activeView === "customer"
                      ? "bg-editorial-accent text-white"
                      : "text-gray-500 hover:text-editorial-text"
                  }`}
                >
                  Customer View
                </button>
                <button
                  onClick={() => {
                    setActiveView("admin");
                    setMobileMenuOpen(false);
                  }}
                  className={`py-2 px-3 rounded-none text-center text-xs font-bold uppercase tracking-wider transition ${
                    activeView === "admin"
                      ? "bg-editorial-accent text-white"
                      : "text-gray-500 hover:text-editorial-text"
                  }`}
                >
                  Admin Panel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </nav>
    {/* Embedded Curator Auth Modal */}
    <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};
