'use client';

import React from 'react';
import { Gavel, Clock } from 'lucide-react';

export const AuctionView: React.FC = () => {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center">
      <Gavel className="w-16 h-16 text-amber-800 mb-6" />
      <h1 className="text-4xl md:text-5xl font-serif text-neutral-900 mb-4">
        Auction Platform
      </h1>
      <div className="bg-amber-100 text-amber-900 px-4 py-2 rounded-full font-semibold uppercase tracking-wider text-sm mb-6 inline-flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Under Construction
      </div>
      <p className="text-neutral-600 max-w-md text-lg">
        Our live auction platform is currently being upgraded to provide you with the best bidding experience. Please check back soon.
      </p>
    </div>
  );
};
