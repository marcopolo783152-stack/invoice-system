/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { useStore } from "@/context/StoreContext";
import { Rug, Review } from "@/types";
import { X, Star, ShoppingBag, ShieldAlert, Award, Compass, RefreshCw, Layers, MessageCircle } from "lucide-react";

interface ProductDetailProps {
  rugId: string;
  onClose: () => void;
  onSelectRugId?: (id: string) => void;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ rugId, onClose, onSelectRugId }) => {
  const { rugs, reviews, addToCart, submitReview, deleteReview } = useStore();
  
  const rug = rugs.find((r) => r.id === rugId);
  
  if (!rug) return null;

  const [activeImage, setActiveImage] = useState(rug.images?.[0] || "https://images.unsplash.com/photo-1594040226829-7f251ab46d80?auto=format&fit=crop&q=80&w=800");
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({ display: "none" });

  React.useEffect(() => {
    if (rug && rug.images && rug.images.length > 0) {
      setActiveImage(rug.images[0]);
    } else {
      setActiveImage("https://images.unsplash.com/photo-1594040226829-7f251ab46d80?auto=format&fit=crop&q=80&w=800");
    }
  }, [rugId, rug]);
  
  // Review form states
  const [reviewerName, setReviewerName] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Mouse zoom events
  const imageRef = useRef<HTMLImageElement | null>(null);

  const handleInquireRug = () => {
    const inquiryText = `Hello Marco Polo team! I would like to inquire about the showroom piece: "${rug.name}" (SKU: ${rug.sku}, Size: ${rug.dimensions}, price: $${rug.price.toLocaleString()}). Could you please share more details about its origin, weaves, and certificate?`;
    window.dispatchEvent(new CustomEvent("open-marcopolo-chat", {
      detail: { initialMessage: inquiryText }
    }));
    onClose();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    const { left, top, width, height } = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    
    setZoomStyle({
      display: "block",
      backgroundImage: `url(${activeImage})`,
      backgroundPosition: `${x}% ${y}%`,
      backgroundSize: "250%" // Zoom level
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({ display: "none" });
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName.trim() || !reviewText.trim()) return;
    
    submitReview(rug.id, reviewerName, rating, reviewText);
    setReviewSubmitted(true);
    setReviewerName("");
    setReviewText("");
    
    setTimeout(() => {
      setReviewSubmitted(false);
    }, 4000);
  };

  // Get approved reviews for this rug
  const rugReviews = reviews.filter((rev) => rev.rugId === rug.id && rev.isApproved);
  // Get pending reviews for this rug to show a hint
  const pendingReviewsCount = reviews.filter((rev) => rev.rugId === rug.id && !rev.isApproved).length;
  

  // Get 3 related rugs
  const relatedRugs = rugs
    .filter((r) => r.id !== rug.id && (r.origin === rug.origin || r.style === rug.style))
    .slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-editorial-text/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-editorial-bg text-editorial-text rounded-none w-full max-w-5xl shadow-xl relative flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden border border-editorial-border animate-fadeIn">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-none bg-editorial-aside hover:bg-white text-editorial-text hover:text-editorial-accent z-30 transition border border-editorial-border"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10">
          
          {/* Main Info Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
            
            {/* Left side: Images & Magnifier */}
            <div className="lg:col-span-6 space-y-4">
              
              {/* Interactive Zoom box */}
              <div 
                className="relative aspect-square rounded-none bg-[#F4F1EE] overflow-hidden border border-editorial-border cursor-crosshair group"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <img
                  ref={imageRef}
                  src={activeImage}
                  alt={rug.name}
                  className="w-full h-full object-cover object-center"
                  referrerPolicy="no-referrer"
                />
                
                {/* Floating Lens Magnifier Panel */}
                <div 
                  className="absolute inset-0 pointer-events-none border border-editorial-accent rounded-none"
                  style={zoomStyle}
                />

                <div className="absolute bottom-3 right-3 bg-editorial-text/90 backdrop-blur-xs text-white text-xs uppercase tracking-widest font-bold px-2.5 py-1 rounded-none">
                  Hover to inspect weave density
                </div>
              </div>

              {/* Gallery List */}
              <div className="grid grid-cols-4 gap-2">
                {(rug.images || []).map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(img)}
                    className={`aspect-square rounded-none overflow-hidden bg-stone-100 border transition ${
                      activeImage === img ? "border-editorial-accent scale-98" : "border-editorial-border hover:border-gray-400"
                    }`}
                  >
                    <img src={img} alt="Thumbnail" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>

              {/* Luxury Certification Bullet */}
              <div className="p-4 bg-editorial-aside border border-editorial-border rounded-none flex items-center gap-3">
                <Award className="h-5 w-5 text-editorial-accent flex-shrink-0 animate-pulse" />
                <span className="text-sm leading-relaxed text-gray-500 font-sans font-light">
                  <strong>Lifetime Certificate of Authenticity Included</strong>. Each stitch is guaranteed hand-knotted by ancestral master weavers. Hand-washed in soft waters prior to delivery.
                </span>
              </div>

            </div>

            {/* Right side: Spec Curation */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 bg-editorial-text/90 text-xs text-white tracking-wider font-bold uppercase rounded-none">
                    {rug.origin}
                  </span>
                  <span className="px-2.5 py-1 bg-editorial-aside text-xs text-editorial-text tracking-wider font-bold uppercase rounded-none border border-editorial-border">
                    {rug.style} Style
                  </span>
                  <span className={`px-2.5 py-1 rounded-none text-xs tracking-wider font-bold uppercase border ${
                    rug.availability === "In Stock" ? "bg-green-50 text-green-700 border-green-200" :
                    rug.availability === "Reserved" ? "bg-editorial-aside text-editorial-accent border-editorial-border" :
                    "bg-red-50 text-red-700 border-red-200"
                  }`}>
                    {rug.availability}
                  </span>
                </div>
                
                <h2 className="font-serif text-2xl sm:text-3xl font-light text-editorial-text leading-tight">
                  {rug.name}
                </h2>
                <p className="text-xs font-mono text-gray-400 uppercase tracking-widest">
                  Showroom SKU: {rug.sku} | Dimensions: {rug.dimensions}
                </p>
              </div>

              <div className="flex items-center gap-3 py-3 border-y border-editorial-border justify-between">
                <div>
                  <span className="text-xs text-gray-400 uppercase tracking-wider block font-semibold">Concierge Value</span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-2xl sm:text-3xl font-light text-editorial-text">${rug.price.toLocaleString()}</span>
                    {rug.originalPrice && (
                      <span className="text-sm font-serif line-through text-gray-400">${rug.originalPrice.toLocaleString()}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2.5">
                  {rug.availability === "In Stock" ? (
                    <button
                      onClick={() => {
                        addToCart(rug);
                        onClose();
                      }}
                      className="px-5 py-3.5 bg-editorial-accent hover:bg-[#8E7453] text-white font-bold uppercase tracking-widest text-sm rounded-none shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span>Add to Cart</span>
                    </button>
                  ) : (
                    <div className="px-4 py-3 bg-editorial-aside text-gray-500 rounded-none text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 border border-editorial-border">
                      <ShieldAlert className="h-4 w-4 text-editorial-accent" />
                      <span>{rug.availability === "Reserved" ? "Client Reserved" : "Sold Out"}</span>
                    </div>
                  )}

                  <button
                    onClick={handleInquireRug}
                    className="px-5 py-3.5 border border-editorial-accent hover:bg-editorial-accent hover:text-white text-editorial-accent font-bold uppercase tracking-widest text-sm rounded-none transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Inquire / Ask Details</span>
                  </button>
                </div>
              </div>

              {/* Specifications Matrix */}
              <div className="space-y-2.5">
                <h4 className="text-xs uppercase tracking-widest text-editorial-accent font-bold">Museum-Grade Specifications</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs border border-editorial-border rounded-none p-4 bg-white shadow-sm">
                  <div className="flex justify-between py-1.5 border-b border-editorial-border">
                    <span className="text-gray-400 font-light">Dimensions:</span>
                    <span className="font-light text-editorial-text">{rug.dimensions}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-editorial-border">
                    <span className="text-gray-400 font-light">Knot Density:</span>
                    <span className="font-light text-editorial-text">Ultra-High Fine</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-editorial-border">
                    <span className="text-gray-400 font-light">Origin:</span>
                    <span className="font-light text-editorial-text">{rug.origin}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-editorial-border">
                    <span className="text-gray-400 font-light">Age Curation:</span>
                    <span className="font-light text-editorial-text">{rug.age}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-editorial-border">
                    <span className="text-gray-400 font-light">Material Composition:</span>
                    <span className="font-light text-editorial-text text-right max-w-[120px] truncate">{rug.material}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-editorial-border">
                    <span className="text-gray-400 font-light">Condition State:</span>
                    <span className="font-light text-editorial-text">{rug.condition}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-editorial-border col-span-2">
                    <span className="text-gray-400 font-light">Dominant Palette:</span>
                    <span className="font-light text-editorial-text">{rug.colors.join(", ")}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <h4 className="text-xs uppercase tracking-widest text-editorial-accent font-bold">Curator's Narrative</h4>
                <p className="text-xs text-gray-500 leading-relaxed font-light">
                  {rug.description}
                </p>
              </div>

            </div>

          </div>

          {/* Customer Reviews Section */}
          <div className="pt-10 border-t border-editorial-border grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Reviews list */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-light text-editorial-text">Customer Testimonials</h3>
                  <p className="text-xs text-gray-400">Authentic buyer reviews approved by Marco Polo showroom.</p>
                </div>
                <div className="flex items-center gap-1.5 bg-editorial-aside px-3 py-1 border border-editorial-border rounded-none text-editorial-accent">
                  <Star className="h-3.5 w-3.5 fill-editorial-accent text-editorial-accent" />
                  <span className="font-bold text-xs">{rug.rating.toFixed(1)} / 5.0</span>
                </div>
              </div>

              {rugReviews.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-none border border-editorial-border space-y-1">
                  <p className="text-xs text-gray-500 font-medium">No verified reviews published yet.</p>
                  <p className="text-xs text-gray-400 font-light">Be the first to share your heirloom experience!</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {rugReviews.map((rev) => (
                    <div key={rev.id} className="p-4 rounded-none border border-editorial-border bg-white space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-editorial-text">{rev.reviewerName}</span>
                        <button
                          onClick={() => {
                            const key = window.prompt("Enter admin key to delete this review:");
                            if (key === "Marcopolo$") {
                              deleteReview(rev.id);
                              alert("Review deleted.");
                            } else if (key !== null) {
                              alert("Incorrect admin key.");
                            }
                          }}
                          className="ml-2 text-xs text-red-500 hover:underline uppercase tracking-wider font-bold"
                        >
                          Delete
                        </button>
                        <span className="text-xs text-gray-400 font-mono">
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="flex gap-0.5 text-editorial-accent">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-3 w-3 ${i < rev.rating ? "fill-editorial-accent text-editorial-accent" : "text-gray-200"}`} />
                        ))}
                      </div>

                      <p className="text-sm text-gray-500 leading-relaxed font-light italic">
                        "{rev.reviewText}"
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending reviews warning for admin evaluation testing */}
              {pendingReviewsCount > 0 && (
                <div className="p-3 bg-editorial-aside border border-editorial-border rounded-none text-xs text-editorial-accent flex items-center gap-2">
                  <Compass className="h-4 w-4 text-editorial-accent animate-spin" />
                  <span>
                    <strong>Admins Note:</strong> There are {pendingReviewsCount} review(s) submitted for this rug awaiting moderation in the Admin Panel.
                  </span>
                </div>
              )}

            </div>

            {/* Leave a review form */}
            <div className="lg:col-span-5 bg-white p-6 rounded-none border border-editorial-border space-y-4">
              <div className="text-center">
                <h4 className="font-serif text-sm font-light text-editorial-text uppercase tracking-wider">Share Your Experience</h4>
                <p className="text-xs text-gray-400 mt-0.5">Share your heirloom experience with our community.</p>
              </div>

              <form onSubmit={handleSubmitReview} className="space-y-3 text-xs font-sans">
                <div className="space-y-1">
                  <label className="block text-gray-400 font-semibold uppercase tracking-wider">Your Name</label>
                  <input
                    type="text"
                    required
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="e.g. Elena Montgomerie"
                    className="w-full bg-white border border-editorial-border rounded-none py-2 px-3 outline-none text-xs text-editorial-text focus:border-editorial-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-gray-400 font-semibold uppercase tracking-wider">Star Rating</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setRating(num)}
                        className={`p-1.5 border rounded-none transition ${
                          rating >= num ? "border-editorial-accent bg-editorial-aside text-editorial-accent" : "border-editorial-border bg-white text-gray-400"
                        }`}
                      >
                        <Star className={`h-4 w-4 ${rating >= num ? "fill-editorial-accent text-editorial-accent" : ""}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-gray-400 font-semibold uppercase tracking-wider">Review Details</label>
                  <textarea
                    required
                    rows={3}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Describe the fine weaving, dyes, luster, underfoot softness or shipping..."
                    className="w-full bg-white border border-editorial-border rounded-none py-2 px-3 outline-none text-xs text-editorial-text focus:border-editorial-accent resize-none font-light"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-editorial-accent hover:bg-[#8E7453] text-white font-bold uppercase tracking-widest rounded-none text-xs transition"
                >
                  Submit For Curator Approval
                </button>
              </form>

              {reviewSubmitted && (
                <div className="p-3 bg-green-50 border border-green-100 rounded-none text-xs text-green-700 text-center animate-fadeIn">
                  Review submitted successfully! Thank you for sharing your experience.
                </div>
              )}
            </div>

          </div>

          {/* Related Rugs suggestions */}
          {relatedRugs.length > 0 && (
            <div className="pt-10 border-t border-editorial-border space-y-6">
              <div>
                <h3 className="font-serif text-lg font-light text-editorial-text">Discerning Curation Recommendations</h3>
                <p className="text-xs text-gray-400">Other fine weaves matching {rug.origin} or {rug.style} styles in stock.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedRugs.map((relRug) => (
                  <div
                    key={relRug.id}
                    onClick={() => {
                      const coverImg = relRug.images?.[0] || "https://images.unsplash.com/photo-1594040226829-7f251ab46d80?auto=format&fit=crop&q=80&w=800";
                      if (onSelectRugId) {
                        onSelectRugId(relRug.id);
                        setActiveImage(coverImg);
                      } else {
                        setActiveImage(coverImg);
                      }
                      
                      // Smoothly scroll the modal's scroll container to the top
                      const scrollContainer = document.querySelector(".fixed.inset-0.z-50.overflow-y-auto");
                      if (scrollContainer) {
                        scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
                      }
                    }}
                    className="flex items-center gap-4 p-3 bg-white rounded-none border border-editorial-border cursor-pointer hover:border-editorial-accent hover:shadow-sm transition duration-200 text-left"
                  >
                    <img
                      src={relRug.images?.[0] || "https://images.unsplash.com/photo-1594040226829-7f251ab46d80?auto=format&fit=crop&q=80&w=800"}
                      alt={relRug.name}
                      className="w-16 h-16 object-cover rounded-none flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <h4 className="font-serif text-xs font-light text-editorial-text truncate">{relRug.name}</h4>
                      <p className="text-xs text-gray-400 font-light">{relRug.dimensions} | {relRug.origin}</p>
                      <span className="text-xs font-serif font-light text-editorial-text block mt-0.5">${relRug.price.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
