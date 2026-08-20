import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Phone, CalendarCheck } from 'lucide-react';

interface ServicePageLayoutProps {
  title: string;
  subtitle: string;
  heroImage?: string;
  children: React.ReactNode;
}

export default function ServicePageLayout({ title, subtitle, heroImage, children }: ServicePageLayoutProps) {
  return (
    <div className="min-h-screen bg-stone-50 text-editorial-text selection:bg-editorial-accent/20">
      
      {/* Hero Section */}
      <div className="relative w-full h-[40vh] md:h-[50vh] bg-neutral-900 flex items-center justify-center overflow-hidden">
        {heroImage && (
          <div 
            className="absolute inset-0 opacity-40 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />
        
        <div className="relative z-10 text-center max-w-4xl px-4 animate-fadeIn mt-16">
          <Link href="/" className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-amber-500 hover:text-amber-400 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Showroom
          </Link>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white mb-4 leading-tight">
            {title}
          </h1>
          <p className="text-lg md:text-xl text-neutral-300 font-light max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          
          <div className="lg:col-span-2 space-y-12">
            {children}
          </div>

          {/* Sticky Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white p-8 shadow-sm border border-neutral-100 rounded-sm">
              <h3 className="font-serif text-2xl mb-4 text-editorial-text">Request an Estimate</h3>
              <p className="text-sm text-neutral-500 leading-relaxed font-light mb-8">
                Ready to restore your rug's natural beauty? Our master artisans are available for private consultations. Pickup and delivery may be available in the Alexandria, VA area.
              </p>
              
              <div className="space-y-4">
                <Link href="/services/estimate" className="flex items-center justify-center w-full bg-editorial-accent text-white font-bold py-4 px-6 uppercase tracking-widest text-xs hover:bg-neutral-800 transition-colors">
                  <CalendarCheck className="w-4 h-4 mr-2" />
                  Request Estimate
                </Link>
                
                <a href="tel:+17034610207" className="flex items-center justify-center w-full border border-neutral-200 text-editorial-text font-bold py-4 px-6 uppercase tracking-widest text-xs hover:bg-neutral-50 transition-colors">
                  <Phone className="w-4 h-4 mr-2 text-editorial-accent" />
                  +1 (703) 461-0207
                </a>
              </div>
              
              <div className="mt-8 pt-8 border-t border-neutral-100">
                <h4 className="uppercase tracking-[0.2em] text-xs text-editorial-text font-bold mb-4">Our Service Area</h4>
                <p className="text-xs text-neutral-500 leading-relaxed font-light">
                  Marco Polo Oriental Rugs proudly serves Alexandria, Arlington, Fairfax, and the greater Washington, D.C. metropolitan area.
                </p>
                <p className="text-xs text-neutral-500 leading-relaxed font-light mt-4 font-mono">
                  3260 Duke St<br />
                  Alexandria, VA 22314
                </p>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
