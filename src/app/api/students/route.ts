import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, desc, count, or, like, asc } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Configure as dynamic route (uses request.url for query params)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Fetch all students with their stats
export async function GET(request: NextRequest) {
    try {
        // Check for admin_token first (new auth system), then fallback to token for backward compatibility
        const token = request.cookies.get('admin_token')?.value ||
            request.cookies.get('adminToken')?.value ||
            request.cookies.get('token')?.value;

        if (!token) {
            logger.error('[GET /api/students] No token found');
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
        }

        const decoded = await verifyToken(token);
        if (!decoded) {
            logger.error('[GET /api/students] Token verification failed');
            return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
        }
        
        if (decoded.role !== 'admin') {
            logger.error('[GET /api/students] Role check failed. Role:', decoded.role);
            return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
        }

        // Simple query - just return all users with student role
        const db = await getDatabaseWithRetry();
        const allStudents = await db
            .select()
            .from(users)
            .where(eq(users.role, 'student'))
            .orderBy(desc(users.createdAt))
            .limit(100);

        return NextResponse.json({
            students: allStudents,
            total: allStudents.length
        });
    } catch (error: any) {
        logger.error('Get students error:', error);
        return NextResponse.json({
            message: 'Failed to fetch students',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    let db;
    try {
      db = getDatabase();
    } catch (dbError: any) {
      console.error('❌ Database initialization error:', dbError);
      return NextResponse.json(
        {
          message: 'Database connection failed',
          error: dbError.message || 'Database is not available',
          hint: 'Please check your DATABASE_URL in .env.local',
          students: [],
          count: 0,
        },
        { status: 500 }
      );
    }

    // ⚡ PERFORMANCE: If only count is needed, use efficient COUNT query
    if (countOnly) {
      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.role, 'student'));

      console.log(`⚡ [Admin API] Fast count: ${result.count} students`);
      return NextResponse.json({ count: result.count });
    }

    // Fetch all students first
    const allStudents = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        isActive: users.isActive,
        faceIdEnrolled: users.faceIdEnrolled,
        fingerprintEnrolled: users.fingerprintEnrolled,
        joinedDate: users.joinedDate,
        lastLogin: users.lastLogin,
      })
      .from(users)
      .where(eq(users.role, 'student'));

    // For each student, get detailed enrollment status
    const studentsWithStats = await Promise.all(
      allStudents.map(async (student: any) => {
        // Get all enrolled course IDs from BOTH tables - filter by status (case-insensitive)
        const [enrolledProgress, enrolledRecords] = await Promise.all([
          db
            .select({
              courseId: studentProgress.courseId,
            })
            .from(studentProgress)
            .innerJoin(courses, eq(studentProgress.courseId, courses.id))
            .where(
              and(
                eq(studentProgress.studentId, student.id),
                or(
                  eq(courses.status, 'published'),
                  eq(courses.status, 'active'),
                  eq(courses.status, 'Published'), // Case-insensitive
                  eq(courses.status, 'Active') // Case-insensitive
                )
              )
            ),
          db
            .select({
              courseId: enrollments.courseId,
            })
            .from(enrollments)
            .innerJoin(courses, eq(enrollments.courseId, courses.id))
            .where(
              and(
                eq(enrollments.userId, student.id),
                eq(enrollments.status, 'active'),
                or(
                  eq(courses.status, 'published'),
                  eq(courses.status, 'active'),
                  eq(courses.status, 'Published'),
                  eq(courses.status, 'Active')
                )
              )
            ),
        ]);

        // Get all pending request course IDs
        const pendingRequests = await db
          .select({
            courseId: accessRequests.courseId,
          })
          .from(accessRequests)
          .where(
            and(eq(accessRequests.studentId, student.id), eq(accessRequests.status, 'pending'))
          );

        // Merge course IDs from both tables
        const allEnrolledCourseIds = new Set([
          ...enrolledProgress.map((p: any) => p.courseId),
          ...enrolledRecords.map((e: any) => e.courseId),
        ]);
        const pendingRequestCourseIds = new Set(pendingRequests.map((r: any) => r.courseId));

        // IMPORTANT: Only count as enrolled if there's an enrollment entry AND no pending request
        // A course with a pending request should NOT be counted as enrolled
        const actualEnrolledCourses = Array.from(allEnrolledCourseIds).filter(
          (courseId) => !pendingRequestCourseIds.has(courseId)
        );

        const enrolled = actualEnrolledCourses.length;
        const requested = pendingRequests.length;

        console.log(`📊 Student ${student.name} (ID: ${student.id}):`, {
          enrolled: enrolled,
          requested: requested,
          enrolledCourseIds: Array.from(allEnrolledCourseIds),
          pendingRequestCourseIds: Array.from(pendingRequestCourseIds),
        });

        return {
          ...student,
          enrolledCourses: enrolled,
          pendingRequests: requested,
          enrollmentStatus: {
            enrolled,
            requested,
            total: enrolled + requested,
          },
        };
      })
    );

    const result = studentsWithStats.map((student: any) => ({
      ...student,
      enrolledCourses: Number(student.enrolledCourses || 0),
    }));

    console.log(
      '📊 Students with enrollment counts:',
      result.map((s: any) => ({
        name: s.name,
        email: s.email,
        enrolledCourses: s.enrolledCourses,
      }))
    );

    return NextResponse.json({
      students: result,
    });
  } catch (error: any) {
    console.error('❌ Get students error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    // Check if it's a database connection error
    if (
      error.message?.includes('Database is not available') ||
      error.message?.includes('DATABASE_URL')
    ) {
      return NextResponse.json(
        {
          message: 'Database connection failed',
          error: 'Database is not available. Please check your DATABASE_URL in .env.local',
          students: [], // Return empty array instead of failing
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Failed to fetch students',
        error: error.message,
        students: [], // Return empty array instead of failing
      },
      { status: 500 }
    );
  }
}
