/**
 * Centralized Configuration
 * All URLs and configuration values should come from here
 * No hardcoded localhost URLs anywhere in the codebase
 */

import { env } from './env';

export const config = {
  // Application URLs
  urls: {
    student: env.NEXT_PUBLIC_APP_URL,
    admin: env.NEXT_PUBLIC_ADMIN_URL || env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    api: `${env.NEXT_PUBLIC_APP_URL}/api`,
  },

  // CORS allowed origins
  allowedOrigins: [
    env.NEXT_PUBLIC_APP_URL,
    env.NEXT_PUBLIC_ADMIN_URL,
  ].filter(Boolean) as string[],

  // Environment
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',

  // Feature flags
  features: {
    stripe: !!env.STRIPE_SECRET_KEY && !!env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    email: !!env.SMTP_HOST && !!env.SMTP_USER && !!env.SMTP_PASS,
    gemini: !!env.GEMINI_API_KEY,
  },
} as const;

// Type-safe config access
export type Config = typeof config;

