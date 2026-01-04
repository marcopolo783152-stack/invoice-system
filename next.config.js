/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Disabled to allow API routes for email
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  reactStrictMode: true,
}

module.exports = nextConfig
