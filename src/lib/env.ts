/**
 * Environment Variable Validation
 * Validates all required environment variables at startup
 * Fails fast with clear error messages if misconfigured
 */

import { z } from 'zod';

// Environment schema definition
const envSchema = z.object({
  // Database (Required)
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // JWT (Required)
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // App URLs (Required)
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),

  // Admin URL (Optional - defaults to student URL)
  NEXT_PUBLIC_ADMIN_URL: z.string().url().optional(),

  // Stripe (Optional - payment features disabled if not set)
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),

  // SMTP (Optional - email features disabled if not set)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().regex(/^\d+$/).optional(),
  SMTP_SECURE: z.string().optional(),
  SMTP_USER: z.string().email().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // Google Gemini API (Optional)
  GEMINI_API_KEY: z.string().optional(),

  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Parse and validate environment variables
let env: z.infer<typeof envSchema>;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const missingVars = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('\n  - ');
    throw new Error(
      `❌ Environment variable validation failed:\n  - ${missingVars}\n\n` +
      `Please check your .env.local file and ensure all required variables are set.`
    );
  }
  throw error;
}

// Export validated environment variables
export { env };

// Helper to check if feature is enabled
export const isFeatureEnabled = {
  stripe: !!env.STRIPE_SECRET_KEY && !!env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  email: !!env.SMTP_HOST && !!env.SMTP_USER && !!env.SMTP_PASS,
  gemini: !!env.GEMINI_API_KEY,
};

// Log configuration status (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('✅ Environment variables validated');
  console.log(`   - Stripe: ${isFeatureEnabled.stripe ? '✅ Enabled' : '⚠️ Disabled'}`);
  console.log(`   - Email: ${isFeatureEnabled.email ? '✅ Enabled' : '⚠️ Disabled'}`);
  console.log(`   - Gemini: ${isFeatureEnabled.gemini ? '✅ Enabled' : '⚠️ Disabled'}`);
}

