'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  Droplets, 
  ShieldAlert, 
  Scissors, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Phone, 
  ArrowRight,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

interface ProfessionalServicesProps {
  onOpenBookingModal?: () => void;
}

export const ProfessionalServices: React.FC<ProfessionalServicesProps> = ({ onOpenBookingModal }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'washing' | 'restoration' | 'protection'>('all');

  const services = [
    {
      id: 'submersion-wash',
      category: 'washing',
      title: 'Traditional Hand Submersion Rug Washing',
      subtitle: 'Complete organic deep-immersion bath for wool, silk & antique fibers',
      description: 'Unlike commercial dry cleaners or harsh spin machines that strip sheep lanolin, our Persian submersion bath immerses fine rugs in cold water using organic, pH-neutral soaps. Every fiber is cleansed from back-warp to top-pile.',
      features: [
        '100% Organic & Chemical-Free',
        'Cold-water submersion protects natural lanolin oils',
        'Gentle hand-scrubbing with horsehair brushes',
        'Temperature-controlled air-dry gallery'
      ],
      image: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&q=80&w=800',
      tag: 'Most Requested',
      slug: 'rug-cleaning-alexandria-va'
    },
    {
      id: 'pet-odor-removal',
      category: 'washing',
      title: 'Pet Urine, Stain & Deep Odor Elimination',
      subtitle: 'Full submersion enzyme baths neutralize crystallized uric salts permanently',
      description: 'Pet urine penetrates deep into the foundation fibers, crystallizing and permanently attracting moths. Our proprietary enzymatic submersion bath breaks down acid salts without bleeding organic vegetable dyes.',
      features: [
        'Complete uric salt crystal breakdown',
        'Guaranteed zero residual chemical smell',
        'Safe for antique vegetable & madder root dyes',
        'Sanitizing moth repellent finish'
      ],
      image: 'https://images.unsplash.com/photo-1543248939-ff40856f65d4?auto=format&fit=crop&q=80&w=800',
      tag: 'Specialized Treatment',
      slug: 'pet-stain-odor-removal'
    },
    {
      id: 'fringe-selvedge-repair',
      category: 'restoration',
      title: 'Master Fringe & Selvedge Border Restoration',
      subtitle: 'Hand-tying original warps and hand-surging side cords to stop unraveling',
      description: 'Loose fringes and worn edges threaten the integrity of hand-knotted rugs. Our master weavers hand-sew and secure existing warp threads, or re-weave new matching cotton or silk fringes directly into the rug foundation.',
      features: [
        'Hand-tying antique warps to stop knot loss',
        'Custom edge binding & hand-surging',
        'Matching period-accurate spun threads',
        'Reinforced protective end-stops'
      ],
      image: 'https://images.unsplash.com/photo-1594040226829-7f251ab46d80?auto=format&fit=crop&q=80&w=800',
      tag: 'Artisan Craft',
      slug: 'fringe-binding-edge-repair'
    },
    {
      id: 'reweaving-hole-repair',
      category: 'restoration',
      title: 'Antique Reweaving & Foundation Repair',
      subtitle: 'Restoring dry rot, moth eaten areas, burns, and holes knot-by-knot',
      description: 'Experienced master artisans recreate missing foundation warps and hand-knot matching yarn to make past damage virtually undetectable, safeguarding your family heirloom for generations.',
      features: [
        'Exact knot-density replication',
        'Authentic hand-spun wool & silk yarn matching',
        'Correction of dry rot and moth damage',
        'Increases and preserves antique resale value'
      ],
      image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=800',
      tag: 'Museum Conservation',
      slug: 'rug-restoration-alexandria-va'
    },
    {
      id: 'color-run-dye-correction',
      category: 'protection',
      title: 'Color Correction & Dye-Bleed Reversal',
      subtitle: 'Specialized treatments to reverse water damage and cross-dye migration',
      description: 'Improper washing or flooding causes dark dyes to bleed into white and ivory fields. Our color restoration lab uses gentle stripping baths and natural mineral pigments to restore sharp contrast.',
      features: [
        'Reverses dye bleed from spills or water leaks',
        'Safe removal of dark pigment from ivory borders',
        'Color blending for sun-faded pile',
        'Restores original crisp pattern boundaries'
      ],
      image: 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&q=80&w=800',
      tag: 'Laboratory Grade',
      slug: 'color-correction-dye-bleed'
    },
    {
      id: 'moth-protection-custom-pads',
      category: 'protection',
      title: 'Botanical Moth Guard & Custom Luxury Pads',
      subtitle: 'Natural anti-pest shielding and dense felt padding to protect hardwood',
      description: 'Preserve your rug from beneath. We treat wool with odorless cedar-derived botanical deterrents and custom-cut premium dual-sided rubberized felt pads to eliminate slipping and wear.',
      features: [
        'Odorless botanical moth & larvae barrier',
        'Custom-cut dual-surface dense felt pads',
        'Prevents dangerous rug slipping on hardwood',
        'Cushions footfall and prolongs pile life'
      ],
      image: 'https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?auto=format&fit=crop&q=80&w=800',
      tag: 'Essential Protection',
      slug: 'rug-pads-custom-padding'
    }
  ];

  const filteredServices = services.filter((s) => {
    if (activeTab === 'all') return true;
    return s.category === activeTab;
  });

  return (
    <section className="bg-white py-20 md:py-28 border-b border-stone-200" id="services">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Badging & Headline */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-stone-100 border border-stone-200 text-xs font-bold uppercase tracking-widest text-neutral-800">
            <Sparkles className="w-3.5 h-3.5 text-amber-800" />
            <span>Alexandria Specialty Care &amp; Restoration Facility</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-neutral-900 font-light tracking-wide leading-tight">
            Certified Fine Rug Washing &amp; Restoration
          </h2>
          <p className="text-sm sm:text-base text-neutral-600 font-light leading-relaxed">
            Crafted for Washington D.C., Northern Virginia, and Maryland families. We combine century-old Persian cold submersion methods with museum-grade textile restoration.
          </p>
        </div>

        {/* Category Filters Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-10 mb-12">
          {[
            { id: 'all', label: 'All Specialty Services' },
            { id: 'washing', label: 'Organic Hand Washing' },
            { id: 'restoration', label: 'Repair & Reweaving' },
            { id: 'protection', label: 'Stains, Odors & Padding' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'bg-stone-50 text-neutral-600 hover:bg-stone-100 hover:text-neutral-950 border border-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Services Grid (Modeled after rugwash.com layout) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredServices.map((svc) => (
            <div
              key={svc.id}
              className="bg-[#FCFBF9] border border-stone-200 overflow-hidden flex flex-col group hover:shadow-lg hover:border-amber-800/40 transition-all duration-300"
            >
              {/* Card Image with Tag */}
              <div className="relative h-56 w-full overflow-hidden bg-stone-200">
                <img
                  src={svc.image}
                  alt={svc.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute top-3 left-3 px-2.5 py-1 bg-neutral-950/85 backdrop-blur-xs text-[10px] font-bold uppercase tracking-widest text-amber-200 border border-amber-900/30">
                  {svc.tag}
                </span>
              </div>

              {/* Content Body */}
              <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="font-serif text-xl text-neutral-900 font-medium group-hover:text-amber-900 transition-colors">
                    {svc.title}
                  </h3>
                  <p className="text-xs text-amber-800 font-medium tracking-wide italic">
                    {svc.subtitle}
                  </p>
                  <p className="text-xs sm:text-sm text-neutral-600 font-light leading-relaxed pt-1">
                    {svc.description}
                  </p>
                </div>

                {/* Features list */}
                <div className="pt-4 border-t border-stone-200 space-y-2">
                  {svc.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-neutral-700 font-light">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 mt-0.5 flex-shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                {/* Action CTA */}
                <div className="pt-4 border-t border-stone-200 flex items-center justify-between gap-3">
                  <Link
                    href={`/services/${svc.slug}`}
                    className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-neutral-800 hover:text-amber-800 transition"
                  >
                    <span>Read Details</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  {onOpenBookingModal && (
                    <button
                      onClick={onOpenBookingModal}
                      className="px-3.5 py-1.5 bg-amber-800 hover:bg-neutral-900 text-white text-[11px] font-bold uppercase tracking-wider transition cursor-pointer"
                    >
                      Book Care
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Guarantee Banner (Rugwash inspired trust banner) */}
        <div className="mt-16 bg-[#161616] text-white p-8 sm:p-12 border border-neutral-800 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-2 text-center lg:text-left">
            <span className="text-xs uppercase tracking-[0.25em] text-amber-400 font-bold block">
              100% Satisfaction &amp; Preservation Guarantee
            </span>
            <h3 className="font-serif text-2xl sm:text-3xl font-light tracking-wide text-white">
              Complimentary White-Glove Pickup &amp; Delivery Across D.C. Metro
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 font-light max-w-2xl">
              We provide scheduled collection and drop-off throughout Alexandria, Arlington, Fairfax, Georgetown, Bethesda, and Potomac. Your carpets are fully insured from pickup to placement.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 flex-shrink-0">
            <a
              href="tel:+17034610207"
              className="px-6 py-3.5 bg-stone-900 hover:bg-stone-800 border border-neutral-700 text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition"
            >
              <Phone className="w-3.5 h-3.5 text-amber-400" />
              <span>Call (703) 461-0207</span>
            </a>

            {onOpenBookingModal && (
              <button
                onClick={onOpenBookingModal}
                className="px-7 py-3.5 bg-amber-800 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-widest shadow-md transition cursor-pointer"
              >
                Schedule Rug Pickup
              </button>
            )}
          </div>
        </div>

      </div>
    </section>
  );
};
