/**
 * Security Middleware for Next.js API Routes
 * Comprehensive security layer including Helmet-like headers, CORS, rate limiting, and validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { securityLogger } from './edge-logger';

// Security headers configuration (Helmet-equivalent for Next.js)
export const securityHeaders = {
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  // Enable XSS protection
  'X-XSS-Protection': '1; mode=block',
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Permissions policy
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.stripe.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; '),
  // Strict Transport Security (HTTPS enforcement)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
};

// Remove X-Powered-By header
export function removeXPoweredBy() {
  return (req: NextRequest) => {
    const response = NextResponse.next();
    response.headers.delete('X-Powered-By');
    return response;
  };
}

// Apply security headers to response
export function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.delete('X-Powered-By');
  return response;
}

// Rate limiting store (in-memory, use Redis in production)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limiting configuration
// More lenient in development, strict in production
const RATE_LIMIT_WINDOW = process.env.NODE_ENV === 'development' 
  ? 5 * 60 * 1000  // 5 minutes in dev
  : 15 * 60 * 1000; // 15 minutes in production

const RATE_LIMIT_MAX_REQUESTS = process.env.NODE_ENV === 'development'
  ? 1000  // 1000 requests per window in dev
  : 100;  // 100 requests per window in production

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of Array.from(rateLimitStore.entries())) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Rate limiting middleware
export function rateLimit(req: NextRequest): { limited: boolean; remaining: number } {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const key = `${ip}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    };
    rateLimitStore.set(key, entry);
    return { limited: false, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }

  entry.count++;

  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    securityLogger.logRateLimitExceeded(ip, req.nextUrl.pathname);
    return { limited: true, remaining: 0 };
  }

  return { limited: false, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count };
}

// Clear rate limit for a specific IP (useful for development)
export function clearRateLimit(ip: string): void {
  rateLimitStore.delete(ip);
}

// Clear all rate limits (useful for development)
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

// CORS configuration
// Support comma-separated list from environment variable
const getAllowedOrigins = (): string[] => {
  const origins = [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.NEXT_PUBLIC_APP_URL || '',
  ];

  // Add origins from ALLOWED_ORIGINS environment variable
  if (process.env.ALLOWED_ORIGINS) {
    const envOrigins = process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
    origins.push(...envOrigins);
  }

  // Filter out empty strings
  return Array.from(new Set(origins.filter(Boolean)));
};

const ALLOWED_ORIGINS = getAllowedOrigins();

// CORS middleware
export function checkCORS(req: NextRequest): { allowed: boolean; origin: string | null } {
  const origin = req.headers.get('origin');
  
  // Allow requests without origin (same-origin, server-to-server)
  if (!origin) {
    return { allowed: true, origin: null };
  }

  // Check if origin is in allowed list
  const allowed = ALLOWED_ORIGINS.some(allowedOrigin => 
    origin === allowedOrigin || allowedOrigin === '*'
  );

  if (!allowed) {
    securityLogger.info('CORS violation', { origin, path: req.nextUrl.pathname });
  }

  return { allowed, origin };
}

// Apply CORS headers to response
export function applyCORSHeaders(response: NextResponse, origin: string | null): NextResponse {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  }
  return response;
}

// Input sanitization helpers
export function sanitizeInput(input: string): string {
  // Remove potential XSS vectors
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}

// Check for SQL injection patterns
export function detectSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\bor\b|\band\b).*=.*\s/i,
    /union.*select/i,
    /drop\s+table/i,
    /insert\s+into/i,
    /delete\s+from/i,
    /update.*set/i,
    /exec\s*\(/i,
    /script.*src/i,
    /--/,
    /;.*--/,
    /\/\*.*\*\//,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

// Check for XSS patterns
export function detectXSS(input: string): boolean {
  const xssPatterns = [
    /<script/i,
    /<iframe/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<embed/i,
    /<object/i,
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

// Validate request body for security threats
export function validateRequestSecurity(req: NextRequest, body: any): { safe: boolean; threats: string[] } {
  const threats: string[] = [];
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

  // Check all string values in the body
  const checkValue = (value: any, path: string = ''): void => {
    if (typeof value === 'string') {
      if (detectSQLInjection(value)) {
        threats.push(`SQL injection detected in ${path}`);
        securityLogger.logSQLInjectionAttempt(ip, value);
      }
      if (detectXSS(value)) {
        threats.push(`XSS detected in ${path}`);
        securityLogger.logXSSAttempt(ip, value);
      }
    } else if (typeof value === 'object' && value !== null) {
      Object.entries(value).forEach(([key, val]) => {
        checkValue(val, path ? `${path}.${key}` : key);
      });
    }
  };

  checkValue(body);

  return {
    safe: threats.length === 0,
    threats,
  };
}

// File upload validation
export function validateFileUpload(filename: string, fileSize: number, allowedExtensions: string[]): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB default

  // Check file size
  if (fileSize > maxSize) {
    return { valid: false, error: 'File size exceeds maximum allowed (10MB)' };
  }

  // Check file extension
  const extension = filename.split('.').pop()?.toLowerCase();
  if (!extension || !allowedExtensions.includes(extension)) {
    return { valid: false, error: `File type not allowed. Allowed types: ${allowedExtensions.join(', ')}` };
  }

  // Check for double extensions
  const parts = filename.split('.');
  if (parts.length > 2) {
    return { valid: false, error: 'Multiple file extensions not allowed' };
  }

  // Check for suspicious patterns
  if (/\.(php|exe|sh|bat|cmd|com|pif|scr|vbs|js)$/i.test(filename)) {
    return { valid: false, error: 'Executable file types not allowed' };
  }

  return { valid: true };
}

// HTTPS redirect middleware
export function requireHTTPS(req: NextRequest): NextResponse | null {
  // Skip in development
  if (process.env.NODE_ENV === 'development') {
    return null;
  }

  const proto = req.headers.get('x-forwarded-proto');
  if (proto === 'http') {
    const url = req.nextUrl.clone();
    url.protocol = 'https:';
    return NextResponse.redirect(url, 301);
  }

  return null;
}

// Get client IP address
export function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}


