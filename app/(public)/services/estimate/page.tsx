import { Metadata } from 'next';
import ServicePageLayout from '@/components/public/ServicePageLayout';
import EstimateForm from '@/components/public/EstimateForm';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Request a Rug Cleaning or Repair Estimate | Marco Polo Oriental Rugs',
  description: 'Request a professional estimate for rug cleaning, repair, and restoration in Alexandria, VA. Pickup and delivery available for Washington D.C. area.',
  alternates: {
    canonical: '/services/estimate',
  }
};

export default function EstimatePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": "Request a Rug Estimate",
    "description": "Request a professional estimate for rug cleaning, repair, and restoration in Alexandria, VA.",
    "url": "https://www.marcopolorugs.com/services/estimate"
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.marcopolorugs.com/" },
      { "@type": "ListItem", "position": 2, "name": "Services", "item": "https://www.marcopolorugs.com/services" },
      { "@type": "ListItem", "position": 3, "name": "Request Estimate", "item": "https://www.marcopolorugs.com/services/estimate" }
    ]
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      
      <ServicePageLayout
        title="Request an Estimate"
        subtitle="Submit your rug details and photos below. Our master artisans will evaluate the condition and provide a comprehensive service estimate."
      >
        <section>
          <EstimateForm />
        </section>

        <section className="mt-16 bg-white border border-neutral-100 p-8 shadow-sm">
          <h2 className="text-2xl font-serif mb-4 flex items-center">
            <Sparkles className="w-5 h-5 mr-3 text-editorial-accent" />
            What Happens Next?
          </h2>
          <ul className="space-y-4">
            <li className="flex items-start">
              <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-neutral-800">1. Artisan Evaluation</strong>
                <span className="text-neutral-500 text-sm leading-relaxed block mt-1">Our experts will review your submitted photos and notes to determine the optimal traditional treatments for your rug.</span>
              </div>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-neutral-800">2. We Contact You</strong>
                <span className="text-neutral-500 text-sm leading-relaxed block mt-1">We will reach out via phone or email to discuss the condition, provide an estimate, and answer any questions you have.</span>
              </div>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-neutral-800">3. Logistics & Care</strong>
                <span className="text-neutral-500 text-sm leading-relaxed block mt-1">If you proceed, you can drop off the rug at our Alexandria showroom or we will arrange for local pickup.</span>
              </div>
            </li>
          </ul>
        </section>
      </ServicePageLayout>
    </>
  );
}
