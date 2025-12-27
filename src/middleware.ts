import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { securityLogger } from '@/lib/edge-logger';
import { config as appConfig } from '@/lib/config';
import { guardDebugEndpoints } from './middleware/production-guard';
import { checkRequestSize } from './middleware/request-size-limit';
// Note: checkRateLimit is imported dynamically below to avoid build-time import of optional Redis packages
import { validateCSRF } from './middleware/csrf-validation';
// Performance monitoring (only for API routes, not in Edge runtime)
// Performance monitoring removed


// CORS configuration
// Build allowed origins list dynamically
const getAllowedOrigins = () => {
  const origins: string[] = [
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  // Add configured URLs
  if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.push(process.env.NEXT_PUBLIC_APP_URL);
    // Also add without trailing slash if it has one
    if (process.env.NEXT_PUBLIC_APP_URL.endsWith('/')) {
      origins.push(process.env.NEXT_PUBLIC_APP_URL.slice(0, -1));
    }
  }

  if (process.env.NEXT_PUBLIC_ADMIN_URL) {
    origins.push(process.env.NEXT_PUBLIC_ADMIN_URL);
    if (process.env.NEXT_PUBLIC_ADMIN_URL.endsWith('/')) {
      origins.push(process.env.NEXT_PUBLIC_ADMIN_URL.slice(0, -1));
    }
  }

  // Allow any amplifyapp.com domain if NEXT_PUBLIC_APP_URL contains it
  if (process.env.NEXT_PUBLIC_APP_URL?.includes('amplifyapp.com')) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, ''); // Remove trailing slash
    origins.push(baseUrl);
    // Also allow the protocol-less version
    origins.push(baseUrl.replace(/^https?:\/\//, ''));
  }

  return origins.filter(Boolean);
};

const ALLOWED_ORIGINS = getAllowedOrigins();

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 1000; // requests per window

export async function middleware(request: NextRequest) {
  // Guard debug endpoints in production
  const debugGuard = guardDebugEndpoints(request);
  if (debugGuard) {
    return debugGuard;
  }

  // Check request size (sync check in Edge runtime)
  const sizeCheck = checkRequestSize(request);
  if (sizeCheck) {
    return sizeCheck;
  }

  // Authentication guards for protected routes
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Protect admin routes - require admin_token
  // Allow /admin/login, /admin/register, and /admin (welcome page)
  if (pathname.startsWith('/admin') &&
    !pathname.startsWith('/admin/login') &&
    !pathname.startsWith('/admin/register') &&
    pathname !== '/admin') {
    const adminToken = request.cookies.get('admin_token')?.value || request.cookies.get('adminToken')?.value;
    if (!adminToken) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Protect student routes - require student_token
  // Allow /student/register, /register, and generic paths
  const studentPaths = ['/dashboard', '/courses', '/qbanks', '/progress', '/student'];
  const isStudentPath = studentPaths.some(path => pathname.startsWith(path));

  if (isStudentPath && !pathname.startsWith('/student/register') && !pathname.startsWith('/register')) {
    const studentToken = request.cookies.get('student_token')?.value;
    // Allow route to load - pages handle auth client-side
    // This is better UX than blocking at middleware level
  }

  const response = NextResponse.next();

  // Performance monitoring logic removed


  // CORS headers
  const origin = request.headers.get('origin');

  // Log CORS check in development
  if (process.env.NODE_ENV === 'development' && origin) {
    console.log('🌐 CORS check:', {
      origin,
      allowedOrigins: ALLOWED_ORIGINS,
      isAllowed: ALLOWED_ORIGINS.includes(origin),
    });
  }

  // Check if origin is allowed (exact match or starts with allowed domain)
  const isAllowed = origin && (
    ALLOWED_ORIGINS.includes(origin) ||
    ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed)) ||
    // Allow any amplifyapp.com domain (fail-safe for AWS deployments)
    origin.endsWith('.amplifyapp.com') ||
    // Allow if origin is from amplifyapp.com and we have an amplify URL configured (legacy check)
    (origin.includes('amplifyapp.com') && process.env.NEXT_PUBLIC_APP_URL?.includes('amplifyapp.com'))
  );

  if (isAllowed && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: response.headers });
  }

  // CSRF validation for state-changing operations
  if (pathname.startsWith('/api')) {
    const csrfValidation = validateCSRF(request);
    if (csrfValidation) {
      return csrfValidation;
    }
  }

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Enhanced Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://docs.google.com https://www.youtube.com https://player.vimeo.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  response.headers.set('Content-Security-Policy', csp);

  // Rate limiting for API routes (using Redis with fallback)
  if (pathname.startsWith('/api')) {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const identifier = `${ip}:${pathname}`;

    try {
      // Import at runtime via shim to avoid build-time issues with optional Redis packages
      const { checkRateLimit } = await import('@/lib/rate-limit-shim');
      const rateLimitResult = await checkRateLimit(identifier, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW);

      if (!rateLimitResult.allowed) {
        securityLogger.warn('Rate limit exceeded', {
          ip,
          path: request.nextUrl.pathname,
          remaining: rateLimitResult.remaining
        });
        return new NextResponse(
          JSON.stringify({
            error: 'Too many requests',
            message: 'Please try again later',
            retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
              'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
              'X-RateLimit-Remaining': String(rateLimitResult.remaining),
              'X-RateLimit-Reset': String(rateLimitResult.resetTime),
            },
          }
        );
      }

      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
      response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
      response.headers.set('X-RateLimit-Reset', String(rateLimitResult.resetTime));
    } catch (error) {
      // If rate limiting fails, log but don't block the request
      securityLogger.warn('Rate limiting check failed', { error, path: request.nextUrl.pathname });
    }
  }

  return response;
}

export const config = {
  matcher: ['/api/:path*', '/((?!_next/static|_next/image|favicon.ico).*)'],
};
