import { MetadataRoute } from 'next';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Rug } from '@/types';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://marcopolorugs.com';
  
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
  ];

  try {
    // Fetch all rugs from Firebase
    if (db) {
      const rugsRef = collection(db, 'rugs');
      const snapshot = await getDocs(rugsRef);
      
      snapshot.forEach((doc) => {
        const rug = doc.data() as Rug;
        
        // Only include available rugs in sitemap
        if (rug.availability === 'In Stock') {
          routes.push({
            url: `${baseUrl}/shop/${rug.id}`,
            lastModified: new Date(), // Or use rug.createdAt if available
            changeFrequency: 'weekly',
            priority: 0.7,
          });
        }
      });
    }
  } catch (error) {
    console.error("Error generating dynamic sitemap:", error);
  }

  return routes;
}
