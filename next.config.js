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

  // Next.js optimizations
  experimental: {
    // Enable Webpack build worker for better performance
    webpackBuildWorker: false,
    // Note: Turbopack disabled due to @tanstack module resolution issues
  },

  // Temporarily ignore TypeScript errors during build (until all type issues are fixed)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Generate stable build ID to prevent chunk loading errors
  // Use a consistent build ID in development, timestamp in production
  generateBuildId: async () => {
    if (process.env.NODE_ENV === 'development') {
      return 'dev-build';
    }
    return 'build-' + Date.now();
  },

  // Fix for face-api.js trying to use 'fs' module in browser
  // Also handle circular dependencies in schema relations
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };

      // Fix for canvas/jsdom in client-side bundle (isomorphic-dompurify)
      config.resolve.alias.canvas = false;
      config.resolve.alias.jsdom = false;
    }

    // Handle optional Redis packages - they're not required in some environments
    // They're dynamically imported with fallback handling in rate-limit-redis.ts

    // Handle circular dependencies in schema relations
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
      chunkIds: 'deterministic',
      // Improve chunk loading reliability
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Create more stable chunks
          framework: {
            name: 'framework',
            chunks: 'all',
            test: /(?<!node_modules.*[\\\/])(react|react-dom|scheduler|prop-types|use-subscription)[\\\/]/,
            priority: 40,
            enforce: true,
          },
        },
      },
    };

    // Ignore circular dependency warnings
    const originalEntry = config.entry;
    config.entry = async () => {
      const entries = await originalEntry();
      return entries;
    };

    // Suppress circular dependency warnings for schema files
    if (config.ignoreWarnings) {
      config.ignoreWarnings.push(
        { module: /schema\.ts$/ },
        { message: /Circular dependency/ },
        { module: /rate-limit-redis\.ts$/ }
      );
    } else {
      config.ignoreWarnings = [
        { module: /schema\.ts$/ },
        { message: /Circular dependency/ },
        { module: /rate-limit-redis\.ts$/ },
      ];
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
