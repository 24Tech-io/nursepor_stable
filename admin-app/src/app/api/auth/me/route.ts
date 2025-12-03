import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('📍 [/api/auth/me] Request received');

    const token = request.cookies.get('adminToken')?.value;
    console.log(`📍 [/api/auth/me] Token found in cookies: ${!!token}`);
    if (token) {
      console.log(`📍 [/api/auth/me] Token length: ${token.length}`);
    }

    if (!token) {
      console.log('❌ [/api/auth/me] No token provided');
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    const user = verifyToken(token);
    console.log(`📍 [/api/auth/me] Token verified, user:`, user);

    if (!user || user.role !== 'admin') {
      console.log('❌ [/api/auth/me] Invalid token or not admin role');
      return NextResponse.json({ message: 'Invalid or expired token' }, { status: 401 });
    }

    console.log(`✅ [/api/auth/me] Returning admin user:`, user.email);
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error: any) {
    console.error('❌ [/api/auth/me] Get user error:', error);
    return NextResponse.json(
      {
        message: 'Failed to get user',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
