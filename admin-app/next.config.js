/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    PORT: '3001',
  },
  // Removed rewrite rule that was blocking local API routes
  // All API routes are now handled locally in this app
}

export default nextConfig

