const fs = require('fs');
const path = require('path');

const services = [
  { slug: 'rug-cleaning-alexandria-va', title: 'Professional Area Rug Cleaning in Alexandria, VA', shortTitle: 'Professional Area Rug Cleaning', description: 'Expert handmade and area rug cleaning in Alexandria, VA. We remove deep soil, stains, and odors while protecting delicate fibers.' },
  { slug: 'oriental-rug-cleaning-alexandria-va', title: 'Oriental & Persian Rug Cleaning in Alexandria', shortTitle: 'Oriental & Persian Rug Cleaning', description: 'Specialized cleaning for authentic Oriental and Persian rugs in Alexandria, Virginia. Trust our master artisans with your heirloom rugs.' },
  { slug: 'persian-rug-cleaning-alexandria-va', title: 'Persian Rug Cleaning Services | Alexandria, VA', shortTitle: 'Persian Rug Cleaning', description: 'Gentle, traditional hand-washing for Persian rugs in Northern Virginia. We preserve the natural lanolin, dyes, and intricate weaves.' },
  { slug: 'rug-repair-alexandria-va', title: 'Expert Rug Repair in Alexandria, VA', shortTitle: 'Rug Repair', description: 'Professional rug repair services in Alexandria including fringe repair, binding, edge surging, and hole reweaving.' },
  { slug: 'rug-restoration-alexandria-va', title: 'Antique Rug Restoration | Alexandria & Northern Virginia', shortTitle: 'Rug Restoration and Reweaving', description: 'Master restoration and reweaving for antique and damaged rugs. We precisely match fibers, dyes, and knots to restore your rug.' },
  { slug: 'pet-stain-odor-removal', title: 'Pet Stain & Odor Removal for Fine Rugs', shortTitle: 'Pet Stain and Odor Removal', description: 'Enzymatic pet stain and odor removal for Oriental and Persian rugs. We permanently remove accidents without damaging delicate dyes.' },
  { slug: 'rug-pickup-delivery', title: 'Rug Pickup & Delivery in Alexandria, VA', shortTitle: 'Rug Pickup and Delivery', description: 'Convenient rug pickup and delivery services for cleaning and repair across Alexandria, Arlington, and Washington, D.C.' },
  { slug: 'fine-rug-hand-washing', title: 'Fine Rug Hand Washing Services', shortTitle: 'Fine Rug Hand Washing', description: 'Traditional submerged hand-washing for delicate silk, antique, and fine wool rugs.' },
  { slug: 'antique-rug-cleaning', title: 'Antique Rug Cleaning Experts', shortTitle: 'Antique Rug Cleaning', description: 'Careful, chemical-free cleaning for fragile antique rugs to ensure their preservation for generations.' },
  { slug: 'wool-rug-cleaning', title: 'Wool Rug Cleaning | Alexandria, VA', shortTitle: 'Wool Rug Cleaning', description: 'Deep cleaning for wool area rugs that restores softness, vibrant colors, and removes embedded dust.' },
  { slug: 'silk-delicate-rug-cleaning', title: 'Silk & Delicate Rug Cleaning', shortTitle: 'Silk and Delicate Rug Cleaning', description: 'Specialized low-moisture and delicate washing protocols for pure silk and silk-blend rugs.' },
  { slug: 'fringe-binding-edge-repair', title: 'Fringe, Binding, and Edge Repair', shortTitle: 'Fringe, Binding, and Edge Repair', description: 'Secure your rug\'s borders with professional fringe replacement, binding, and edge surging.' },
  { slug: 'spot-stain-treatment', title: 'Rug Spot & Stain Treatment', shortTitle: 'Spot and Stain Treatment', description: 'Targeted removal of wine, coffee, ink, and food stains from fine handmade rugs.' },
  { slug: 'moth-mildew-treatment', title: 'Moth & Mildew Treatment for Rugs', shortTitle: 'Moth and Mildew Treatment', description: 'Eradicate moth larvae and mildew from wool and silk rugs, followed by preventative treatments.' },
  { slug: 'water-damaged-rug-treatment', title: 'Water-Damaged Rug Treatment', shortTitle: 'Water-Damaged Rug Treatment', description: 'Emergency and restorative care for rugs damaged by floods, leaks, or water exposure.' },
  { slug: 'color-correction-dye-bleed', title: 'Color Correction & Dye-Bleed Treatment', shortTitle: 'Color Correction and Dye-Bleed Treatment', description: 'Advanced color correction to fix dye migration and bleeding in handmade rugs.' },
  { slug: 'rug-protection-treatment', title: 'Rug Protection Treatment', shortTitle: 'Rug Protection Treatment', description: 'Stain-repellent treatments that protect your rug\'s fibers from spills and premature wear.' },
  { slug: 'rug-pads-custom-padding', title: 'Custom-Fitted Rug Pads', shortTitle: 'Rug Pads and Custom-Fitted Padding', description: 'High-quality, custom-cut rug padding to prevent slipping, protect your floors, and extend the life of your rug.' },
  { slug: 'rug-appraisals', title: 'Professional Rug Appraisals', shortTitle: 'Rug Appraisals', description: 'Certified written appraisals for insurance, estate, and resale purposes by our master rug experts.' }
];

const template = (service) => `import { Metadata } from 'next';
import ServicePageLayout from '@/components/public/ServicePageLayout';
import Link from 'next/link';
import { ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: '${service.title} | Marco Polo Oriental Rugs',
  description: '${service.description.replace(/'/g, "\\'")}',
  alternates: {
    canonical: '/services/${service.slug}',
  }
};

export default function ServicePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "${service.title}",
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
    "description": "${service.description.replace(/'/g, "\\'")}"
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.marcopolorugs.com/" },
      { "@type": "ListItem", "position": 2, "name": "Services", "item": "https://www.marcopolorugs.com/services" },
      { "@type": "ListItem", "position": 3, "name": "${service.shortTitle}", "item": "https://www.marcopolorugs.com/services/${service.slug}" }
    ]
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      
      <ServicePageLayout
        title="${service.title}"
        subtitle="${service.description.replace(/'/g, "&apos;")}"
      >
        <section>
          <h2 className="text-2xl font-serif mb-4 flex items-center">
            <Sparkles className="w-5 h-5 mr-3 text-editorial-accent" />
            Our ${service.shortTitle} Process
          </h2>
          <p className="text-neutral-600 leading-relaxed mb-6 font-light">
            At Marco Polo Oriental Rugs in Alexandria, VA, we treat every rug as a unique work of art. Our ${service.shortTitle.toLowerCase()} service is tailored to the specific weave, dyes, and condition of your piece.
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
`;

const baseDir = path.join(__dirname, 'app', '(public)', 'services');
if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}

services.forEach(service => {
  const dir = path.join(baseDir, service.slug);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(path.join(dir, 'page.tsx'), template(service));
});

console.log('Generated ' + services.length + ' service pages.');
