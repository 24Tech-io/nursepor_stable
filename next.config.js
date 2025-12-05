/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security: Disable X-Powered-By header
  poweredByHeader: false,
  
  // Security: Enable strict mode
  reactStrictMode: true,
  
  // Security: Compress responses
  compress: true,
  
  // Note: output: 'standalone' is disabled for AWS Amplify deployment
  // Uncomment if deploying to Docker/containers
  // output: 'standalone',
  
  // Next.js 15 optimizations
  experimental: {
    // Enable Webpack build worker for faster builds
    webpackBuildWorker: true,
    
    // Turbopack for faster development (Next.js 15+)
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  
  // Temporarily ignore TypeScript errors during build (until all type issues are fixed)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Fix for face-api.js trying to use 'fs' module in browser
  webpack: (config, { isServer }) => {
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
  
  // Security: Headers (additional to middleware)
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
            key: 'X-Download-Options',
            value: 'noopen'
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none'
          },
        ],
      },
    ];
  },
}

export default nextConfig
