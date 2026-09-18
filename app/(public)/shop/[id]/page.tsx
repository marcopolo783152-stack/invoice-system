import { Metadata } from 'next';
import { catalogRugForPage } from '@/lib/server/catalog';
import {notFound} from 'next/navigation';
import { ClientRedirect } from './ClientRedirect';
import Link from 'next/link';
import ShowroomApp from '@/components/public/ShowroomApp';
import {Rug} from '@/types';



// Revalidate this page occasionally to keep data fresh for SEO
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const rug = await catalogRugForPage(params.id);

  if (!rug) {
    return { title: 'Rug Details | Marco Polo Rugs', robots: { index: false, follow: true } };
  }

  return {
    title: `${rug.name} | Marco Polo Rugs`,
    alternates: {canonical: `https://www.marcopolorugs.com/shop/${rug.id}`},
    description: rug.description || `Beautiful ${rug.style} rug from ${rug.origin}. Size: ${rug.dimensions}.`,
    openGraph: {
      title: `${rug.name} | Marco Polo Oriental Rugs`,
      description: rug.description || `Beautiful ${rug.style} rug from ${rug.origin}. Size: ${rug.dimensions}.`,
      images: [
        {
          url: rug.images?.[0] || '',
          width: 800,
          height: 600,
          alt: rug.name,
        },
      ],
    },
  };
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const rug = await catalogRugForPage(params.id);

  if (rug === undefined) {
    return (
      <main className="min-h-screen p-8 text-center">
        <h1 className="text-2xl font-serif">Marco Polo Rugs</h1>
        <p className="my-4">Opening this rug in our gallery…</p>
        <Link href={`/?item=${encodeURIComponent(params.id)}`} className="underline">View rug photos and details</Link>
        <ClientRedirect rugId={params.id} />
      </main>
    );
  }
  if (!rug) notFound();

  const publicRug = Object.fromEntries(['id','name','sku','price','originalPrice','dimensions','sizeCategory','origin','material','style','age','condition','colors','shape','availability','construction','manufacturingType','description','images','weightLbs','isFreeShipping'].filter(key=>(rug as any)[key] !== undefined).map(key=>[key,(rug as any)[key]]));
  // Render the same product information for visitors and search engines.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": rug.name,
    "image": rug.images?.[0] || '',
    "description": rug.description || `Beautiful ${rug.style} rug from ${rug.origin}. Size: ${rug.dimensions}.`,
    "sku": rug.sku || rug.id,
    "color": rug.colors?.[0] || undefined,
    "material": rug.material || undefined,
    "additionalProperty": [
      {
        "@type": "PropertyValue",
        "name": "Dimensions",
        "value": rug.dimensions
      },
      {
        "@type": "PropertyValue",
        "name": "Style",
        "value": rug.style
      },
      {
        "@type": "PropertyValue",
        "name": "Origin",
        "value": rug.origin
      }
    ],
    "offers": {
      "@type": "Offer",
      "url": `https://www.marcopolorugs.com/shop/${rug.id}`,
      "priceCurrency": "USD",
      "price": rug.price,

      "availability": rug.availability === "In Stock" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": "Marco Polo Oriental Rugs"
      }
    }
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.marcopolorugs.com/" },
      { "@type": "ListItem", "position": 2, "name": "Shop", "item": "https://www.marcopolorugs.com/" },
      { "@type": "ListItem", "position": 3, "name": rug.name, "item": `https://www.marcopolorugs.com/shop/${rug.id}` }
    ]
  };

  return (
    <div className="min-h-screen bg-editorial-bg text-editorial-text">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }}
      />

      <ShowroomApp initialRugId={rug.id} initialRug={JSON.parse(JSON.stringify(publicRug)) as Rug}/>
    </div>
  );
}
