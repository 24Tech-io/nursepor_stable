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


// CORS configuration - uses centralized config (no hardcoded URLs)
const ALLOWED_ORIGINS = appConfig.allowedOrigins;

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
    const adminToken = request.cookies.get('admin_token')?.value;
    if (!adminToken) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Protect student routes - require student_token
  // Allow /student/register
  // Note: We allow pages to load and handle auth client-side for better UX
  // This prevents 404s and allows pages to show loading states
  // Pages will check auth via /api/auth/me and redirect if needed
  if (pathname.startsWith('/student') && !pathname.startsWith('/student/register')) {
    const studentToken = request.cookies.get('student_token')?.value;
    // Allow route to load - pages handle auth client-side
    // This is better UX than blocking at middleware level
    // If no token, pages will show loading then redirect
  }

  const response = NextResponse.next();

  // Performance monitoring logic removed


  // CORS headers
  const origin = request.headers.get('origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
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

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://docs.google.com https://www.youtube.com https://player.vimeo.com",
    "frame-ancestors 'none'",
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
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
