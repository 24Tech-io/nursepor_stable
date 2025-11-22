/**
 * Enhanced Security Headers
 * Additional security hardening beyond baseline
 */

import { NextResponse } from 'next/server';

export interface SecurityHeadersConfig {
  enableHSTS?: boolean;
  enableCSP?: boolean;
  enablePermissionsPolicy?: boolean;
  enableReferrerPolicy?: boolean;
  enableCOOP?: boolean;
  enableCOEP?: boolean;
}

/**
 * Get enhanced Content Security Policy
 */
export function getEnhancedCSP(nonce?: string): string {
  const cspDirectives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      nonce ? `'nonce-${nonce}'` : "'unsafe-inline'",
      "'strict-dynamic'",
      'https://js.stripe.com',
      'https://maps.googleapis.com',
    ],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'img-src': ["'self'", 'data:', 'https:', 'blob:'],
    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
    'connect-src': [
      "'self'",
      'https://api.stripe.com',
      'https://generativelanguage.googleapis.com',
      'wss:',
    ],
    'media-src': ["'self'", 'blob:', 'data:'],
    'frame-src': [
      "'self'",
      'https://js.stripe.com',
      'https://hooks.stripe.com',
    ],
    'worker-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': [],
    'block-all-mixed-content': [],
  };

  return Object.entries(cspDirectives)
    .map(([directive, sources]) => {
      if (sources.length === 0) return directive;
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');
}

/**
 * Get Permissions Policy
 */
export function getPermissionsPolicy(): string {
  const permissions = {
    'geolocation': [],
    'microphone': ['self'],
    'camera': ['self'],
    'payment': ['self'],
    'usb': [],
    'magnetometer': [],
    'gyroscope': [],
    'accelerometer': [],
    'ambient-light-sensor': [],
    'autoplay': ['self'],
    'encrypted-media': ['self'],
    'fullscreen': ['self'],
    'picture-in-picture': ['self'],
  };

  return Object.entries(permissions)
    .map(([feature, origins]) => {
      if (origins.length === 0) return `${feature}=()`;
      return `${feature}=(${origins.join(' ')})`;
    })
    .join(', ');
}

/**
 * Apply all enhanced security headers
 */
export function applyEnhancedSecurityHeaders(
  response: NextResponse,
  config: SecurityHeadersConfig = {},
  nonce?: string
): NextResponse {
  const {
    enableHSTS = true,
    enableCSP = true,
    enablePermissionsPolicy = true,
    enableReferrerPolicy = true,
    enableCOOP = true,
    enableCOEP = false, // Can break some features
  } = config;

  // HSTS - Force HTTPS for 2 years
  if (enableHSTS && process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }

  // Content Security Policy
  if (enableCSP) {
    response.headers.set('Content-Security-Policy', getEnhancedCSP(nonce));
  }

  // Permissions Policy (formerly Feature-Policy)
  if (enablePermissionsPolicy) {
    response.headers.set('Permissions-Policy', getPermissionsPolicy());
  }

  // Referrer Policy - Control referer header
  if (enableReferrerPolicy) {
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  }

  // Cross-Origin-Opener-Policy - Isolate browsing context
  if (enableCOOP) {
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  }

  // Cross-Origin-Embedder-Policy - Control embedding
  if (enableCOEP) {
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  }

  // Cross-Origin-Resource-Policy
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

  // X-Content-Type-Options - Prevent MIME sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // X-Frame-Options - Clickjacking protection
  response.headers.set('X-Frame-Options', 'DENY');

  // X-XSS-Protection - Legacy XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // X-DNS-Prefetch-Control - Control DNS prefetching
  response.headers.set('X-DNS-Prefetch-Control', 'off');

  // X-Download-Options - Prevent file downloads from being opened
  response.headers.set('X-Download-Options', 'noopen');

  // X-Permitted-Cross-Domain-Policies - Control Adobe Flash/PDF
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  // Remove potentially dangerous headers
  response.headers.delete('X-Powered-By');
  response.headers.delete('Server');

  // Cache Control for sensitive pages
  if (response.headers.get('content-type')?.includes('text/html')) {
    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response;
}

/**
 * Generate cryptographically secure nonce for CSP
 */
export function generateSecureNonce(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Security headers presets
 */
export const SecurityPresets = {
  /**
   * Maximum security - may break some features
   */
  maximum: {
    enableHSTS: true,
    enableCSP: true,
    enablePermissionsPolicy: true,
    enableReferrerPolicy: true,
    enableCOOP: true,
    enableCOEP: true,
  },

  /**
   * Balanced security - recommended for most applications
   */
  balanced: {
    enableHSTS: true,
    enableCSP: true,
    enablePermissionsPolicy: true,
    enableReferrerPolicy: true,
    enableCOOP: true,
    enableCOEP: false,
  },

  /**
   * Minimum security - for development/testing
   */
  minimum: {
    enableHSTS: false,
    enableCSP: false,
    enablePermissionsPolicy: false,
    enableReferrerPolicy: true,
    enableCOOP: false,
    enableCOEP: false,
  },
};

/**
 * Check if request is from a trusted origin
 */
export function isTrustedOrigin(origin: string | null): boolean {
  if (!origin) return false;

  const trustedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
    'https://localhost:3000',
  ];

  return trustedOrigins.some((trusted) => origin.startsWith(trusted || ''));
}

/**
 * Security headers for API responses
 */
export function applyAPISecurityHeaders(response: NextResponse): NextResponse {
  // Prevent caching of API responses with sensitive data
  response.headers.set(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, private'
  );

  // Content type protection
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Prevent framing
  response.headers.set('X-Frame-Options', 'DENY');

  return response;
}














