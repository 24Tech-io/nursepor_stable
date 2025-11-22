import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Public routes - allow access regardless of auth status
  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/register') ||
    pathname.startsWith('/api/auth/me') ||
    pathname.startsWith('/api/setup-test-users')
  ) {
    console.log(`✅ [Middleware] Public route allowed: ${pathname}`);
    return NextResponse.next();
  }

  // For page routes like /dashboard, let them load and handle auth client-side
  // Only enforce auth for API routes
  if (!pathname.startsWith('/api')) {
    console.log(`✅ [Middleware] Page route allowed (client-side auth): ${pathname}`);
    return NextResponse.next();
  }

  // Check authentication for API routes
  const token = request.cookies.get('adminToken')?.value;

  console.log(`🔍 [Middleware] Checking API route: ${pathname}, Token exists: ${!!token}`);

  if (!token) {
    console.log(`❌ [Middleware] No token for API route: ${pathname}`);
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  }

  try {
    const user = await verifyToken(token);
    if (!user || user.role !== 'admin') {
      console.log(`❌ [Middleware] Invalid token or not admin for API route: ${pathname}`);
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }
    console.log(`✅ [Middleware] Token verified for admin: ${user.email}`);
  } catch (error) {
    console.log(`❌ [Middleware] Token verification failed for API route: ${pathname}`, error);
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
