import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
    addSecurityHeaders(response);
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
        addSecurityHeaders(response);
        return response;
      }
      // For protected API routes, return 401
      const response = NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      addSecurityHeaders(response);
      return response;
    }
    
    // For page routes (including /student and /admin), always allow through
    // The pages themselves will handle authentication and redirect if needed
    // This prevents middleware from blocking access while cookies are being set
    const response = NextResponse.next();
    addSecurityHeaders(response);
    return response;
  }

  // Validate token
  let user;
  try {
    user = verifyToken(token);
  } catch (error) {
    console.error('Token verification error in middleware:', error);
    user = null;
  }
  
  if (!user) {
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.json({ message: 'Invalid or expired token' }, { status: 401 });
      addSecurityHeaders(response);
      return response;
    } else {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('token');
      addSecurityHeaders(response);
      return response;
    }
  }

  // Check admin routes
  if (pathname.startsWith('/admin') && user.role !== 'admin') {
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      addSecurityHeaders(response);
      return response;
    } else {
      const response = NextResponse.redirect(new URL('/student/dashboard', request.url));
      addSecurityHeaders(response);
      return response;
    }
  }

  // Check student routes
  if (pathname.startsWith('/student') && user.role !== 'student' && user.role !== 'admin') {
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.json({ error: 'Student access required' }, { status: 403 });
      addSecurityHeaders(response);
      return response;
    } else {
      const response = NextResponse.redirect(new URL('/login', request.url));
      addSecurityHeaders(response);
      return response;
    }
  }

  const response = NextResponse.next();
  addSecurityHeaders(response);
  return response;
}

// Add security headers
function addSecurityHeaders(response: NextResponse) {
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.stripe.com https://*.neon.tech",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  // Strict Transport Security (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
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
