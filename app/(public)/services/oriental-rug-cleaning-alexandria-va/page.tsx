import { Metadata } from 'next';
import ServicePageLayout from '@/components/public/ServicePageLayout';
import Link from 'next/link';
import { ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Oriental & Persian Rug Cleaning in Alexandria | Marco Polo Oriental Rugs',
  description: 'Specialized cleaning for authentic Oriental and Persian rugs in Alexandria, Virginia. Trust our master artisans with your heirloom rugs.',
  alternates: {
    canonical: '/services/oriental-rug-cleaning-alexandria-va',
  }
};

export default function ServicePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Oriental & Persian Rug Cleaning in Alexandria",
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
    "description": "Specialized cleaning for authentic Oriental and Persian rugs in Alexandria, Virginia. Trust our master artisans with your heirloom rugs."
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.marcopolorugs.com/" },
      { "@type": "ListItem", "position": 2, "name": "Services", "item": "https://www.marcopolorugs.com/services" },
      { "@type": "ListItem", "position": 3, "name": "Oriental & Persian Rug Cleaning", "item": "https://www.marcopolorugs.com/services/oriental-rug-cleaning-alexandria-va" }
    ]
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      
      <ServicePageLayout
        title="Oriental & Persian Rug Cleaning in Alexandria"
        subtitle="Specialized cleaning for authentic Oriental and Persian rugs in Alexandria, Virginia. Trust our master artisans with your heirloom rugs."
      >
        <section>
          <h2 className="text-2xl font-serif mb-4 flex items-center">
            <Sparkles className="w-5 h-5 mr-3 text-editorial-accent" />
            Our Oriental & Persian Rug Cleaning Process
          </h2>
          <p className="text-neutral-600 leading-relaxed mb-6 font-light">
            At Marco Polo Oriental Rugs in Alexandria, VA, we treat every rug as a unique work of art. Our oriental & persian rug cleaning service is tailored to the specific weave, dyes, and condition of your piece.
          </p>
          <ul className="space-y-4">
            <li className="flex items-start">
              <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-neutral-800">Initial Inspection</strong>
                <span className="text-neutral-500 text-sm">Careful assessment of fibers, dyes, and existing damage.</span>
              </div>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-neutral-800">Tailored Treatment</strong>
                <span className="text-neutral-500 text-sm">Specialized care using traditional and safe methods for your specific rug type.</span>
              </div>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-neutral-800">Final Quality Check</strong>
                <span className="text-neutral-500 text-sm">Rigorous inspection by our master artisans before the rug is returned to you.</span>
              </div>
            </li>
          </ul>
        </section>

        <hr className="border-neutral-100" />

        <section>
          <h2 className="text-2xl font-serif mb-4 flex items-center">
            <ShieldCheck className="w-5 h-5 mr-3 text-editorial-accent" />
            Rugs We Care For
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-neutral-600 font-light">
            <ul className="space-y-2 list-disc list-inside">
              <li>Persian Rugs</li>
              <li>Oriental Rugs</li>
              <li>Antique Rugs</li>
              <li>Turkish Rugs</li>
            </ul>
            <ul className="space-y-2 list-disc list-inside">
              <li>Wool Rugs</li>
              <li>Silk Rugs</li>
              <li>Afghan Rugs</li>
              <li>Runners</li>
            </ul>
          </div>
        </section>
      </ServicePageLayout>
    </>
  );
}
