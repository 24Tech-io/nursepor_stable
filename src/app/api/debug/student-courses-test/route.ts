import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { courses, studentProgress, accessRequests } from '@/lib/db/schema';
import { desc, eq, and, or } from 'drizzle-orm';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

/**
 * Test API that mimics the student courses API exactly
 * Helps debug why courses aren't showing on student dashboard
 * 
 * NOTE: This endpoint is disabled in production for security
 */
export async function GET(request: NextRequest) {
  // Block in production
  if (config.isProduction) {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  }
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);

    if (!decoded || !decoded.id) {
      return NextResponse.json(
        { message: 'Invalid or expired token. Please log in again.' },
        { status: 401 }
      );
    }

    let db;
    try {
      db = await getDatabaseWithRetry();
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

    const diagnostic: any = {
      step1_getAllCourses: { status: 'pending', data: null, error: null },
      step2_filterByStatus: { status: 'pending', data: null, error: null },
      step3_getEnrollments: { status: 'pending', data: null, error: null },
      step4_getPendingRequests: { status: 'pending', data: null, error: null },
      step5_finalResult: { status: 'pending', data: null, error: null },
    };

    // Step 1: Get ALL courses from database
    try {
      const allCoursesInDb = await db
        .select()
        .from(courses)
        .orderBy(desc(courses.createdAt));

      diagnostic.step1_getAllCourses = {
        status: 'success',
        data: {
          total: allCoursesInDb.length,
          courses: allCoursesInDb.map((c: any) => ({
            id: c.id,
            title: c.title,
            status: c.status,
          })),
        },
      };
    } catch (error: any) {
      diagnostic.step1_getAllCourses = {
        status: 'error',
        error: error.message,
      };
      throw error;
    }

    // Step 2: Filter by status (published/active)
    try {
      const allCourses = await db
        .select()
        .from(courses)
        .where(
          or(
            eq(courses.status, 'published'),
            eq(courses.status, 'active')
          )
        )
        .orderBy(desc(courses.createdAt));

      const filteredCourses = allCourses.filter(
        (c: any) => c.title !== 'Nurse Pro' && c.title !== 'Q-Bank'
      );

      diagnostic.step2_filterByStatus = {
        status: 'success',
        data: {
          total: allCourses.length,
          afterFilter: filteredCourses.length,
          courses: filteredCourses.map((c: any) => ({
            id: c.id,
            title: c.title,
            status: c.status,
          })),
        },
      };
    } catch (error: any) {
      diagnostic.step2_filterByStatus = {
        status: 'error',
        error: error.message,
      };
      throw error;
    }

    // Step 3: Get enrollments
    try {
      const enrolledProgress = await db
        .select({ courseId: studentProgress.courseId })
        .from(studentProgress)
        .where(eq(studentProgress.studentId, decoded.id));

      diagnostic.step3_getEnrollments = {
        status: 'success',
        data: {
          enrolledCourseIds: enrolledProgress.map((p: any) => p.courseId),
        },
      };
    } catch (error: any) {
      diagnostic.step3_getEnrollments = {
        status: 'error',
        error: error.message,
      };
    }

    // Step 4: Get pending requests
    try {
      const pendingRequests = await db
        .select({ courseId: accessRequests.courseId })
        .from(accessRequests)
        .where(
          and(
            eq(accessRequests.studentId, decoded.id),
            eq(accessRequests.status, 'pending')
          )
        );

      diagnostic.step4_getPendingRequests = {
        status: 'success',
        data: {
          pendingCourseIds: pendingRequests.map((r: any) => r.courseId),
        },
      };
    } catch (error: any) {
      diagnostic.step4_getPendingRequests = {
        status: 'error',
        error: error.message,
      };
    }

    // Step 5: Final result
    const allCourses = await db
      .select()
      .from(courses)
      .where(
        or(
          eq(courses.status, 'published'),
          eq(courses.status, 'active'),
          eq(courses.status, 'Active'),
          eq(courses.status, 'ACTIVE')
        )
      )
      .orderBy(desc(courses.createdAt));

    const filteredCourses = allCourses.filter(
      (c: any) => c.title !== 'Nurse Pro' && c.title !== 'Q-Bank'
    );

    diagnostic.step5_finalResult = {
      status: 'success',
      data: {
        coursesReturned: filteredCourses.length,
        courses: filteredCourses.map((c: any) => ({
          id: c.id.toString(),
          title: c.title,
          status: c.status,
        })),
      },
    };

    return NextResponse.json({
      success: true,
      diagnostic,
      summary: {
        totalCoursesInDb: diagnostic.step1_getAllCourses.data?.total || 0,
        visibleCourses: diagnostic.step2_filterByStatus.data?.afterFilter || 0,
        enrolledCourses: diagnostic.step3_getEnrollments.data?.enrolledCourseIds?.length || 0,
        pendingRequests: diagnostic.step4_getPendingRequests.data?.pendingCourseIds?.length || 0,
        finalCoursesReturned: diagnostic.step5_finalResult.data?.coursesReturned || 0,
      },
      message:
        diagnostic.step5_finalResult.data?.coursesReturned === 0
          ? 'No courses found. Check step2_filterByStatus to see if courses have correct status.'
          : 'Courses found successfully.',
    });
  } catch (error: any) {
    const { log } = await import('@/lib/logger-helper');
    log.error('Student courses test error', error);
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











