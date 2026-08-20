import { Metadata } from 'next';
import '../../public-styles.css';

import TopAdminBar from '@/components/TopAdminBar';
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  metadataBase: new URL('https://www.marcopolorugs.com'),
  title: 'Oriental & Persian Rug Store in Alexandria, VA | Marco Polo Oriental Rugs',
  description: 'Discover our premium collection of authentic handmade rugs, Persian rugs, vintage runners, and luxurious carpets. Visit our Alexandria showroom for rug cleaning and restoration.',
  keywords: 'rugs, handmade rugs, Persian rugs, oriental rugs, Alexandria VA, rug cleaning, rug repair, Washington DC area, Northern Virginia',
  alternates: {
    canonical: '/',
  }
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    "name": "Marco Polo Oriental Rugs",
    "image": "https://www.marcopolorugs.com/icon.png",
    "description": "Premium collection of authentic handmade rugs, Persian rugs, vintage runners, and luxurious carpets in Alexandria, VA. Expert rug cleaning and restoration services.",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "3260 Duke St",
      "addressLocality": "Alexandria",
      "addressRegion": "VA",
      "postalCode": "22314",
      "addressCountry": "US"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 38.8093,
      "longitude": -77.0858
    },
    "url": "https://www.marcopolorugs.com",
    "telephone": "+17034610207",
    "email": "marcopolorugs@aol.com",
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        "opens": "10:00",
        "closes": "18:00"
      }
    ]
  };

  return (
    <html lang="en">
      <body>
        <TopAdminBar />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
