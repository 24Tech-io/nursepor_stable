import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { users, courses, accessRequests, studentProgress, payments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get database instance (will throw if not available)
    let db;
    try {
      db = getDatabase();
    } catch (dbError: any) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { 
          message: 'Database connection error. Please check your DATABASE_URL in .env.local',
          error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        },
        { status: 500 }
      );
    }

    // Get all stats from database - use simpler queries
    const allStudentsList = await db
      .select()
      .from(users)
      .where(eq(users.role, 'student'));

    const activeStudentsList = await db
      .select()
      .from(users)
      .where(and(eq(users.role, 'student'), eq(users.isActive, true)));

    const allCoursesList = await db
      .select()
      .from(courses);

    const publishedCoursesList = await db
      .select()
      .from(courses)
      .where(eq(courses.status, 'published'));

    const pendingRequestsList = await db
      .select()
      .from(accessRequests)
      .where(eq(accessRequests.status, 'pending'));

    const totalEnrollmentsList = await db
      .select()
      .from(studentProgress);

    // Calculate revenue from actual completed payments
    let revenue = 0;
    try {
      const completedPayments = await db
        .select({
          amount: payments.amount,
        })
        .from(payments)
        .where(eq(payments.status, 'completed'));
      
      revenue = completedPayments.reduce((sum: number, item: any) => {
        return sum + (Number(item.amount) || 0);
      }, 0);
    } catch (e) {
      console.error('Error calculating revenue:', e);
      revenue = 0;
    }

    // Calculate completion rate (courses with 100% progress)
    const completedCoursesList = await db
      .select()
      .from(studentProgress)
      .where(eq(studentProgress.totalProgress, 100));

    const totalEnrollmentsCount = totalEnrollmentsList.length;
    const completedCount = completedCoursesList.length;
    const completionRate = totalEnrollmentsCount > 0
      ? Math.round((completedCount / totalEnrollmentsCount) * 100)
      : 0;

    return NextResponse.json({
      stats: {
        totalStudents: allStudentsList.length,
        activeStudents: activeStudentsList.length,
        totalCourses: allCoursesList.length,
        publishedCourses: publishedCoursesList.length,
        pendingRequests: pendingRequestsList.length,
        totalEnrollments: totalEnrollmentsCount,
        revenue: revenue,
        completionRate: completionRate,
      },
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to get stats',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

