import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { securityLogger } from '@/lib/edge-logger';
import { verifyTokenEdge } from '@/lib/auth-edge';

// Rate limiting store (in-memory, use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

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
const RATE_LIMIT_MAX = 100; // requests per window

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // === ADMIN ROUTE PROTECTION ===
  // Protect all /admin routes except public ones
  if (pathname.startsWith('/admin')) {
    const publicAdminRoutes = [
      '/admin',
      '/admin/login',
      '/admin/register',
    ];
    
    const isPublicRoute = publicAdminRoutes.some(route => pathname === route);
    
    if (!isPublicRoute && !pathname.startsWith('/api/')) {
      // Check for admin authentication
      const adminToken = request.cookies.get('adminToken')?.value;
      
      if (!adminToken) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔒 [Middleware] No adminToken for admin route: ${pathname}, redirecting to login`);
        }
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }
      
      try {
        const user = await verifyTokenEdge(adminToken);
        if (!user || user.role !== 'admin') {
          if (process.env.NODE_ENV === 'development') {
            console.log(`🔒 [Middleware] Not admin for route: ${pathname}, redirecting`);
          }
          return NextResponse.redirect(new URL('/admin/login', request.url));
        }
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ [Middleware] Admin access granted for: ${pathname}`);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔒 [Middleware] Invalid adminToken for admin route: ${pathname}`);
        }
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }
    }
  }

  // === STUDENT ROUTE PROTECTION ===
  // Protect /student routes
  if (pathname.startsWith('/student') && !pathname.startsWith('/student/blogs')) {
    const studentToken = request.cookies.get('studentToken')?.value;
    
    if (!studentToken) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔒 [Middleware] No studentToken for student route: ${pathname}`);
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    try {
      const user = await verifyTokenEdge(studentToken);
      if (!user || user.role !== 'student') {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔒 [Middleware] Not student for route: ${pathname}`);
        }
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔒 [Middleware] Invalid studentToken for student route: ${pathname}`);
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  const response = NextResponse.next();

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
    // Allow if origin is from amplifyapp.com and we have an amplify URL configured
    (origin.includes('amplifyapp.com') && process.env.NEXT_PUBLIC_APP_URL?.includes('amplifyapp.com'))
  );
  
  if (isAllowed && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  } else if (origin && process.env.NODE_ENV === 'development') {
    console.warn('⚠️ CORS blocked origin:', origin, 'Allowed origins:', ALLOWED_ORIGINS);
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: response.headers });
  }

  // Enhanced Security headers
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
    "frame-src 'self' https://js.stripe.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://docs.google.com https://drive.google.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
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
          securityLogger.warn('Rate limit exceeded', {
            ip,
            path: request.nextUrl.pathname,
            count: rateLimit.count,
          });
          return new NextResponse(
            JSON.stringify({
              error: 'Too many requests',
              message: 'Please try again later',
              retryAfter: Math.ceil((rateLimit.resetTime - now) / 1000),
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
      response.headers.set(
        'X-RateLimit-Remaining',
        String(Math.max(0, RATE_LIMIT_MAX - currentLimit.count))
      );
      response.headers.set('X-RateLimit-Reset', String(currentLimit.resetTime));
    }

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      // 1% chance
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
  matcher: ['/api/:path*', '/((?!_next/static|_next/image|favicon.ico).*)'],
};
