const fs = require('fs');
let content = fs.readFileSync('app/(public)/layout.tsx', 'utf8');

const massiveKeywords = "rugs, handmade rugs, Persian rugs, oriental rugs, Alexandria VA, rug cleaning, rug repair, Washington DC area, Northern Virginia, antique rugs, vintage rugs, Oushak rugs, Turkish rugs, Afghan rugs, Kilim, tribal rugs, wool rugs, silk rugs, hand-knotted rugs, machine-made rugs, runner rugs, oversized rugs, palace size rugs, custom rugs, rug appraisal, rug washing, pet stain removal for rugs, rug odor removal, fringe repair, edge binding, surging, color correction, dye bleeding fix, water damage restoration, moth treatment, rug padding, buy rugs online, luxury carpets, interior design rugs, traditional rugs, modern rugs, geometric rugs, floral rugs, Tabriz, Heriz, Kashan, Isfahan, Qum, Sarouk, Gabbeh, Chobi, Kazak, Arlington VA, McLean VA, Bethesda MD, Chevy Chase MD, Potomac MD, Georgetown DC, Capitol Hill DC, best rug store near me, professional rug cleaning near me, authentic persian carpets";

content = content.replace(
  /keywords: 'rugs, handmade rugs, Persian rugs, oriental rugs, Alexandria VA, rug cleaning, rug repair, Washington DC area, Northern Virginia',/,
  `keywords: '${massiveKeywords}',`
);

const enrichedJsonLd = `{
    "@context": "https://schema.org",
    "@type": "Store",
    "name": "Marco Polo Oriental Rugs",
    "image": "https://www.marcopolorugs.com/icon.png",
    "description": "The premier destination for authentic handmade rugs, Persian carpets, vintage runners, and luxury textiles. Expert services include traditional hand-washing, pet stain removal, and master-level rug restoration serving Washington DC, Maryland, and Virginia.",
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
    ],
    "areaServed": [
      { "@type": "City", "name": "Alexandria", "sameAs": "https://en.wikipedia.org/wiki/Alexandria,_Virginia" },
      { "@type": "City", "name": "Washington, D.C.", "sameAs": "https://en.wikipedia.org/wiki/Washington,_D.C." },
      { "@type": "City", "name": "Arlington", "sameAs": "https://en.wikipedia.org/wiki/Arlington_County,_Virginia" },
      { "@type": "City", "name": "Bethesda", "sameAs": "https://en.wikipedia.org/wiki/Bethesda,_Maryland" }
    ],
    "knowsAbout": [
      "Persian Rugs", "Oriental Rugs", "Rug Cleaning", "Rug Repair", "Antique Rug Restoration", "Pet Odor Removal", "Oushak Rugs", "Silk Rugs"
    ]
  }`;

// Use regex to replace the old jsonLd object
content = content.replace(/const jsonLd = \{[\s\S]*?\};\n  return/m, `const jsonLd = ${enrichedJsonLd};\n  return`);

fs.writeFileSync('app/(public)/layout.tsx', content);
