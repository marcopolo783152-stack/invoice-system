/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' }
    ],
  },
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/shop',
        destination: '/',
      },
      {
        source: '/about',
        destination: '/',
      },
      {
        source: '/cart',
        destination: '/',
      },
      {
        source: '/login',
        destination: '/',
      },
    ]
  },
}

module.exports = nextConfig
