/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
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
