import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Star } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Rug Cleaning, Repair & Restoration Services in Alexandria, VA | Marco Polo',
  description: 'Expert handmade rug cleaning, repair, restoration, and pet odor removal in Alexandria, VA. Trusted master artisans serving Washington, D.C. and Northern Virginia.',
  alternates: {
    canonical: '/services',
  }
};

const services = [
  { slug: 'rug-cleaning-alexandria-va', title: 'Professional Area Rug Cleaning', description: 'Expert cleaning for all types of handmade and area rugs to restore their natural beauty.' },
  { slug: 'oriental-rug-cleaning-alexandria-va', title: 'Oriental & Persian Rug Cleaning', description: 'Specialized care for authentic Oriental and Persian masterpieces.' },
  { slug: 'persian-rug-cleaning-alexandria-va', title: 'Persian Rug Cleaning', description: 'Traditional hand-washing for Persian rugs.' },
  { slug: 'fine-rug-hand-washing', title: 'Fine Rug Hand Washing', description: 'Traditional submerged hand-washing for delicate silk and antique rugs.' },
  { slug: 'antique-rug-cleaning', title: 'Antique Rug Cleaning', description: 'Chemical-free cleaning for fragile antique rugs to ensure preservation.' },
  { slug: 'wool-rug-cleaning', title: 'Wool Rug Cleaning', description: 'Deep cleaning that restores softness and vibrant colors to wool area rugs.' },
  { slug: 'silk-delicate-rug-cleaning', title: 'Silk & Delicate Rug Cleaning', description: 'Low-moisture protocols for pure silk and silk-blend rugs.' },
  { slug: 'rug-repair-alexandria-va', title: 'Rug Repair', description: 'Professional repair including fringing, binding, and surging.' },
  { slug: 'rug-restoration-alexandria-va', title: 'Rug Restoration & Reweaving', description: 'Precise color and knot matching to restore holes and severe damage.' },
  { slug: 'fringe-binding-edge-repair', title: 'Fringe, Binding, and Edge Repair', description: 'Secure borders with expert fringe replacement and edge surging.' },
  { slug: 'pet-stain-odor-removal', title: 'Pet Stain & Odor Removal', description: 'Enzymatic treatment to permanently remove accidents without damaging dyes.' },
  { slug: 'spot-stain-treatment', title: 'Spot & Stain Treatment', description: 'Targeted removal of wine, coffee, ink, and food stains.' },
  { slug: 'moth-mildew-treatment', title: 'Moth & Mildew Treatment', description: 'Eradicate pests and mildew followed by preventative care.' },
  { slug: 'water-damaged-rug-treatment', title: 'Water-Damaged Rug Treatment', description: 'Emergency restorative care for flood and leak damage.' },
  { slug: 'color-correction-dye-bleed', title: 'Color Correction & Dye-Bleed', description: 'Advanced correction to fix dye migration and bleeding.' },
  { slug: 'rug-protection-treatment', title: 'Rug Protection Treatment', description: 'Stain-repellent treatments to protect fibers from wear and spills.' },
  { slug: 'rug-pickup-delivery', title: 'Rug Pickup & Delivery', description: 'Convenient pickup and delivery across Alexandria and D.C.' },
  { slug: 'rug-pads-custom-padding', title: 'Rug Pads & Custom Padding', description: 'Custom-cut padding to prevent slipping and protect floors.' },
  { slug: 'rug-appraisals', title: 'Rug Appraisals', description: 'Written appraisals for insurance, estate, and resale.' }
];

export default function ServicesHub() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Services Hub - Marco Polo Oriental Rugs",
    "url": "https://www.marcopolorugs.com/services"
  };

  return (
    <div className="min-h-screen bg-stone-50 text-editorial-text selection:bg-editorial-accent/20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      
      {/* Header */}
      <div className="bg-neutral-900 pt-32 pb-16 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-serif text-white mb-4">Master Artisan Services</h1>
        <p className="text-neutral-300 max-w-2xl mx-auto font-light leading-relaxed">
          Preserving the legacy of your fine rugs through traditional, handcrafted care. From delicate hand-washing to expert reweaving, Marco Polo Oriental Rugs offers unmatched expertise in Alexandria, VA.
        </p>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((svc) => (
            <Link 
              key={svc.slug} 
              href={`/services/${svc.slug}`}
              className="group bg-white border border-neutral-100 p-8 shadow-sm hover:shadow-md hover:border-editorial-accent/30 transition-all flex flex-col"
            >
              <div className="text-editorial-accent mb-4">
                <Star className="w-6 h-6 opacity-80" />
              </div>
              <h3 className="text-xl font-serif mb-2 text-editorial-text group-hover:text-editorial-accent transition-colors">
                {svc.title}
              </h3>
              <p className="text-sm text-neutral-500 font-light leading-relaxed mb-6 flex-grow">
                {svc.description}
              </p>
              <div className="mt-auto inline-flex items-center text-xs font-bold uppercase tracking-widest text-neutral-400 group-hover:text-editorial-accent transition-colors">
                Explore Service <ArrowRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
