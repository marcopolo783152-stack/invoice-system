/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { useStore } from "@/context/StoreContext";
import { 
  Award, 
  Sparkles, 
  ShieldCheck, 
  Calendar, 
  ChevronRight, 
  Star, 
  Scissors, 
  Heart, 
  Compass, 
  Truck, 
  CheckCircle,
  Clock,
  MapPin,
  X,
  Download,
  Printer
} from "lucide-react";
import { motion } from "motion/react";

interface HeroProps {
  setCurrentTab: (tab: string) => void;
  onSelectRugId: (id: string | null) => void;
}

export const Hero: React.FC<HeroProps> = ({ setCurrentTab, onSelectRugId }) => {
  const { rugs, reviews, sendChatMessage, addCleaningBooking, currentUser, heroCoverPhotos } = useStore();
  const [activeSlide, setActiveSlide] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  
  // Cleaning service booking states
  const [cleaningModalOpen, setCleaningModalOpen] = useState(false);
  const [cleaningFormSubmitted, setCleaningFormSubmitted] = useState(false);
  const [cleaningReceiptData, setCleaningReceiptData] = useState<any>(null);
  const [cleaningService, setCleaningService] = useState("Organic Deep Wash");
  
  const [cleaningName, setCleaningName] = useState("");
  const [cleaningEmail, setCleaningEmail] = useState("");
  const [cleaningPhone, setCleaningPhone] = useState("");
  const [cleaningAddress, setCleaningAddress] = useState("");
  const [cleaningOption, setCleaningOption] = useState<"Drop-off" | "Pickup">("Pickup");
  const [pickupFee, setPickupFee] = useState(35); // standard $35 pickup fee, user chose around 20-50
  const [cleaningPreferredDate, setCleaningPreferredDate] = useState("2026-07-01");
  const [cleaningPreferredTime, setCleaningPreferredTime] = useState("10:00");
  
  // Custom Dimension Sizing States
  const [dimensionUnit, setDimensionUnit] = useState<"Feet & Inches" | "Total Inches" | "Meters (M)">("Feet & Inches");
  
  // Feet & Inches inputs (e.g. 8'3 x 10'1)
  const [wFeet, setWFeet] = useState<number>(8);
  const [wInches, setWInches] = useState<number>(3);
  const [lFeet, setLFeet] = useState<number>(10);
  const [lInches, setLInches] = useState<number>(1);
  
  // Total Inches inputs
  const [wTotalInches, setWTotalInches] = useState<number>(99);
  const [lTotalInches, setLTotalInches] = useState<number>(121);

  // Meters inputs
  const [wMeters, setWMeters] = useState<number>(2.5);
  const [lMeters, setLMeters] = useState<number>(3.0);

  // Dynamic calculations for manual inputs
  let calculatedWidth = 8;
  let calculatedLength = 10;
  let areaSqft = 80;
  let sizeDescription = "";

  if (dimensionUnit === "Feet & Inches") {
    calculatedWidth = Number(wFeet) + Number(wInches) / 12;
    calculatedLength = Number(lFeet) + Number(lInches) / 12;
    areaSqft = calculatedWidth * calculatedLength;
    sizeDescription = `${wFeet}'${wInches}" × ${lFeet}'${lInches}"`;
  } else if (dimensionUnit === "Total Inches") {
    calculatedWidth = Number(wTotalInches) / 12;
    calculatedLength = Number(lTotalInches) / 12;
    areaSqft = calculatedWidth * calculatedLength;
    sizeDescription = `${wTotalInches}" × ${lTotalInches}" (${Math.floor(wTotalInches / 12)}'${wTotalInches % 12}" × ${Math.floor(lTotalInches / 12)}'${lTotalInches % 12}")`;
  } else if (dimensionUnit === "Meters (M)") {
    // 1 meter = 3.28084 feet
    calculatedWidth = Number(wMeters) * 3.28084;
    calculatedLength = Number(lMeters) * 3.28084;
    areaSqft = calculatedWidth * calculatedLength;
    sizeDescription = `${wMeters} m × ${lMeters} m`;
  }

  const finalAreaSqft = Math.round(areaSqft * 100) / 100;
  const washPrice = Math.round(finalAreaSqft * 5 * 100) / 100;
  const finalTotal = washPrice + (cleaningOption === "Pickup" ? pickupFee : 0);

  // Filter rugs for carousel or featured sections
  const featuredRugs = rugs.filter(r => r.id === "rug-1" || r.id === "rug-3" || r.id === "rug-5");
  const bestSellers = rugs.filter(r => r.price > 5000).slice(0, 3);
  const newArrivals = rugs.filter(r => r.id === "rug-4" || r.id === "rug-6");

  // Approved reviews for home
  const approvedReviews = reviews.filter(rev => rev.isApproved);

  const slides = [
    {
      title: "Imperial Hand-Knotted Treasures",
      subtitle: "Persian, Afghan & Turkish Masterpieces",
      desc: "Each rug is an investment-grade work of art, hand-knotted with premium organic-dyed highland wool and silk. Curated with museum-grade certification.",
      image: heroCoverPhotos?.[0] || "",
      cta: "Explore Fine Rugs"
    },
    {
      title: "The Ultimate Silk Harmony",
      subtitle: "Exquisite Isfahan Tree of Life Series",
      desc: "Experience 1,000,000+ knots per square meter. Luminous natural silk pile reflecting majestic shades under ambient home lights.",
      image: heroCoverPhotos?.[1] || "",
      cta: "View Luminous Silk"
    },
    {
      title: "Generations of Handwoven Craft",
      subtitle: "Curated Antique & Modern Rug Collections",
      desc: "Bridging ancient Mesopotamian symbols with contemporary palettes, made for luxury villas and upscale urban designs.",
      image: heroCoverPhotos?.[2] || "",
      cta: "Shop The Curation"
    }
  ];

  const handleDownloadReceipt = (booking: any) => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      doc.setFillColor(248, 246, 242);
      doc.rect(0, 0, 210, 297, "F");
      
      doc.setDrawColor(220, 210, 200);
      doc.setLineWidth(0.4);
      doc.rect(8, 8, 194, 281, "S");

      doc.setFillColor(45, 42, 38);
      doc.rect(8, 8, 194, 35, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.text("MARCO POLO", 105, 22, { align: "center" });

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(215, 195, 175);
      doc.text("EXOTIC ORIENTAL RUGS & TAPESTRIES  •  CLEANING RECEIPT", 105, 30, { align: "center" });

      doc.setTextColor(60, 55, 50);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.text("SERVICE RECEIPT", 20, 60);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Booking ID: ${booking.id}`, 20, 70);
      doc.text(`Date: ${new Date(booking.createdAt).toLocaleDateString()}`, 20, 76);
      doc.text(`Patron: ${booking.fullName}`, 20, 82);
      doc.text(`Email: ${booking.email}`, 20, 88);
      doc.text(`Service: ${booking.serviceOption} - ${booking.sizeDescription}`, 20, 94);
      
      doc.text(`Cleaning Fee: $${booking.cleaningFee.toFixed(2)}`, 20, 104);
      doc.text(`Pickup/Delivery: $${booking.pickupFee.toFixed(2)}`, 20, 110);
      
      doc.setFont("Helvetica", "bold");
      doc.text(`Estimated Total: $${booking.totalPrice.toFixed(2)}`, 20, 120);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Presented by Marco Polo Luxury Imports.", 20, 275);

      doc.save(`Cleaning-Receipt-${booking.id}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    }
  };

  const handleBookCleaning = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalPickupFee = cleaningOption === "Pickup" ? pickupFee : 0;

    const booking = addCleaningBooking({
      fullName: cleaningName,
      email: cleaningEmail,
      phone: cleaningPhone,
      address: cleaningOption === "Pickup" ? cleaningAddress : "Self Drop-off Showroom",
      sizeDescription,
      width: dimensionUnit === "Feet & Inches" ? wFeet : dimensionUnit === "Total Inches" ? wTotalInches : wMeters,
      length: dimensionUnit === "Feet & Inches" ? lFeet : dimensionUnit === "Total Inches" ? lTotalInches : lMeters,
      widthInches: dimensionUnit === "Feet & Inches" ? wInches : undefined,
      lengthInches: dimensionUnit === "Feet & Inches" ? lInches : undefined,
      dimensionUnit,
      areaSqft: finalAreaSqft,
      serviceOption: cleaningOption,
      pickupFee: finalPickupFee,
      cleaningFee: washPrice,
      totalPrice: finalTotal,
      preferredDate: cleaningPreferredDate,
      preferredTime: cleaningPreferredTime
    });

    setCleaningReceiptData(booking);
    setCleaningFormSubmitted(true);
    
    sendChatMessage(
      `Hello! I just booked a specialty "${cleaningService}" for my ${sizeDescription} rug. Full Name: ${cleaningName}, Option: ${cleaningOption === "Pickup" ? `Concierge Pickup at ${cleaningPreferredTime}` : "Self Drop-off"}. Estimated Quote: $${finalTotal.toFixed(2)}. Please confirm receipt! My booking ID is ${booking.id}.`, 
      "customer"
    );
  };

  return (
    <div className="bg-editorial-bg text-editorial-text font-sans">
      
      {/* 1. Luxury Carousel Hero Slider */}
      <section className="relative h-[85vh] sm:h-[75vh] md:h-[80vh] bg-neutral-950 overflow-hidden">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
              index === activeSlide ? "opacity-100 scale-100" : "opacity-0 scale-105 pointer-events-none"
            }`}
          >
            {/* Dark vignette overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/90 via-neutral-950/60 to-transparent z-10" />
            <img
              src={slide.image || "https://images.unsplash.com/photo-1594040226829-7f251ab46d80?auto=format&fit=crop&q=80&w=2000"}
              alt={slide.title}
              className="absolute inset-0 w-full h-full object-cover object-center opacity-65"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1594040226829-7f251ab46d80?auto=format&fit=crop&q=80&w=2000";
              }}
            />
            
            {/* Text Overlay Box */}
            <div className="absolute inset-0 z-20 flex items-center">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="max-w-xl md:max-w-2xl text-left text-white space-y-4 sm:space-y-6">
                  
                  {/* Subtle Top Accent */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-editorial-accent/20 border border-editorial-accent/35 rounded-none">
                    <Sparkles className="h-3 w-3 text-editorial-accent animate-spin" />
                    <span className="text-xs font-semibold tracking-[0.25em] text-[#F4F1EE] uppercase">
                      Heritage Weaving
                    </span>
                  </div>

                  <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl tracking-wide leading-tight font-light text-white">
                    {slide.title}
                  </h1>
                  
                  <p className="font-serif text-lg sm:text-xl text-[#F4F1EE] italic font-light">
                    {slide.subtitle}
                  </p>
                  
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-light">
                    {slide.desc}
                  </p>

                  <div className="pt-4 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => setCurrentTab("shop")}
                      className="px-8 py-3.5 bg-editorial-accent hover:bg-[#8E7453] text-white font-bold uppercase tracking-widest text-xs rounded-none transition-all duration-300 shadow-sm"
                    >
                      Shop Rugs
                    </button>
                    <button
                      onClick={() => setCurrentTab("track")}
                      className="px-8 py-3.5 bg-transparent hover:bg-white/10 text-white border border-white/40 font-bold uppercase tracking-widest text-xs rounded-none transition-all duration-300"
                    >
                      Track Order
                    </button>
                    <button
                      onClick={() => {
                        setCleaningService("Organic Deep Wash");
                        setCleaningModalOpen(true);
                      }}
                      className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-[#F4F1EE] border border-white/20 font-bold uppercase tracking-widest text-xs rounded-none transition-all duration-300"
                    >
                      Cleaning Service
                    </button>
                  </div>

                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Carousel indicators */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 flex space-x-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveSlide(i)}
              className={`h-1.5 transition-all duration-300 ${
                i === activeSlide ? "w-8 bg-editorial-accent" : "w-2 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      </section>

      {/* 2. Family Heritage & Store Introduction */}
      <section className="py-16 md:py-24 bg-white border-b border-editorial-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left side text */}
            <div className="lg:col-span-7 space-y-6">
              <span className="text-xs uppercase tracking-[0.3em] text-editorial-accent font-semibold block">
                Family Curators Since 1978
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-editorial-text tracking-wide font-light leading-tight">
                Cyrus & Marco Polo’s <br/>
                <span className="text-editorial-accent italic font-normal">Heirloom Hand-Knotted Curation</span>
              </h2>
              
              <div className="h-[1px] w-20 bg-editorial-accent" />
              
              <p className="text-sm text-gray-500 leading-relaxed font-light">
                At Marco Polo Oriental Rugs, we specialize in curating investment-grade, ancient rugs of legendary beauty. Every single Persian, Afghan, Turkish, and Caucasian rug in our showroom is selected by hand, stitch by stitch. 
              </p>
              
              <p className="text-sm text-gray-500 leading-relaxed font-light">
                Authentic oriental rugs are more than decorative layouts—they are high-resolution manuscripts of ancestral cultures, reflecting the lives, songs, and geographic surroundings of nomadic and village master weavers. With vegetable-dyed lanolin wool and pure silk foundations, our selection delivers a sensory touch, visual depth, and durability that modern machinery simply cannot replicate.
              </p>

              {/* Grid indicators */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-editorial-aside rounded-none text-editorial-accent border border-editorial-border mt-0.5">
                    <Award className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-editorial-text uppercase tracking-widest">100% Certified</h4>
                    <p className="text-xs text-gray-400 font-light mt-0.5">Guaranteed origin & authentic vintage age.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-editorial-aside rounded-none text-editorial-accent border border-editorial-border mt-0.5">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-editorial-text uppercase tracking-widest">Secure Escrow</h4>
                    <p className="text-xs text-gray-400 font-light mt-0.5">Full payment escrow and manual approval.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 col-span-2 md:col-span-1">
                  <div className="p-2 bg-editorial-aside rounded-none text-editorial-accent border border-editorial-border mt-0.5">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-editorial-text uppercase tracking-widest">White-Glove</h4>
                    <p className="text-xs text-gray-400 font-light mt-0.5">Free, fully insured premium freight shipping.</p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => setCurrentTab("shop")}
                  className="inline-flex items-center gap-2 group text-xs uppercase tracking-widest font-bold text-editorial-accent hover:text-editorial-text transition-colors duration-200"
                >
                  <span>Browse Our Fine Weaves</span>
                  <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-all" />
                </button>
              </div>

            </div>

            {/* Right side images stacked */}
            <div className="lg:col-span-5 relative">
              <div className="relative z-10 rounded-none overflow-hidden border-4 border-white shadow-xl bg-editorial-aside">
                <img
                  src="https://images.unsplash.com/photo-1594040226829-7f251ab46d80?auto=format&fit=crop&q=80&w=800"
                  alt="Fine weaving close up"
                  className="w-full h-80 object-cover object-center"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 z-20 w-1/2 rounded-none overflow-hidden border-4 border-white shadow-xl hidden sm:block bg-editorial-aside">
                <img
                  src="https://images.unsplash.com/photo-1562577309-4932fdd64cd1?auto=format&fit=crop&q=80&w=800"
                  alt="Nomad dyeing"
                  className="w-full h-44 object-cover object-center"
                  referrerPolicy="no-referrer"
                />
              </div>
              {/* Pattern graphic accent */}
              <div className="absolute -top-6 -right-6 w-36 h-36 bg-[radial-gradient(#A68B67_1px,transparent_1px)] [background-size:16px_16px] opacity-15 z-0" />
            </div>

          </div>
        </div>
      </section>

      {/* 3. Featured Rugs Section (Bento Grid) */}
      <section className="py-16 md:py-24 bg-editorial-aside">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          
          <div className="max-w-xl mx-auto space-y-3">
            <span className="text-xs uppercase tracking-[0.3em] text-editorial-accent font-semibold">Exquisite Masterpieces</span>
            <h2 className="font-serif text-3xl sm:text-4xl text-editorial-text font-light tracking-wide">Featured Collections</h2>
            <div className="h-[1px] w-12 bg-editorial-accent mx-auto my-2" />
            <p className="text-xs text-gray-500 font-light">Explore handpicked Persian, Turkish, and tribal rugs chosen for their historic rarity, majestic sheen, and pristine condition.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredRugs.map((rug) => (
              <div
                key={rug.id}
                onClick={() => {
                  onSelectRugId(rug.id);
                  setCurrentTab("shop");
                }}
                className="group relative bg-white rounded-none overflow-hidden shadow-sm border border-editorial-border cursor-pointer transition hover:-translate-y-1 hover:shadow-md duration-300"
              >
                {/* Image panel */}
                <div className="h-64 relative overflow-hidden bg-[#F4F1EE]">
                  <img
                    src={rug.images?.[0] || "https://images.unsplash.com/photo-1594040226829-7f251ab46d80?auto=format&fit=crop&q=80&w=800"}
                    alt={rug.name}
                    className="w-full h-full object-cover group-hover:scale-102 transition-all duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 left-3 px-3 py-1 bg-editorial-text/90 backdrop-blur-sm text-sm text-white tracking-widest font-bold uppercase rounded-none">
                    {rug.origin}
                  </div>
                  <div className="absolute top-3 right-3 px-3 py-1 bg-editorial-accent text-white text-sm tracking-widest font-bold uppercase rounded-none">
                    {rug.style}
                  </div>
                </div>

                {/* Info panel */}
                <div className="p-6 text-left space-y-2">
                  <div className="flex items-center gap-1.5 text-editorial-accent">
                    <Star className="h-3 w-3 fill-editorial-accent" />
                    <span className="text-sm font-bold text-editorial-text">{rug.rating.toFixed(1)}</span>
                    <span className="text-xs text-gray-400">| Certified Origin</span>
                  </div>
                  <h3 className="font-serif text-lg font-light text-editorial-text group-hover:text-editorial-accent transition-colors truncate">
                    {rug.name}
                  </h3>
                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed font-light">
                    {rug.description}
                  </p>
                  
                  <div className="pt-4 border-t border-editorial-border flex items-center justify-between">
                    <div>
                      <span className="block text-sm uppercase text-gray-400 font-semibold tracking-wider">Luxury Curation</span>
                      <div className="flex items-center gap-2">
                        {rug.originalPrice && rug.originalPrice > rug.price && (
                          <span className="text-sm text-gray-400 line-through">${rug.originalPrice.toLocaleString()}</span>
                        )}
                        <span className="text-base font-serif font-light text-editorial-text">${rug.price.toLocaleString()}</span>
                      </div>
                    </div>
                    <span className="text-xs uppercase tracking-widest font-bold text-editorial-accent group-hover:translate-x-1 transition-all inline-flex items-center gap-1">
                      <span>View details</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 4. Best Sellers (With subtle details) */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-[0.3em] text-editorial-accent font-semibold block">Elite Investments</span>
              <h2 className="font-serif text-3xl sm:text-4xl text-editorial-text font-light tracking-wide">Showroom Best Sellers</h2>
              <p className="text-xs text-gray-500 font-light">Our highest-rated, dense weave rugs representing authentic family collections.</p>
            </div>
            <button
              onClick={() => setCurrentTab("shop")}
              className="px-6 py-3 border border-editorial-border hover:border-editorial-accent hover:text-editorial-accent text-editorial-text text-xs font-bold uppercase tracking-widest rounded-none transition duration-200"
            >
              View Full Collection
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {bestSellers.map((rug) => (
              <div
                key={rug.id}
                onClick={() => {
                  onSelectRugId(rug.id);
                  setCurrentTab("shop");
                }}
                className="group cursor-pointer bg-[#F9F7F5] rounded-none overflow-hidden border border-editorial-border transition hover:shadow-md duration-300"
              >
                <div className="h-72 bg-[#F4F1EE] overflow-hidden relative">
                  <img
                    src={rug.images?.[0] || "https://images.unsplash.com/photo-1594040226829-7f251ab46d80?auto=format&fit=crop&q=80&w=800"}
                    alt={rug.name}
                    className="w-full h-full object-cover object-center group-hover:scale-102 transition duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-neutral-950/10 group-hover:opacity-0 transition duration-300" />
                </div>
                <div className="p-6 space-y-3">
                  <div className="text-sm font-mono text-gray-400 uppercase tracking-widest flex items-center justify-between">
                    <span>SKU: {rug.sku}</span>
                    <span className="text-editorial-accent font-semibold">{rug.dimensions}</span>
                  </div>
                  <h3 className="font-serif text-base font-light text-editorial-text group-hover:text-editorial-accent transition truncate">
                    {rug.name}
                  </h3>
                  <div className="flex items-center justify-between pt-2 border-t border-editorial-border">
                    <span className="text-xs text-gray-400 font-light">{rug.material}</span>
                    <div className="flex items-center gap-2">
                      {rug.originalPrice && rug.originalPrice > rug.price && (
                        <span className="text-sm text-gray-400 line-through">${rug.originalPrice.toLocaleString()}</span>
                      )}
                      <span className="font-serif text-lg font-light text-editorial-text">${rug.price.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Rug Cleaning & Repair Service Section */}
      <section className="py-16 md:py-24 bg-neutral-950 text-white relative overflow-hidden">
        {/* Subtle patterned rug texture background */}
        <div className="absolute inset-0 bg-[radial-gradient(#A68B67_0.5px,transparent_0.5px)] [background-size:24px_24px] opacity-15 z-0" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left side info cards */}
            <div className="lg:col-span-7 space-y-6">
              <span className="text-xs uppercase tracking-[0.3em] text-editorial-accent font-semibold block">
                Marco Polo Specialty Lab
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-white font-light tracking-wide leading-tight">
                Fine Rug Wash, Restoration <br/>
                <span className="text-editorial-accent italic font-normal">& Fringe Repair Services</span>
              </h2>
              <div className="h-[1px] w-20 bg-editorial-accent" />
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed font-light">
                Handmade organic rugs demand unique maintenance. Traditional machine beating and industrial laundry dry-cleaning use harsh chemical solvents that completely strip the sheep's natural lanolin oils, leaving wool brittle and vulnerable. Our showroom maintains a state-of-the-art restoration lab using century-old Persian cold-submersion scrubbing techniques.
              </p>

              {/* Grid services */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div className="p-4 bg-neutral-900/60 border border-neutral-850 rounded-none space-y-2">
                  <div className="flex items-center gap-2 text-editorial-accent font-bold">
                    <Scissors className="h-3.5 w-3.5" />
                    <span className="text-xs uppercase tracking-widest">Master Fringe Restoration</span>
                  </div>
                  <p className="text-xs text-gray-400 font-light">Rebuilding unraveling side selvedges and tying original silk or cotton warp fringes by hand.</p>
                </div>
                
                <div className="p-4 bg-neutral-900/60 border border-neutral-850 rounded-none space-y-2">
                  <div className="flex items-center gap-2 text-editorial-accent font-bold">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="text-xs uppercase tracking-widest">Organic Hand Wash</span>
                  </div>
                  <p className="text-xs text-gray-400 font-light">Submerging the rug fully in clean, cold running mountain-temperature water with pH-neutral organic soaps.</p>
                </div>
                
                <div className="p-4 bg-neutral-900/60 border border-neutral-850 rounded-none space-y-2">
                  <div className="flex items-center gap-2 text-editorial-accent font-bold">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-xs uppercase tracking-widest">Moth & Odor Shielding</span>
                  </div>
                  <p className="text-xs text-gray-400 font-light">Using deep botanical washes that harmlessly repel pests while restoring natural wool fiber spring and luster.</p>
                </div>
                
                <div className="p-4 bg-neutral-900/60 border border-neutral-850 rounded-none space-y-2">
                  <div className="flex items-center gap-2 text-editorial-accent font-bold">
                    <Heart className="h-3.5 w-3.5" />
                    <span className="text-xs uppercase tracking-widest">Distressing & Color Blending</span>
                  </div>
                  <p className="text-xs text-gray-400 font-light">Specialized dye correction for pet urine stains or sunlight fading using natural mountain pigments.</p>
                </div>
              </div>
            </div>

            {/* Right side booking form widget */}
            <div className="lg:col-span-5 bg-[#161616] p-6 sm:p-8 rounded-none border border-neutral-800 shadow-xl relative text-left">
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h3 className="font-serif text-lg font-light text-editorial-accent uppercase tracking-wide">Schedule Specialty Care</h3>
                  <p className="text-xs text-gray-400 font-light">Certified Persian submersion washing & expert repairs.</p>
                </div>

                <form onSubmit={handleBookCleaning} className="space-y-3.5 text-xs font-sans">
                  {/* Contact details */}
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={cleaningName}
                        onChange={(e) => setCleaningName(e.target.value)}
                        placeholder="e.g. Victoria Sterling"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-none py-2 px-3 text-neutral-200 outline-none focus:border-editorial-accent"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm mb-1">Email Address *</label>
                        <input
                          type="email"
                          required
                          value={cleaningEmail}
                          onChange={(e) => setCleaningEmail(e.target.value)}
                          placeholder="patron@example.com"
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-none py-2 px-3 text-neutral-200 outline-none focus:border-editorial-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm mb-1">Phone Number *</label>
                        <input
                          type="tel"
                          required
                          value={cleaningPhone}
                          onChange={(e) => setCleaningPhone(e.target.value)}
                          placeholder="+1 (555) 789-1002"
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-none py-2 px-3 text-neutral-200 outline-none focus:border-editorial-accent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sizing calculator controls */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm mb-1">Dimension Units *</label>
                      <select
                        value={dimensionUnit}
                        onChange={(e) => setDimensionUnit(e.target.value as any)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-none py-2 px-3 text-neutral-200 outline-none focus:border-editorial-accent text-sm"
                      >
                        <option value="Feet & Inches">Feet & Inches (e.g., 8'3" x 10'1")</option>
                        <option value="Total Inches">Total Inches only (e.g., 99" x 121")</option>
                        <option value="Meters (M)">Meters (M) (e.g., 2.5 m x 3.0 m)</option>
                      </select>
                    </div>

                    {dimensionUnit === "Feet & Inches" && (
                      <div className="grid grid-cols-4 gap-2 text-center items-center">
                        <div>
                          <label className="block text-gray-500 text-xs uppercase font-semibold mb-0.5">Width Ft</label>
                          <input
                            type="number"
                            min={0}
                            required
                            value={wFeet}
                            onChange={(e) => setWFeet(Math.max(0, Number(e.target.value)))}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-none py-2 px-1 text-neutral-200 text-center outline-none focus:border-editorial-accent font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 text-xs uppercase font-semibold mb-0.5">Width In</label>
                          <input
                            type="number"
                            min={0}
                            max={11}
                            required
                            value={wInches}
                            onChange={(e) => setWInches(Math.min(11, Math.max(0, Number(e.target.value))))}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-none py-2 px-1 text-neutral-200 text-center outline-none focus:border-editorial-accent font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 text-xs uppercase font-semibold mb-0.5">Length Ft</label>
                          <input
                            type="number"
                            min={0}
                            required
                            value={lFeet}
                            onChange={(e) => setLFeet(Math.max(0, Number(e.target.value)))}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-none py-2 px-1 text-neutral-200 text-center outline-none focus:border-editorial-accent font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 text-xs uppercase font-semibold mb-0.5">Length In</label>
                          <input
                            type="number"
                            min={0}
                            max={11}
                            required
                            value={lInches}
                            onChange={(e) => setLInches(Math.min(11, Math.max(0, Number(e.target.value))))}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-none py-2 px-1 text-neutral-200 text-center outline-none focus:border-editorial-accent font-mono text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {dimensionUnit === "Total Inches" && (
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div>
                          <label className="block text-gray-500 text-xs uppercase font-semibold mb-1">Width (Inches)</label>
                          <input
                            type="number"
                            min={1}
                            required
                            value={wTotalInches}
                            onChange={(e) => setWTotalInches(Math.max(1, Number(e.target.value)))}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-none py-2 px-3 text-neutral-200 text-center outline-none focus:border-editorial-accent font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 text-xs uppercase font-semibold mb-1">Length (Inches)</label>
                          <input
                            type="number"
                            min={1}
                            required
                            value={lTotalInches}
                            onChange={(e) => setLTotalInches(Math.max(1, Number(e.target.value)))}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-none py-2 px-3 text-neutral-200 text-center outline-none focus:border-editorial-accent font-mono text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {dimensionUnit === "Meters (M)" && (
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div>
                          <label className="block text-gray-500 text-xs uppercase font-semibold mb-1">Width (Meters)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.1"
                            required
                            value={wMeters}
                            onChange={(e) => setWMeters(Math.max(0.1, Number(e.target.value)))}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-none py-2 px-3 text-neutral-200 text-center outline-none focus:border-editorial-accent font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 text-xs uppercase font-semibold mb-1">Length (Meters)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.1"
                            required
                            value={lMeters}
                            onChange={(e) => setLMeters(Math.max(0.1, Number(e.target.value)))}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-none py-2 px-3 text-neutral-200 text-center outline-none focus:border-editorial-accent font-mono text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Scheduling / Options */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm mb-1">Service Option</label>
                      <select
                        value={cleaningOption}
                        onChange={(e) => setCleaningOption(e.target.value as "Pickup" | "Drop-off")}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-none py-2 px-2 text-neutral-200 outline-none focus:border-editorial-accent text-sm"
                      >
                        <option value="Pickup">Pickup</option>
                        <option value="Drop-off">Drop-off</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm mb-1">Preferred Date</label>
                      <input
                        type="date"
                        required
                        value={cleaningPreferredDate}
                        onChange={(e) => setCleaningPreferredDate(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-none py-2 px-2 text-neutral-200 outline-none focus:border-editorial-accent text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm mb-1">Preferred Time *</label>
                      <input
                        type="time"
                        required
                        value={cleaningPreferredTime}
                        onChange={(e) => setCleaningPreferredTime(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-none py-2 px-2 text-neutral-200 outline-none focus:border-editorial-accent text-sm font-mono"
                      />
                    </div>
                  </div>

                  {cleaningOption === "Pickup" && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm mb-1">Pickup Address *</label>
                        <input
                          type="text"
                          required
                          value={cleaningAddress}
                          onChange={(e) => setCleaningAddress(e.target.value)}
                          placeholder="Street, City, ZIP Code"
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-none py-2 px-3 text-neutral-200 outline-none focus:border-editorial-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 font-semibold uppercase tracking-wider text-sm mb-1">Carriage Distance</label>
                        <select
                          value={pickupFee}
                          onChange={(e) => setPickupFee(Number(e.target.value))}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-none py-2 px-2 text-neutral-200 outline-none focus:border-editorial-accent text-sm"
                        >
                          <option value={20}>Local ($20)</option>
                          <option value={35}>Metro ($35)</option>
                          <option value={50}>Extended ($50)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Real-time Invoice preview */}
                  <div className="bg-neutral-900 p-3.5 border border-neutral-800 space-y-1.5 font-mono text-xs text-gray-400">
                    <div className="flex justify-between">
                      <span>Area:</span>
                      <span>{sizeDescription} ({finalAreaSqft.toFixed(2)} sqft)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Wash (at $5/sqft):</span>
                      <span>${washPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Carriage Service ({cleaningOption}):</span>
                      <span>${(cleaningOption === "Pickup" ? pickupFee : 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-white font-bold border-t border-neutral-800 pt-1.5 text-xs">
                      <span>Estimated Total:</span>
                      <span className="text-editorial-accent">${finalTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-editorial-accent hover:bg-[#8E7453] text-white font-bold uppercase tracking-widest text-xs rounded-none transition duration-200 cursor-pointer"
                  >
                    Submit Specialty Care Request
                  </button>
                </form>

                {cleaningFormSubmitted && cleaningReceiptData && (
                  <div className="absolute inset-0 bg-[#161616] flex flex-col items-center justify-center p-6 text-center rounded-none animate-fadeIn z-10">
                    <CheckCircle className="h-10 w-10 text-editorial-accent mb-3" />
                    <h4 className="font-serif text-lg text-white font-light uppercase tracking-wider">Request Received!</h4>
                    <p className="text-gray-400 text-xs mt-1 mb-4">
                      Booking ID: <span className="font-mono text-white font-bold">{cleaningReceiptData.id}</span>
                    </p>

                    <div className="bg-[#212121] border border-[#313131] p-3 max-w-sm w-full text-left mb-6">
                      <p className="text-editorial-accent text-sm font-bold uppercase tracking-wider mb-1">Deposit Policy</p>
                      <p className="text-gray-400 text-xs">
                        A <strong>50% deposit (${(cleaningReceiptData.totalPrice / 2).toFixed(2)})</strong> is required upon {cleaningReceiptData.serviceOption === "Pickup" ? "pickup" : "drop-off"}. The balance is due upon return.
                      </p>
                    </div>
                    
                    <div className="flex gap-2 w-full max-w-sm">
                      <button
                        onClick={() => handleDownloadReceipt(cleaningReceiptData)}
                        className="flex-1 py-2 bg-editorial-accent hover:bg-[#8E7453] text-white font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Download className="h-3 w-3" /> Save PDF
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="flex-1 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-1.5 transition cursor-pointer border border-[#444]"
                      >
                        <Printer className="h-3 w-3" /> Print
                      </button>
                    </div>

                    <button
                      onClick={() => setCleaningFormSubmitted(false)}
                      className="mt-6 text-xs text-gray-500 hover:text-white underline uppercase tracking-wider font-bold transition cursor-pointer"
                    >
                      Start New Request
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. Customer Reviews Board (Fully Responsive) */}
      <section className="py-16 md:py-24 bg-editorial-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3">
            <span className="text-xs uppercase tracking-[0.3em] text-editorial-accent font-semibold block">Verified Collectors</span>
            <h2 className="font-serif text-3xl sm:text-4xl text-editorial-text font-light tracking-wide">Showroom Testimonials</h2>
            <p className="text-xs text-gray-500 max-w-xl mx-auto font-light">Real experiences from discerning interior designers and private families who trust our hand-knotted curation.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {approvedReviews.map((rev) => {
              const r = rugs.find(rug => rug.id === rev.rugId);
              return (
                <div
                  key={rev.id}
                  className="bg-white p-8 rounded-none border border-editorial-border shadow-sm hover:shadow-md transition duration-300 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Stars */}
                    <div className="flex items-center gap-1 text-editorial-accent">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < rev.rating ? "fill-editorial-accent" : "text-gray-200"
                          }`}
                        />
                      ))}
                    </div>

                    <p className="text-sm text-gray-600 leading-relaxed italic font-light">
                      "{rev.reviewText}"
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-editorial-border">
                    <div>
                      <h4 className="font-serif font-medium text-editorial-text text-sm">{rev.reviewerName}</h4>
                      <p className="text-sm text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Verified Art Buyer</p>
                    </div>
                    {r && (
                      <div className="text-right text-xs">
                        <span className="block text-gray-400 font-semibold text-xs">Purchased Product:</span>
                        <span className="text-editorial-accent hover:underline font-serif font-medium cursor-pointer" onClick={() => {
                          onSelectRugId(r.id);
                          setCurrentTab("shop");
                        }}>{r.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 7. Grand Finale Call-to-Action */}
      <section className="py-20 bg-neutral-950 text-white text-center relative overflow-hidden">
        {/* Intricate rug borders styled using CSS gradients */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-editorial-accent" />
        <div className="absolute inset-0 bg-[radial-gradient(#A68B67_0.5px,transparent_0.5px)] [background-size:16px_16px] opacity-10" />

        <div className="max-w-4xl mx-auto px-4 relative z-10 space-y-6">
          <span className="text-xs uppercase tracking-[0.4em] text-editorial-accent font-bold">Invest in Timeless Craft</span>
          <h2 className="font-serif text-3xl sm:text-5xl font-light tracking-wide leading-tight">Bring Palace Art Into Your Home</h2>
          <p className="text-gray-400 max-w-lg mx-auto text-xs leading-relaxed font-light">
            Whether you are seeking a stunning focal point or a cozy hallway runner, our rug advisors will assist you with custom dimensions and historical authentication.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setCurrentTab("shop")}
              className="w-full sm:w-auto px-8 py-4 bg-editorial-accent hover:bg-[#8E7453] text-white font-bold uppercase tracking-widest text-xs rounded-none transition duration-200"
            >
              Shop Full Showroom
            </button>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent("open-marcopolo-chat", {
                  detail: { initialMessage: "Hi, I want a custom rug advisor session! Can you help me find rugs that match a warm green palette?" }
                }));
              }}
              className="w-full sm:w-auto px-8 py-4 bg-transparent hover:bg-white/5 text-editorial-accent border border-editorial-accent/40 font-bold uppercase tracking-widest text-xs rounded-none transition duration-200"
            >
              Consult Rug Advisor
            </button>
          </div>
        </div>
      </section>

      {/* 8. Booking Form Modal for Cleaning & Repair Service */}
      {cleaningModalOpen && (
        <div className="fixed inset-0 z-[9999] flex justify-center items-start p-2 sm:p-4 bg-black/70 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="relative bg-white w-full max-w-lg p-6 sm:p-8 border border-editorial-border shadow-2xl text-left my-4 sm:my-8">
            <button
              onClick={() => setCleaningModalOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-stone-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-950 transition cursor-pointer border border-neutral-300 rounded-none flex items-center justify-center"
              title="Close Specialty Care Portal"
              aria-label="Close"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div className="space-y-4">
              <div className="text-center space-y-1">
                <span className="text-xs uppercase tracking-[0.3em] text-editorial-accent font-semibold block">
                  Marco Polo Specialty Lab
                </span>
                <h3 className="font-serif text-2xl font-light text-editorial-text uppercase tracking-wide">
                  Schedule Specialty Care
                </h3>
                <p className="text-xs text-gray-500 font-light">
                  Traditional Persian submersion washing & expert conservation.
                </p>
              </div>

              <form onSubmit={handleBookCleaning} className="space-y-4 text-xs font-sans">
                {/* 1. Client Contact Details */}
                <div className="border-b border-gray-100 pb-3 space-y-3">
                  <h4 className="font-serif font-bold text-neutral-800 text-sm uppercase tracking-wider">
                    1. Patron Contact Information
                  </h4>
                  
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-gray-500 font-semibold uppercase tracking-wider text-sm mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={cleaningName}
                        onChange={(e) => setCleaningName(e.target.value)}
                        placeholder="e.g. Victoria Sterling"
                        className="w-full bg-[#F9F7F5] border border-editorial-border rounded-none py-2 px-3 text-editorial-text outline-none focus:border-editorial-accent"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-500 font-semibold uppercase tracking-wider text-sm mb-1">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={cleaningEmail}
                          onChange={(e) => setCleaningEmail(e.target.value)}
                          placeholder="patron@example.com"
                          className="w-full bg-[#F9F7F5] border border-editorial-border rounded-none py-2 px-3 text-editorial-text outline-none focus:border-editorial-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-500 font-semibold uppercase tracking-wider text-sm mb-1">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={cleaningPhone}
                          onChange={(e) => setCleaningPhone(e.target.value)}
                          placeholder="+1 (555) 789-1002"
                          className="w-full bg-[#F9F7F5] border border-editorial-border rounded-none py-2 px-3 text-editorial-text outline-none focus:border-editorial-accent"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Custom Size & Dimensions */}
                <div className="border-b border-gray-100 pb-3 space-y-3">
                  <h4 className="font-serif font-bold text-neutral-800 text-sm uppercase tracking-wider">
                    2. Rug Dimensions & Unit Specification
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-500 font-semibold uppercase tracking-wider text-sm mb-1">Dimension Units *</label>
                      <select
                        value={dimensionUnit}
                        onChange={(e) => setDimensionUnit(e.target.value as any)}
                        className="w-full bg-[#F9F7F5] border border-editorial-border rounded-none py-2 px-3 text-editorial-text outline-none focus:border-editorial-accent text-sm"
                      >
                        <option value="Feet & Inches">Feet & Inches (e.g., 8'3" x 10'1")</option>
                        <option value="Total Inches">Total Inches only (e.g., 99" x 121")</option>
                        <option value="Meters (M)">Meters (M) (e.g., 2.5 m x 3.0 m)</option>
                      </select>
                    </div>

                    {dimensionUnit === "Feet & Inches" && (
                      <div className="grid grid-cols-4 gap-2 text-center items-center">
                        <div>
                          <label className="block text-gray-400 text-xs uppercase font-semibold mb-0.5">Width Ft</label>
                          <input
                            type="number"
                            min={0}
                            required
                            value={wFeet}
                            onChange={(e) => setWFeet(Math.max(0, Number(e.target.value)))}
                            className="w-full bg-[#F9F7F5] border border-editorial-border rounded-none py-2 px-1 text-editorial-text text-center outline-none focus:border-editorial-accent font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400 text-xs uppercase font-semibold mb-0.5">Width In</label>
                          <input
                            type="number"
                            min={0}
                            max={11}
                            required
                            value={wInches}
                            onChange={(e) => setWInches(Math.min(11, Math.max(0, Number(e.target.value))))}
                            className="w-full bg-[#F9F7F5] border border-editorial-border rounded-none py-2 px-1 text-editorial-text text-center outline-none focus:border-editorial-accent font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400 text-xs uppercase font-semibold mb-0.5">Length Ft</label>
                          <input
                            type="number"
                            min={0}
                            required
                            value={lFeet}
                            onChange={(e) => setLFeet(Math.max(0, Number(e.target.value)))}
                            className="w-full bg-[#F9F7F5] border border-editorial-border rounded-none py-2 px-1 text-editorial-text text-center outline-none focus:border-editorial-accent font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400 text-xs uppercase font-semibold mb-0.5">Length In</label>
                          <input
                            type="number"
                            min={0}
                            max={11}
                            required
                            value={lInches}
                            onChange={(e) => setLInches(Math.min(11, Math.max(0, Number(e.target.value))))}
                            className="w-full bg-[#F9F7F5] border border-editorial-border rounded-none py-2 px-1 text-editorial-text text-center outline-none focus:border-editorial-accent font-mono text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {dimensionUnit === "Total Inches" && (
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div>
                          <label className="block text-gray-400 text-xs uppercase font-semibold mb-1">Width (Inches)</label>
                          <input
                            type="number"
                            min={1}
                            required
                            value={wTotalInches}
                            onChange={(e) => setWTotalInches(Math.max(1, Number(e.target.value)))}
                            className="w-full bg-[#F9F7F5] border border-editorial-border rounded-none py-2 px-3 text-editorial-text text-center outline-none focus:border-editorial-accent font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400 text-xs uppercase font-semibold mb-1">Length (Inches)</label>
                          <input
                            type="number"
                            min={1}
                            required
                            value={lTotalInches}
                            onChange={(e) => setLTotalInches(Math.max(1, Number(e.target.value)))}
                            className="w-full bg-[#F9F7F5] border border-editorial-border rounded-none py-2 px-3 text-editorial-text text-center outline-none focus:border-editorial-accent font-mono text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {dimensionUnit === "Meters (M)" && (
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div>
                          <label className="block text-gray-400 text-xs uppercase font-semibold mb-1">Width (Meters)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.1"
                            required
                            value={wMeters}
                            onChange={(e) => setWMeters(Math.max(0.1, Number(e.target.value)))}
                            className="w-full bg-[#F9F7F5] border border-editorial-border rounded-none py-2 px-3 text-editorial-text text-center outline-none focus:border-editorial-accent font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400 text-xs uppercase font-semibold mb-1">Length (Meters)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.1"
                            required
                            value={lMeters}
                            onChange={(e) => setLMeters(Math.max(0.1, Number(e.target.value)))}
                            className="w-full bg-[#F9F7F5] border border-editorial-border rounded-none py-2 px-3 text-editorial-text text-center outline-none focus:border-editorial-accent font-mono text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Transport Options */}
                <div className="border-b border-gray-100 pb-3 space-y-3">
                  <h4 className="font-serif font-bold text-neutral-800 text-sm uppercase tracking-wider">
                    3. Transport & Scheduling
                  </h4>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-gray-500 font-semibold uppercase tracking-wider text-sm mb-1">
                        Service Option
                      </label>
                      <select
                        value={cleaningOption}
                        onChange={(e) => setCleaningOption(e.target.value as "Pickup" | "Drop-off")}
                        className="w-full bg-[#F9F7F5] border border-editorial-border rounded-none py-2 px-2 text-editorial-text outline-none focus:border-editorial-accent text-sm"
                      >
                        <option value="Pickup">Pickup</option>
                        <option value="Drop-off">Drop-off</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-500 font-semibold uppercase tracking-wider text-sm mb-1">
                        Preferred Date
                      </label>
                      <input
                        type="date"
                        required
                        value={cleaningPreferredDate}
                        onChange={(e) => setCleaningPreferredDate(e.target.value)}
                        className="w-full bg-[#F9F7F5] border border-editorial-border rounded-none py-2 px-2 text-editorial-text outline-none focus:border-editorial-accent text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-500 font-semibold uppercase tracking-wider text-sm mb-1">
                        Preferred Time *
                      </label>
                      <input
                        type="time"
                        required
                        value={cleaningPreferredTime}
                        onChange={(e) => setCleaningPreferredTime(e.target.value)}
                        className="w-full bg-[#F9F7F5] border border-editorial-border rounded-none py-2 px-2 text-editorial-text outline-none focus:border-editorial-accent text-sm font-mono"
                      />
                    </div>
                  </div>

                  {cleaningOption === "Pickup" && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-gray-500 font-semibold uppercase tracking-wider text-sm mb-1">
                          Pickup Address *
                        </label>
                        <input
                          type="text"
                          required
                          value={cleaningAddress}
                          onChange={(e) => setCleaningAddress(e.target.value)}
                          placeholder="Street, City, ZIP Code"
                          className="w-full bg-[#F9F7F5] border border-editorial-border rounded-none py-2 px-3 text-editorial-text outline-none focus:border-editorial-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-500 font-semibold uppercase tracking-wider text-sm mb-1">
                          Pickup Distance
                        </label>
                        <select
                          value={pickupFee}
                          onChange={(e) => setPickupFee(Number(e.target.value))}
                          className="w-full bg-[#F9F7F5] border border-editorial-border rounded-none py-2 px-3 text-editorial-text outline-none focus:border-editorial-accent"
                        >
                          <option value={20}>Local Showroom (10mi) - $20</option>
                          <option value={35}>Metro Showroom (25mi) - $35</option>
                          <option value={50}>Extended Carriage (50mi) - $50</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Luxury Invoice Live Breakdown */}
                <div className="bg-[#FAF9F6] p-4 border border-editorial-border space-y-2">
                  <h5 className="font-serif font-bold text-neutral-800 text-xs uppercase tracking-wider text-center border-b border-stone-200 pb-1.5">
                    Estimated Care Breakdown
                  </h5>
                  
                  <div className="space-y-1 font-mono text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Total Area:</span>
                      <span>{sizeDescription} = {finalAreaSqft.toFixed(2)} sqft</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Organic Wash Rate:</span>
                      <span>$5.00 / sqft</span>
                    </div>
                    <div className="flex justify-between text-neutral-800 font-bold border-t border-dotted border-stone-200 pt-1">
                      <span>Cleaning Fee:</span>
                      <span>${washPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pickup & Delivery Fee ({cleaningOption}):</span>
                      <span>${(cleaningOption === "Pickup" ? pickupFee : 0).toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between text-xs text-editorial-accent font-bold border-t border-stone-300 pt-1.5 mt-1">
                      <span>Estimated Quote:</span>
                      <span>${finalTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold uppercase tracking-widest text-xs rounded-none transition duration-200 cursor-pointer"
                >
                  Submit Certified Care Request
                </button>
              </form>

              {cleaningFormSubmitted && cleaningReceiptData && (
                <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-6 text-center rounded-none animate-fadeIn z-10">
                  <CheckCircle className="h-10 w-10 text-emerald-600 mb-2" />
                  <h4 className="font-serif text-xl text-neutral-900 font-bold uppercase tracking-wider">Request Confirmed!</h4>
                  <p className="text-neutral-500 text-xs mt-1 max-w-sm mb-4">
                    Your Booking ID is <span className="font-mono font-bold text-neutral-800">{cleaningReceiptData.id}</span>. We have generated your official care receipt.
                  </p>
                  
                  <div className="bg-amber-50 border border-amber-200 p-3 max-w-sm w-full text-left mb-6">
                    <p className="text-amber-800 text-sm font-bold uppercase tracking-wider mb-1">Important Deposit Policy</p>
                    <p className="text-amber-700 text-xs">
                      A <strong>50% deposit (${(cleaningReceiptData.totalPrice / 2).toFixed(2)})</strong> is required when we {cleaningReceiptData.serviceOption === "Pickup" ? "pickup" : "receive"} your rug. The remaining balance is due upon return.
                    </p>
                  </div>
                  
                  <div className="flex gap-3 w-full max-w-sm">
                    <button
                      onClick={() => handleDownloadReceipt(cleaningReceiptData)}
                      className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" /> Save Receipt
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="flex-1 py-2.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-900 font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Printer className="h-3.5 w-3.5" /> Print
                    </button>
                  </div>
                  
                  <button
                    onClick={() => {
                      setCleaningFormSubmitted(false);
                      setCleaningModalOpen(false);
                    }}
                    className="mt-6 text-xs text-neutral-400 hover:text-neutral-900 underline uppercase tracking-wider font-bold transition cursor-pointer"
                  >
                    Close Window
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
