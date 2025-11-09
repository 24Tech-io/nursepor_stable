import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';
import {
  applySecurityHeaders,
  rateLimit,
  checkCORS,
  applyCORSHeaders,
  requireHTTPS,
  getClientIP
} from './lib/security-middleware';
import { securityLogger } from './lib/edge-logger';
import { applyRequestSizeCheck } from './lib/request-size-middleware';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const clientIP = getClientIP(request);

  // HTTPS redirect (production only)
  const httpsRedirect = requireHTTPS(request);
  if (httpsRedirect) {
    return httpsRedirect;
  }

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    const corsCheck = checkCORS(request);
    const response = new NextResponse(null, { status: 204 });
    applySecurityHeaders(response);
    if (corsCheck.allowed && corsCheck.origin) {
      applyCORSHeaders(response, corsCheck.origin);
    }
    return response;
  }

  // Apply rate limiting (except for webhooks)
  if (!pathname.startsWith('/api/payments/webhook')) {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult.limited) {
      securityLogger.logRateLimitExceeded(clientIP, pathname);
      const response = NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
      response.headers.set('Retry-After', '900'); // 15 minutes
      applySecurityHeaders(response);
      return response;
    }
  }

  // Check CORS
  const corsCheck = checkCORS(request);
  if (!corsCheck.allowed) {
    const response = NextResponse.json(
      { error: 'CORS policy violation' },
      { status: 403 }
    );
    applySecurityHeaders(response);
    return response;
  }

  // Check request body size (for POST/PUT/PATCH)
  const sizeCheckResult = applyRequestSizeCheck(request);
  if (sizeCheckResult) {
    applySecurityHeaders(sizeCheckResult);
    return sizeCheckResult;
  }

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/', '/admin', '/student'];
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));

  // API routes that don't require authentication
  const publicApiRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/test-db',
    '/api/payments/webhook', // Stripe webhook
    '/api/auth/me', // Allow /api/auth/me to be called - it will check token internally
  ];
  const isPublicApiRoute = publicApiRoutes.some(route => pathname.startsWith(route));

  // If it's a public route or API route, allow access
  if (isPublicRoute || isPublicApiRoute) {
    const response = NextResponse.next();
    applySecurityHeaders(response);
    if (corsCheck.origin) {
      applyCORSHeaders(response, corsCheck.origin);
    }
    return response;
  }

  // Check for authentication token cookie
  const token = request.cookies.get('token')?.value;
  
  // Check if this is a redirect from login (check referer header)
  const referer = request.headers.get('referer');
  const isFromLogin = referer?.includes('/login');
  const userAgent = request.headers.get('user-agent') || '';

  if (!token) {
    // Redirect to login for protected API routes only
    if (pathname.startsWith('/api/')) {
      // Allow public API routes through
      if (isPublicApiRoute) {
        const response = NextResponse.next();
        applySecurityHeaders(response);
        if (corsCheck.origin) {
          applyCORSHeaders(response, corsCheck.origin);
        }
        return response;
      }
      // For protected API routes, return 401
      securityLogger.logUnauthorizedAccess(clientIP, pathname);
      const response = NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      applySecurityHeaders(response);
      return response;
    }
    
    // For page routes (including /student and /admin), always allow through
    // The pages themselves will handle authentication and redirect if needed
    // This prevents middleware from blocking access while cookies are being set
    const response = NextResponse.next();
    applySecurityHeaders(response);
    return response;
  }

  // Validate token
  let user;
  try {
    user = verifyToken(token);
  } catch (error) {
    console.error('Token verification error in middleware:', error);
    securityLogger.logSecurityEvent('Token verification failed', {
      ip: clientIP,
      path: pathname,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    user = null;
  }
  
  if (!user) {
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.json({ message: 'Invalid or expired token' }, { status: 401 });
      applySecurityHeaders(response);
      return response;
    } else {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('token');
      applySecurityHeaders(response);
      return response;
    }
  }

  // Check admin routes
  if (pathname.startsWith('/admin') && user.role !== 'admin') {
    securityLogger.logUnauthorizedAccess(clientIP, pathname, user.id?.toString());
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      applySecurityHeaders(response);
      return response;
    } else {
      const response = NextResponse.redirect(new URL('/student/dashboard', request.url));
      applySecurityHeaders(response);
      return response;
    }
  }

  // Check student routes
  if (pathname.startsWith('/student') && user.role !== 'student' && user.role !== 'admin') {
    securityLogger.logUnauthorizedAccess(clientIP, pathname, user.id?.toString());
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.json({ error: 'Student access required' }, { status: 403 });
      applySecurityHeaders(response);
      return response;
    } else {
      const response = NextResponse.redirect(new URL('/login', request.url));
      applySecurityHeaders(response);
      return response;
    }
  }

  const response = NextResponse.next();
  applySecurityHeaders(response);
  if (corsCheck.origin) {
    applyCORSHeaders(response, corsCheck.origin);
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
