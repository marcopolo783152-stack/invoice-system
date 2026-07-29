import { Metadata } from 'next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Rug } from '@/types';
import Link from 'next/link';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import { ClientRedirect } from './ClientRedirect';

// Revalidate this page occasionally to keep data fresh for SEO
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  let rug: Rug | null = null;
  
  try {
    if (db) {
      const docRef = doc(db, 'rugs', params.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        rug = docSnap.data() as Rug;
      }
    }
  } catch (error) {
    console.error("Metadata fetch error:", error);
  }

  if (!rug) {
    return { title: 'Rug Not Found | Marco Polo Rugs' };
  }

  return {
    title: `${rug.name} | Marco Polo Oriental Rugs`,
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
  let rug: Rug | null = null;

  try {
    if (db) {
      const docRef = doc(db, 'rugs', params.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        rug = docSnap.data() as Rug;
      }
    }
  } catch (error) {
    console.error("Page fetch error:", error);
  }

  if (!rug) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-editorial-bg text-editorial-text">
        <h1 className="text-2xl font-serif mb-4">Rug Not Found</h1>
        <Link href="/" className="text-editorial-accent hover:underline">
          Return to Gallery
        </Link>
      </div>
    );
  }

  // Googlebot will see this static HTML with all the important keywords!
  // Human users will run ClientRedirect and instantly load the beautiful SPA modal.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": rug.name,
    "image": rug.images?.[0] || '',
    "description": rug.description || `Beautiful ${rug.style} rug from ${rug.origin}. Size: ${rug.dimensions}.`,
    "sku": rug.sku || rug.id,
    "offers": {
      "@type": "Offer",
      "url": `https://www.marcopolorugs.com/shop/${rug.id}`,
      "priceCurrency": "USD",
      "price": rug.price,
      "itemCondition": "https://schema.org/NewCondition",
      "availability": rug.availability === "In Stock" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": "Marco Polo Oriental Rugs"
      }
    }
  };

  return (
    <div className="min-h-screen bg-editorial-bg text-editorial-text p-4 md:p-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Client Component that immediately redirects humans to the SPA view */}
      <ClientRedirect rugId={params.id} />
      
      {/* Static SEO Content below (humans briefly see this or not at all, bots index this!) */}
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
              className="w-full aspect-[4/3] object-cover bg-neutral-100"
            />
          </div>
          <div className="space-y-6">
            <h1 className="text-3xl font-serif text-editorial-text">{rug.name}</h1>
            <p className="text-xl text-neutral-600">${rug.price.toLocaleString()}</p>
            
            <div className="space-y-2 text-sm text-neutral-500">
              <p><strong>Size:</strong> {rug.dimensions}</p>
              <p><strong>Style:</strong> {rug.style}</p>
              <p><strong>Origin:</strong> {rug.origin}</p>
              <p><strong>Status:</strong> {rug.availability}</p>
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
              View in Showroom
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
