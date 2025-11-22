import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limiting store (in-memory, use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// CORS configuration
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NEXT_PUBLIC_ADMIN_URL,
].filter(Boolean);

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // requests per window

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // CORS headers
  const origin = request.headers.get('origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: response.headers });
  }

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
  ].join('; ');
  response.headers.set('Content-Security-Policy', csp);

  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const key = `${ip}:${request.nextUrl.pathname}`;
    const now = Date.now();

    const rateLimit = rateLimitMap.get(key);

    if (rateLimit) {
      if (now < rateLimit.resetTime) {
        if (rateLimit.count >= RATE_LIMIT_MAX) {
          return new NextResponse(
            JSON.stringify({
              error: 'Too many requests',
              message: 'Please try again later',
              retryAfter: Math.ceil((rateLimit.resetTime - now) / 1000)
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(Math.ceil((rateLimit.resetTime - now) / 1000)),
                'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(rateLimit.resetTime),
              },
            }
          );
        }
        rateLimit.count++;
      } else {
        rateLimit.count = 1;
        rateLimit.resetTime = now + RATE_LIMIT_WINDOW;
      }
    } else {
      rateLimitMap.set(key, {
        count: 1,
        resetTime: now + RATE_LIMIT_WINDOW,
      });
    }

    // Add rate limit headers
    const currentLimit = rateLimitMap.get(key);
    if (currentLimit) {
      response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
      response.headers.set('X-RateLimit-Remaining', String(Math.max(0, RATE_LIMIT_MAX - currentLimit.count)));
      response.headers.set('X-RateLimit-Reset', String(currentLimit.resetTime));
    }

    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      const cutoff = now - RATE_LIMIT_WINDOW;
      for (const [key, value] of rateLimitMap.entries()) {
        if (value.resetTime < cutoff) {
          rateLimitMap.delete(key);
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
