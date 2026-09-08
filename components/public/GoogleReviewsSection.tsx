'use client';

import React, { useState, useMemo } from 'react';
import { Star, ChevronLeft, ChevronRight, CheckCircle2, MessageSquare, Quote, Sparkles } from 'lucide-react';
import { REAL_GOOGLE_REVIEWS, GoogleReviewItem } from '@/data/googleReviews';
import { useStore } from '@/context/StoreContext';

interface GoogleReviewsSectionProps {
  onOpenReviewModal?: () => void;
}

export const GoogleReviewsSection: React.FC<GoogleReviewsSectionProps> = ({ onOpenReviewModal }) => {
  const { reviews } = useStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');

  // Merge store reviews with seeded Google reviews, sort newest first
  const allReviews: GoogleReviewItem[] = useMemo(() => {
    const customReviews: GoogleReviewItem[] = (reviews || [])
      .filter((r) => r.isApproved)
      .map((r) => ({
        ...r,
        source: 'Showroom' as const,
        verifiedCustomer: true,
        timeAgo: 'Recent'
      }));

    // Avoid duplicates by id
    const existingIds = new Set(customReviews.map((r) => r.id));
    const merged = [...customReviews];
    REAL_GOOGLE_REVIEWS.forEach((gr) => {
      if (!existingIds.has(gr.id)) {
        merged.push(gr);
      }
    });

    // Newest first sorting
    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return merged;
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    if (filterRating === 'all') return allReviews;
    return allReviews.filter((r) => r.rating === filterRating);
  }, [allReviews, filterRating]);

  const currentReview = filteredReviews[currentIndex] || filteredReviews[0];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % filteredReviews.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + filteredReviews.length) % filteredReviews.length);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <section className="py-20 md:py-28 bg-[#FAF9F5] border-y border-stone-200 relative overflow-hidden" id="reviews">
      {/* Subtle ambient luxury backdrop */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-stone-200/30 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Badge & Google Rating Showcase */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-12 border-b border-stone-200">
          <div className="text-center md:text-left space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-stone-300 rounded-full shadow-xs">
              {/* Google G Icon */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span className="text-xs font-bold uppercase tracking-widest text-neutral-800">
                Verified Google Reviews
              </span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl text-neutral-900 font-light tracking-wide">
              Client Commendations
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 font-light max-w-lg">
              Showing the newest authentic feedback from collectors, designers, and Washington D.C. homeowners.
            </p>
          </div>

          {/* Rating Summary Card */}
          <div className="flex items-center gap-5 bg-white border border-stone-200 px-6 py-4 shadow-sm">
            <div className="text-center">
              <span className="text-3xl font-serif font-bold text-neutral-900 block leading-none">4.9</span>
              <div className="flex items-center gap-0.5 text-amber-500 mt-1.5 justify-center">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                ))}
              </div>
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold block mt-1">120+ Reviews</span>
            </div>
            <div className="h-10 w-[1px] bg-stone-200" />
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>100% Certified Cleaners</span>
              </div>
              <p className="text-neutral-500 text-[11px] font-light">Alexandria &amp; Washington, D.C.</p>
              {onOpenReviewModal && (
                <button
                  onClick={onOpenReviewModal}
                  className="text-amber-800 font-serif font-medium text-xs hover:underline block pt-0.5 cursor-pointer"
                >
                  + Write a Review
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Carousel / One-by-One Presentation (Newest First) */}
        {filteredReviews.length > 0 && currentReview && (
          <div className="mt-12">
            
            {/* Spotlight Single Review Card */}
            <div className="bg-white border border-stone-200 shadow-md p-8 sm:p-12 relative">
              {/* Giant decorative watermark quote */}
              <Quote className="absolute top-6 right-8 w-16 h-16 text-amber-900/5 pointer-events-none" />

              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-stone-100">
                <div className="flex items-center gap-4">
                  {/* Reviewer Avatar / Initial */}
                  <div className="w-14 h-14 rounded-full bg-[#8E7453] text-white flex items-center justify-center font-serif text-xl font-medium shadow-xs">
                    {currentReview.reviewerName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-lg sm:text-xl font-medium text-neutral-900">
                        {currentReview.reviewerName}
                      </h3>
                      {currentReview.verifiedCustomer && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1">
                      <span className="font-medium text-neutral-700">via Google Reviews</span>
                      <span>•</span>
                      <span>{currentReview.timeAgo || formatDate(currentReview.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Rating Stars & Sequence Counter */}
                <div className="flex flex-col sm:items-end gap-1.5">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < currentReview.rating
                            ? 'fill-amber-500 text-amber-500'
                            : 'text-stone-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-mono text-neutral-500">
                    Review {currentIndex + 1} of {filteredReviews.length} (Newest First)
                  </span>
                </div>
              </div>

              {/* Review Text Body */}
              <div className="py-8">
                <p className="font-serif text-base sm:text-xl text-neutral-800 leading-relaxed font-normal italic">
                  "{currentReview.reviewText}"
                </p>
              </div>

              {/* Card Footer with Service Indicator */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-stone-100 text-xs text-neutral-500">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span className="font-medium text-neutral-700">
                    Verified Service: Area Rug Hand Washing, Restoration &amp; Care
                  </span>
                </div>
                <span className="font-mono text-[11px] text-neutral-400">
                  Posted: {formatDate(currentReview.createdAt)}
                </span>
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between mt-8 pt-4">
              {/* Dots / Pips */}
              <div className="flex items-center gap-2">
                {filteredReviews.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-2 transition-all cursor-pointer ${
                      idx === currentIndex
                        ? 'w-8 bg-amber-800'
                        : 'w-2 bg-stone-300 hover:bg-stone-400'
                    }`}
                    aria-label={`Go to review ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Previous / Next Arrow Controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-stone-300 hover:border-neutral-900 text-neutral-800 hover:text-neutral-950 text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-xs"
                  aria-label="Previous Review"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-neutral-900 hover:bg-amber-900 text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-xs"
                  aria-label="Next Review"
                >
                  <span className="hidden sm:inline">Next Review</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </section>
  );
};
