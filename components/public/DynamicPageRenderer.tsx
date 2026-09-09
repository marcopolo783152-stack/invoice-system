'use client';

import React, { useEffect, useState } from 'react';
import { getCMSPageBySlug, getCMSSettings } from '@/lib/cms-api';
import { CMSPage, CMSSettings, CMSSection } from './WebsiteBuilderTypes';
import { useStore } from '@/context/StoreContext';
import { Hero } from './Hero'; // fallback 
// Import standard components for the frontend blocks
// We can use the existing components where possible or create simple renderer blocks.

export const DynamicPageRenderer = ({ slug, fallback }: { slug: string, fallback: React.ReactNode }) => {
  const [page, setPage] = useState<CMSPage | null>(null);
  const [settings, setSettings] = useState<CMSSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [p, s] = await Promise.all([
          getCMSPageBySlug(slug),
          getCMSSettings()
        ]);
        if (p) setPage(p);
        if (s) setSettings(s);
      } catch (err) {
        console.error("Error loading dynamic page", err);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center">Loading...</div>;

  // If no dynamic page exists for this slug, or it has no sections, use the hardcoded fallback
  if (!page || page.sections.length === 0 || page.status !== 'published') {
    return <>{fallback}</>;
  }

  // Apply global settings via CSS variables or wrapper styles
  const style = settings ? {
    '--color-primary': settings.primaryColor,
    '--color-bg': settings.backgroundColor,
    '--color-text': settings.textColor,
    '--radius': settings.borderRadius
  } as React.CSSProperties : {};

  return (
    <div className="dynamic-page" style={style}>
      {page.sections.filter(s => s.enabled).sort((a,b) => a.order - b.order).map(section => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </div>
  );
};

const SectionRenderer = ({ section }: { section: CMSSection }) => {
  const { type, content } = section;

  switch (type) {
    case 'hero':
      return (
        <div className="relative py-24 px-6 flex items-center justify-center bg-cover bg-center text-center" style={{ backgroundImage: `url(${content.backgroundImage || ''})` }}>
          <div className="absolute inset-0 bg-black" style={{ opacity: parseFloat(content.overlayOpacity || '0.5') }}></div>
          <div className="relative z-10 max-w-4xl mx-auto space-y-6 text-white">
            <h1 className="text-4xl md:text-6xl font-serif font-bold">{content.title}</h1>
            {content.subtitle && <p className="text-xl uppercase tracking-widest text-amber-500">{content.subtitle}</p>}
            {content.description && <p className="text-lg font-light max-w-2xl mx-auto">{content.description}</p>}
            {content.buttonText && (
              <a href={content.buttonLink} className="inline-block px-8 py-3 bg-amber-800 hover:bg-amber-900 text-white font-bold uppercase tracking-wider text-sm transition">
                {content.buttonText}
              </a>
            )}
          </div>
        </div>
      );
      
    case 'text':
      return (
        <div className="py-16 px-6" style={{ backgroundColor: content.backgroundColor, color: content.textColor }}>
          <div className="max-w-4xl mx-auto" style={{ textAlign: content.alignment as any || 'left' }}>
            <h2 className="text-3xl font-serif font-bold mb-6">{content.heading}</h2>
            <div className="prose max-w-none text-lg font-light" dangerouslySetInnerHTML={{ __html: content.content?.replace(/\n/g, '<br />') }} />
          </div>
        </div>
      );
      
    case 'image-banner':
      return (
        <div className="w-full">
          {content.link ? (
            <a href={content.link} className="block"><img src={content.imageUrl} alt={content.altText} className="w-full h-auto" /></a>
          ) : (
            <img src={content.imageUrl} alt={content.altText} className="w-full h-auto" />
          )}
        </div>
      );
      
    case 'custom-html':
      return (
        <div dangerouslySetInnerHTML={{ __html: content.html }} />
      );

    case 'services':
      return (
        <div className="py-16 bg-stone-50 px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-serif font-bold text-neutral-900 mb-4">{content.title}</h2>
            <p className="text-neutral-600 mb-8">{content.description}</p>
            {/* The existing ProfessionalServices could be embedded here, but we'll leave a placeholder for now */}
            <a href="/services" className="text-amber-800 font-bold uppercase tracking-wider text-sm hover:underline">View All Services</a>
          </div>
        </div>
      );

    // Fallbacks for complex components could render the actual hardcoded ones
    // but parameterized if needed!
    default:
      return <div className="p-4 border border-dashed border-red-300 text-red-500 text-center">Unsupported section type: {type}</div>;
  }
};
