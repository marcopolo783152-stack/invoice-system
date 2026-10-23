import { MetadataRoute } from 'next';
import { catalogIds } from '@/lib/server/catalog';
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.marcopolorugs.com';
  
  // Base static routes
  const routes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/services`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/services/estimate`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  const serviceSlugs = [
    'rug-cleaning-alexandria-va',
    'oriental-rug-cleaning-alexandria-va',
    'persian-rug-cleaning-alexandria-va',
    'rug-repair-alexandria-va',
    'rug-restoration-alexandria-va',
    'pet-stain-odor-removal',
    'rug-pickup-delivery',
    'fine-rug-hand-washing',
    'antique-rug-cleaning',
    'wool-rug-cleaning',
    'silk-delicate-rug-cleaning',
    'fringe-binding-edge-repair',
    'spot-stain-treatment',
    'moth-mildew-treatment',
    'water-damaged-rug-treatment',
    'color-correction-dye-bleed',
    'rug-protection-treatment',
    'rug-pads-custom-padding',
    'rug-appraisals'
  ];

  serviceSlugs.forEach(slug => {
    routes.push({
      url: `${baseUrl}/services/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    });
  });

  for (const id of await catalogIds()) {
    routes.push({url: `${baseUrl}/shop/${id}`, changeFrequency: 'weekly', priority: 0.7});
  }

  return routes;
}
