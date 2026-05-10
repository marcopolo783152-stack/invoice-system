import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Marco Polo Invoice System',
    short_name: 'MNS Invoices',
    description: 'Marco Polo Oriental Rugs Management System',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#4f46e5',
    icons: [
      {
        src: '/LOGO.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/LOGO.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
