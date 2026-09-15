import { Metadata } from 'next';
import { catalogRugForPage } from '@/lib/server/catalog';
import {notFound} from 'next/navigation';
import { ClientRedirect } from './ClientRedirect';
import Link from 'next/link';
import { ArrowLeft, ShoppingBag } from 'lucide-react';



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

  // Render the same product information for visitors and search engines.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": rug.name,
    "image": rug.images?.[0] || '',
    "description": rug.description || `Beautiful ${rug.style} rug from ${rug.origin}. Size: ${rug.dimensions}.`,
    "sku": rug.sku || rug.id,
    "color": rug.colors?.[0] || 'Multi',
    "material": rug.material || 'Wool',
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
    <div className="min-h-screen bg-editorial-bg text-editorial-text p-4 md:p-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }}
      />

      <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
        <Link href="/" className="inline-flex items-center text-sm font-bold uppercase tracking-wider text-neutral-500 hover:text-editorial-accent">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Gallery
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <img
              src={rug.images?.[0] || ''}
              alt={rug.name}
              className="w-full max-h-[70vh] object-contain bg-neutral-100"
            />
          </div>
          <div className="space-y-6">
            <h1 className="text-3xl font-serif text-editorial-text">{rug.name}</h1>
            <p className="text-xl text-neutral-600">${Number(rug.price || 0).toLocaleString()}</p>

            <div className="space-y-2 text-sm text-neutral-500">
              <p><strong>Size:</strong> {rug.dimensions}</p>
              <p><strong>Style:</strong> {rug.style}</p>
              <p><strong>Origin:</strong> {rug.origin}</p>
              <p><strong>Status:</strong> {rug.availability}</p>
              <p><strong>SKU:</strong> {rug.sku || rug.id}</p>
              <p><strong>Material:</strong> {rug.material || "Ask our showroom"}</p>
              <p><strong>Construction:</strong> {rug.manufacturingType || "Ask our showroom"}</p>
              <p className="text-emerald-800 font-semibold">Free rug padding included</p>
            </div>

            <div>
              <h2 className="text-lg font-serif mb-2">Description</h2>
              <p className="text-neutral-600 leading-relaxed text-sm">
                {rug.description}
              </p>
            </div>

            <Link
              href={`/?item=${rug.id}`}
              className="inline-flex items-center justify-center w-full bg-editorial-accent text-white font-bold py-3 px-6 uppercase tracking-wider"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              View photos & add to cart
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
