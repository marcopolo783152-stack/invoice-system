import { Metadata } from 'next';
import '../../public-styles.css';

import TopAdminBar from '@/components/TopAdminBar';
import { Analytics } from "@vercel/analytics/react";

import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function generateMetadata(): Promise<Metadata> {
  let seoTitle = 'Oriental & Persian Rug Store in Alexandria, VA | Marco Polo Oriental Rugs';
  let seoDesc = 'Discover our premium collection of authentic handmade rugs, Persian rugs, vintage runners, and luxurious carpets. Visit our Alexandria showroom for rug cleaning and restoration.';
  
  try {
    const docSnap = await getDoc(doc(db, 'showroom_settings', 'live_website_content'));
    if (docSnap.exists()) {
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
    keywords: 'rugs, handmade rugs, Persian rugs, oriental rugs, Alexandria VA, rug cleaning, rug repair, Washington DC area, Northern Virginia, antique rugs, vintage rugs, Oushak rugs, Turkish rugs, Afghan rugs, Kilim, tribal rugs, wool rugs, silk rugs, hand-knotted rugs, machine-made rugs, runner rugs, oversized rugs, palace size rugs, custom rugs, rug appraisal, rug washing, pet stain removal for rugs, rug odor removal, fringe repair, edge binding, surging, color correction, dye bleeding fix, water damage restoration, moth treatment, rug padding, buy rugs online, luxury carpets, interior design rugs, traditional rugs, modern rugs, geometric rugs, floral rugs, Tabriz, Heriz, Kashan, Isfahan, Qum, Sarouk, Gabbeh, Chobi, Kazak, Arlington VA, McLean VA, Bethesda MD, Chevy Chase MD, Potomac MD, Georgetown DC, Capitol Hill DC, best rug store near me, professional rug cleaning near me, authentic persian carpets',
    alternates: {
      canonical: '/',
    }
  };
}

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
