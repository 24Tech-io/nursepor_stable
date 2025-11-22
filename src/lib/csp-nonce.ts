/**
 * Content Security Policy with Nonce Support
 * Implements strict CSP with nonce-based inline script/style execution
 */

import crypto from 'crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Generate a cryptographically secure nonce
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Build a strict Content Security Policy with nonce
 */
export function buildCSP(nonce: string): string {
  const cspDirectives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      'https://js.stripe.com', // Stripe payment gateway
      'https://checkout.stripe.com',
      "'strict-dynamic'", // Allow dynamically loaded scripts from trusted sources
    ],
    'style-src': [
      "'self'",
      `'nonce-${nonce}'`,
      'https://fonts.googleapis.com',
    ],
    'img-src': [
      "'self'",
      'data:', // For inline images
      'blob:', // For blob URLs
      'https:', // Allow images from HTTPS sources
    ],
    'font-src': [
      "'self'",
      'data:',
      'https://fonts.gstatic.com',
    ],
    'connect-src': [
      "'self'",
      'https://api.stripe.com',
      'https://checkout.stripe.com',
    ],
    'frame-src': [
      "'self'",
      'https://js.stripe.com',
      'https://checkout.stripe.com',
    ],
    'object-src': ["'none'"], // Disallow plugins like Flash
    'base-uri': ["'self'"], // Prevent base tag injection
    'form-action': ["'self'"], // Only allow form submissions to same origin
    'frame-ancestors': ["'none'"], // Prevent clickjacking
    'upgrade-insecure-requests': [], // Upgrade HTTP to HTTPS
    'block-all-mixed-content': [], // Block mixed content
  };

  return Object.entries(cspDirectives)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive;
      }
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');
}

/**
 * Apply CSP headers to a response with nonce
 */
export function applyCSPHeaders(
  response: NextResponse,
  nonce: string,
  reportOnly: boolean = false
): void {
  const csp = buildCSP(nonce);
  const headerName = reportOnly
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy';
  
  response.headers.set(headerName, csp);
}

/**
 * Create a CSP middleware that injects nonce into requests
 */
export function createCSPMiddleware(request: NextRequest): {
  response: NextResponse;
  nonce: string;
} {
  const nonce = generateNonce();
  const response = NextResponse.next();
  
  // Apply CSP headers
  applyCSPHeaders(response, nonce);
  
  // Store nonce in response headers so it can be accessed by pages
  response.headers.set('X-Nonce', nonce);
  
  return { response, nonce };
}

/**
 * Helper to get nonce from headers (for use in server components)
 */
export function getNonceFromHeaders(headers: Headers): string | null {
  return headers.get('X-Nonce');
}

/**
 * Additional security headers to complement CSP
 */
export function applyAdditionalSecurityHeaders(response: NextResponse): void {
  // Strict Transport Security (HSTS)
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  
  // X-Frame-Options (defense in depth with CSP frame-ancestors)
  response.headers.set('X-Frame-Options', 'DENY');
  
  // X-Content-Type-Options
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy (formerly Feature Policy)
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );
  
  // X-XSS-Protection (legacy, but adds defense in depth)
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Cross-Origin policies
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
}

/**
 * Generate SRI (Subresource Integrity) hash for a script/style
 */
export function generateSRIHash(content: string, algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha384'): string {
  const hash = crypto.createHash(algorithm).update(content).digest('base64');
  return `${algorithm}-${hash}`;
}

/**
 * Common external script SRI hashes (update these periodically)
 */
export const EXTERNAL_SCRIPT_SRI = {
  // Stripe.js (v3) - Update this when Stripe releases new versions
  stripe: {
    src: 'https://js.stripe.com/v3/',
    integrity: null, // Stripe doesn't support SRI as their library updates frequently
    crossorigin: 'anonymous',
  },
  // Add other external scripts here with their SRI hashes
};

/**
 * Helper to create a script tag with SRI
 */
export function createSRIScriptTag(
  src: string,
  integrity?: string,
  crossorigin: 'anonymous' | 'use-credentials' = 'anonymous'
): string {
  const integrityAttr = integrity ? `integrity="${integrity}"` : '';
  return `<script src="${src}" ${integrityAttr} crossorigin="${crossorigin}"></script>`;
}

