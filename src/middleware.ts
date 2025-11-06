import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // API routes that don't require authentication
  const publicApiRoutes = ['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/reset-password'];
  const isPublicApiRoute = publicApiRoutes.some(route => pathname.startsWith(route));

  // If it's a public route or API route, allow access
  if (isPublicRoute || isPublicApiRoute) {
    return NextResponse.next();
  }

  // Check for authentication token cookie
  const token = request.cookies.get('token')?.value;

  if (!token) {
    // Redirect to login for protected routes
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Token presence check; full validation happens server-side in APIs/pages

  return NextResponse.next();
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
