import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { courses } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

/**
 * Diagnostic API to check course statuses in database
 * Helps debug why courses aren't showing on student dashboard
 */
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

    let db;
    try {
      db = getDatabase();
    } catch (dbError: any) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection failed',
          message: dbError.message || 'Database is not available',
          hint: 'Please check your DATABASE_URL in .env.local',
        },
        { status: 500 }
      );
    }

    // Get ALL courses with their statuses
    const allCourses = await db
      .select({
        id: courses.id,
        title: courses.title,
        status: courses.status,
        isRequestable: courses.isRequestable,
        isDefaultUnlocked: courses.isDefaultUnlocked,
        createdAt: courses.createdAt,
        updatedAt: courses.updatedAt,
      })
      .from(courses)
      .orderBy(desc(courses.createdAt));

    // Group by status
    const byStatus: Record<string, any[]> = {};
    allCourses.forEach((course: any) => {
      const status = course.status || 'null';
      if (!byStatus[status]) {
        byStatus[status] = [];
      }
      byStatus[status].push(course);
    });

    // Check which statuses should be visible to students
    const visibleStatuses = ['published', 'active'];
    const visibleCourses = allCourses.filter((c: any) =>
      visibleStatuses.includes(c.status?.toLowerCase())
    );

    return NextResponse.json({
      success: true,
      summary: {
        totalCourses: allCourses.length,
        visibleToStudents: visibleCourses.length,
        byStatus: Object.keys(byStatus).map(status => ({
          status,
          count: byStatus[status].length,
          courses: byStatus[status].map((c: any) => ({
            id: c.id,
            title: c.title,
          })),
        })),
      },
      allCourses: allCourses.map((c: any) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        isRequestable: c.isRequestable,
        isDefaultUnlocked: c.isDefaultUnlocked,
        createdAt: c.createdAt?.toISOString(),
        updatedAt: c.updatedAt?.toISOString(),
      })),
      visibleCourses: visibleCourses.map((c: any) => ({
        id: c.id,
        title: c.title,
        status: c.status,
      })),
      diagnostic: {
        databaseConnected: true,
        coursesTableExists: true,
        statusMapping: {
          note: 'Student API looks for: "published" or "active" (case-insensitive)',
          foundStatuses: Object.keys(byStatus),
          expectedStatuses: ['published', 'active', 'draft'],
        },
        recommendations: visibleCourses.length === 0 && allCourses.length > 0
          ? [
              `Found ${allCourses.length} courses but none are visible to students.`,
              `Update course status to "published" or "active" in admin panel.`,
              `Current statuses found: ${Object.keys(byStatus).join(', ')}`,
            ]
          : [],
      },
    });
  } catch (error: any) {
    console.error('❌ Diagnostic API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}











