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
  async redirects() {
    return [
      {
        source: '/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})/:slug',
        destination: '/',
        permanent: true,
      },
      {
        source: '/product/:slug',
        destination: '/',
        permanent: true,
      },
      {
        source: '/product-category/:slug*',
        destination: '/shop',
        permanent: true,
      },
    ]
  }
}

module.exports = nextConfig
