import { Metadata } from 'next';
import '../../public-styles.css';

import TopAdminBar from '@/components/TopAdminBar';
import PublicAdminWrapper from '@/components/PublicAdminWrapper';
import { Analytics } from "@vercel/analytics/react";

import { db, isFirebaseConfigured } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function generateMetadata(): Promise<Metadata> {
  let seoTitle = 'Marco Polo Rugs | Alexandria Rug Store Since 1988';
  let seoDesc = 'Explore rugs and runners at Marco Polo Rugs in Alexandria, serving customers since 1988. Visit for personal sizing help, rug cleaning and restoration.';
  
  try {
    const docSnap = isFirebaseConfigured() ? await getDoc(doc(db, 'showroom_settings', 'live_website_content')) : null;
    if (docSnap && docSnap.exists()) {
      const data = docSnap.data().data || {};
      if (data.seo_title) seoTitle = data.seo_title;
      if (data.seo_description) seoDesc = data.seo_description;
    }
  } catch(e) {
    console.error("SEO Fetch Error", e);
  }

  return {
    metadataBase: new URL('https://www.marcopolorugs.com'),
    title: seoTitle,
    description: seoDesc,

    alternates: {
      canonical: '/',
    }
  };
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    "name": "Marco Polo Rugs",
    "foundingDate": "1988",
    "image": "https://www.marcopolorugs.com/icon.png",
    "description": "Rugs, runners, cleaning and restoration in Alexandria, Virginia. Serving customers since 1988.",
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
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "opens": "10:00",
        "closes": "18:00"
      }
    ]
  };

  return (
    <html lang="en">
      <body>
        <PublicAdminWrapper />
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
