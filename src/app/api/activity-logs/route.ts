import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Force Node.js runtime (required for JWT/bcrypt/database)
export const runtime = 'nodejs';

// Activity logs feature - table not yet implemented
// Return empty logs gracefully until migration is run
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    // Return empty logs - feature not yet implemented
    console.log('ℹ️ Activity logs requested but table not yet created');
    return NextResponse.json({ logs: [] });
  } catch (error: any) {
    console.error('Get activity logs error:', error);
    return NextResponse.json(
      {
        message: 'Failed to fetch activity logs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
