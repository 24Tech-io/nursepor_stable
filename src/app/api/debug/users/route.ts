import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseWithRetry } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('adminToken')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    // Get database instance
    const db = await getDatabaseWithRetry();

    // Get all users from database
    const allUsers = await db.select().from(users);

    return NextResponse.json({
      totalUsers: allUsers.length,
      users: allUsers.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone,
        bio: u.bio,
        isActive: u.isActive,
        joinedDate: u.joinedDate,
      })),
      currentUser: {
        id: decoded.id,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role,
      },
    });
  } catch (error: any) {
    logger.error('Debug users error:', error);
    return NextResponse.json(
      {
        message: 'Failed to get users',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
