import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/washing-company'],
    },
    sitemap: 'https://www.marcopolorugs.com/sitemap.xml',
  }
}
