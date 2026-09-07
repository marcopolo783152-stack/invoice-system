const fs = require('fs');
let content = fs.readFileSync('app/(public)/layout.tsx', 'utf8');

content = content.replace(
`export const metadata: Metadata = {
  metadataBase: new URL('https://www.marcopolorugs.com'),
  title: 'Oriental & Persian Rug Store in Alexandria, VA | Marco Polo Oriental Rugs',
  description: 'Discover our premium collection of authentic handmade rugs, Persian rugs, vintage runners, and luxurious carpets. Visit our Alexandria showroom for rug cleaning and restoration.',
  keywords: 'rugs, handmade rugs, Persian rugs, oriental rugs, Alexandria VA, rug cleaning, rug repair, Washington DC area, Northern Virginia',
  alternates: {
    canonical: '/',
  }
};`,
`import { db } from '@/lib/firebase';
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
    keywords: 'rugs, handmade rugs, Persian rugs, oriental rugs, Alexandria VA, rug cleaning, rug repair, Washington DC area, Northern Virginia',
    alternates: {
      canonical: '/',
    }
  };
}`
);

fs.writeFileSync('app/(public)/layout.tsx', content);
