import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check for both admin and student tokens
    const adminToken = request.cookies.get('adminToken')?.value;
    const studentToken = request.cookies.get('studentToken')?.value;
    const token = adminToken || studentToken;
    
    // During build time, this is expected to have no token (static page generation)
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: decoded.id,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role,
        isActive: decoded.isActive,
      },
    });
  } catch (error: any) {
    console.error('❌ [/api/auth/me] Error:', error);
    return NextResponse.json(
      { message: 'Authentication failed', error: error.message },
      { status: 500 }
    );
  }
}
