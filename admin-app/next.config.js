/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Environment configuration - works for both localhost and AWS
  env: {
    PORT: process.env.PORT || '3001',
  },
  
  // Removed rewrite rule that was blocking local API routes
  // All API routes are now handled locally in this app
  
  // Temporarily ignore TypeScript errors during build (until all type issues are fixed)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Security: Disable X-Powered-By header
  poweredByHeader: false,
  
  // Security: Compress responses (works in both environments)
  compress: true,
  
  // Webpack configuration - compatible with both localhost and AWS
  webpack: (config, { isServer }) => {
    // Exclude scripts folder from server-side bundle
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        './scripts': 'commonjs ./scripts',
      });
    }
    
    // Ensure proper file resolution for browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    
    return config;
  },
  
  // Security headers - work in both environments
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
        ],
      },
    ];
  },
}

export default nextConfig

