import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { courses, accessRequests, users } from '@/lib/db/schema';
import { eq, sql, and, or } from 'drizzle-orm';

/**
 * Real-time Sync Connection Endpoint for Admin App
 * Maintains a persistent connection for real-time synchronization
 * Uses polling mechanism for admin dashboard updates
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
    }

    if (decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = getDatabase();
    const userId = decoded.id;

    // Get comprehensive sync data for admin
    const syncData: any = {
      timestamp: new Date().toISOString(),
      userId,
      role: decoded.role,
    };

    // Admin sync data - optimized with parallel queries
    const [coursesCount, studentsCount, pendingRequestsCount] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(courses)
        .where(
          or(
            eq(courses.status, 'published'),
            eq(courses.status, 'active'),
            eq(courses.status, 'Published'),
            eq(courses.status, 'Active')
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.role, 'student')),
      db
        .select({ count: sql<number>`count(*)` })
        .from(accessRequests)
        .where(eq(accessRequests.status, 'pending')),
    ]);

    syncData.admin = {
      publishedCourses: Number(coursesCount[0]?.count || 0),
      totalStudents: Number(studentsCount[0]?.count || 0),
      pendingRequests: Number(pendingRequestsCount[0]?.count || 0),
    };

    return NextResponse.json({
      success: true,
      sync: syncData,
      message: 'Sync connection established',
    });
  } catch (error: any) {
    console.error('Sync connection error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to establish sync connection',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}




