import { Metadata } from 'next';
import ServicePageLayout from '@/components/public/ServicePageLayout';
import Link from 'next/link';
import { ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import EstimateForm from '@/components/public/EstimateForm';

export const metadata: Metadata = {
  title: 'Rug Repair & Restoration in Alexandria, VA | Marco Polo Oriental Rugs',
  description: 'Expert handmade and area rug repair and restoration in Alexandria, VA. We reweave holes, fix fringes, and restore colors to their original glory.',
  alternates: {
    canonical: '/services/rug-repair-restoration-alexandria-va',
  }
};

export default function RepairServicePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Rug Repair & Restoration in Alexandria, VA",
    "provider": {
      "@type": "LocalBusiness",
      "name": "Marco Polo Oriental Rugs",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "3260 Duke St",
        "addressLocality": "Alexandria",
        "addressRegion": "VA",
        "postalCode": "22314"
      }
    },
    "areaServed": ["Alexandria, VA", "Northern Virginia", "Washington, D.C."],
    "description": "Expert handmade and area rug repair and restoration in Alexandria, VA. We reweave holes, fix fringes, and restore colors to their original glory."
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.marcopolorugs.com/" },
      { "@type": "ListItem", "position": 2, "name": "Services", "item": "https://www.marcopolorugs.com/services" },
      { "@type": "ListItem", "position": 3, "name": "Rug Repair & Restoration", "item": "https://www.marcopolorugs.com/services/rug-repair-restoration-alexandria-va" }
    ]
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      
      <ServicePageLayout
        title="Rug Repair & Restoration in Alexandria, VA"
        subtitle="Expert handmade and area rug repair and restoration in Alexandria, VA. We reweave holes, fix fringes, and restore colors to their original glory."
      >
        <section>
          <h2 className="text-2xl font-serif mb-4 flex items-center">
            <Sparkles className="w-5 h-5 mr-3 text-editorial-accent" />
            Our Restoration Artisans
          </h2>
          <p className="text-neutral-600 leading-relaxed mb-6 font-light">
            With over 40 years of experience, our master weavers have restored thousands of antique and oriental rugs. We use authentic wools, silks, and natural dyes to perfectly match your rug's original construction.
          </p>
          <ul className="space-y-4">
            <li className="flex items-start">
              <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-neutral-800">Fringe & Edge Repair</strong>
                <span className="text-neutral-500 text-sm">Securing unraveling edges and meticulously replacing damaged fringe to prevent further wear.</span>
              </div>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-neutral-800">Hole & Tear Reweaving</strong>
                <span className="text-neutral-500 text-sm">Re-building the foundation and hand-knotting new pile to seamlessly conceal damage.</span>
              </div>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-neutral-800">Color Restoration</strong>
                <span className="text-neutral-500 text-sm">Correcting dye bleeding and sun fading with specialized touch-up techniques.</span>
              </div>
            </li>
          </ul>
        </section>

        <hr className="border-neutral-100" />

        <section>
          <h2 className="text-2xl font-serif mb-4 flex items-center">
            <Sparkles className="w-5 h-5 mr-3 text-editorial-accent" />
            Request a Repair Estimate
          </h2>
          <EstimateForm />
        </section>
      </ServicePageLayout>
    </>
  );
}
