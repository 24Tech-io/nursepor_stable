import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { users, studentProgress, courses, accessRequests, enrollments } from '@/lib/db/schema';
import { eq, sql, and, or } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { z } from 'zod';
import { getPublishedCourseFilter } from '@/lib/enrollment-helpers';
import { withCache, CacheKeys, CacheTTL } from '@/lib/api-cache';
import { startRouteMonitoring, trackQuery } from '@/lib/performance-monitor';

export const dynamic = 'force-dynamic';

const AGENT_LOG_ENABLED = process.env.AGENT_LOG === 'true';

// GET - Fetch all students with their stats
export async function GET(request: NextRequest) {
  const stopMonitoring = startRouteMonitoring('/api/admin/students');
  try {
    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get('countOnly') === 'true';

    const token = request.cookies.get('admin_token')?.value || request.cookies.get('adminToken')?.value;

    if (!token) {
      stopMonitoring();
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      stopMonitoring();
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    let db;
    try {
      db = await getDatabaseWithRetry();
    } catch (dbError: any) {
      logger.error('❌ Database initialization error:', dbError);
      return NextResponse.json(
        {
          message: 'Database connection failed',
          error: dbError.message || 'Database is not available',
          hint: 'Please check your DATABASE_URL in .env.local',
          students: [],
          count: 0
        },
        { status: 500 }
      );
    }

    // ⚡ PERFORMANCE: If only count is needed, use efficient COUNT query with caching
    if (countOnly) {
      const countCacheKey = CacheKeys.ADMIN_STUDENTS_COUNT();
      const result = await withCache(
        countCacheKey,
        async () => {
          return await trackQuery('Count students', async () => {
            const [result] = await db
              .select({ count: sql<number>`count(*)::int` })
              .from(users)
              .where(eq(users.role, 'student'));
            return result;
          });
        },
        { ttl: CacheTTL.ADMIN_LIST, dedupe: true }
      );

      logger.info(`⚡ [Admin API] Fast count: ${result.count} students`);
      stopMonitoring();
      return NextResponse.json({ count: result.count });
    }

    // Fetch all students first with caching
    const studentsCacheKey = CacheKeys.ADMIN_STUDENTS();
    const allStudents = await withCache(
      studentsCacheKey,
      async () => {
        return await trackQuery('Get all students', async () => {
          return await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              phone: users.phone,
              isActive: users.isActive,
              createdAt: users.createdAt, // Use createdAt as joinedDate
              lastLogin: users.lastLogin,
            })
            .from(users)
            .where(eq(users.role, 'student'));
        });
      },
      { ttl: CacheTTL.ADMIN_LIST, dedupe: true }
    );

    // For each student, get detailed enrollment status
    const studentsWithStats = await Promise.all(
      allStudents.map(async (student: any) => {
        // Get all enrolled course IDs from BOTH tables - filter by status (case-insensitive)
        const [enrolledProgressRaw, enrolledRecordsRaw] = await Promise.all([
          db
            .select({
              courseId: studentProgress.courseId,
              courseStatus: courses.status,
            })
            .from(studentProgress)
            .innerJoin(courses, eq(studentProgress.courseId, courses.id))
            .where(eq(studentProgress.studentId, student.id)),
          db
            .select({
              courseId: enrollments.courseId,
              courseStatus: courses.status,
            })
            .from(enrollments)
            .innerJoin(courses, eq(enrollments.courseId, courses.id))
            .where(
              and(
                eq(enrollments.userId, student.id),
                eq(enrollments.status, 'active')
              )
            ),
        ]);

        // Filter by status case-insensitively
        const enrolledProgress = enrolledProgressRaw.filter((p: any) => {
          const status = (p.courseStatus || '').toLowerCase();
          return status === 'published' || status === 'active';
        });

        const enrolledRecords = enrolledRecordsRaw.filter((e: any) => {
          const status = (e.courseStatus || '').toLowerCase();
          return status === 'published' || status === 'active';
        });

        // Get all pending request course IDs
        const pendingRequests = await db
          .select({
            courseId: accessRequests.courseId,
          })
          .from(accessRequests)
          .where(
            and(
              eq(accessRequests.studentId, student.id),
              eq(accessRequests.status, 'pending')
            )
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

        if (process.env.NODE_ENV === 'development') {
          logger.info(`📊 Student ${student.name} (ID: ${student.id}):`, {
            enrolled: enrolled,
            requested: requested,
            enrolledCourseIds: Array.from(allEnrolledCourseIds),
            pendingRequestCourseIds: Array.from(pendingRequestCourseIds),
          });
        }

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

    const result = studentsWithStats.map((student: any) => {
      // #region agent log
      if (AGENT_LOG_ENABLED) {
        fetch('http://127.0.0.1:7242/ingest/ce5b96bb-1fe8-4a94-9149-04fb97555724', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/app/api/admin/students/route.ts:162', message: 'Processing student date', data: { studentId: student.id, createdAt: student.createdAt, createdAtType: typeof student.createdAt, createdAtIsDate: student.createdAt instanceof Date, createdAtValue: student.createdAt?.toString() }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
      }
      // #endregion
      // Format date properly - use createdAt as joinedDate
      // Always return a valid date - use createdAt or fallback to a default date
      let joinedDate: string | null = null;

      try {
        // Try to use createdAt if available
        const dateValue = student.createdAt;
        let date: Date;

        if (dateValue) {
          date = dateValue instanceof Date
            ? dateValue
            : new Date(dateValue);
        } else {
          // Fallback: Use a very old date (Jan 1, 2000) if createdAt is missing
          // This ensures we always show a date instead of "Recently"
          date = new Date('2000-01-01');
          logger.warn(`⚠️ Student ${student.id} has no createdAt, using fallback date`);
        }

        // Validate date
        if (!isNaN(date.getTime())) {
          joinedDate = date.toISOString();
        } else {
          // If date is invalid, use fallback
          joinedDate = new Date('2000-01-01').toISOString();
          logger.warn(`⚠️ Student ${student.id} has invalid createdAt, using fallback date`);
        }
      } catch (e: any) {
        // If all else fails, use fallback date
        joinedDate = new Date('2000-01-01').toISOString();
        logger.warn(`⚠️ Student ${student.id} date parsing failed, using fallback date:`, e.message);
      }

      return {
        ...student,
        enrolledCourses: Number(student.enrolledCourses || 0),
        joinedDate: joinedDate, // Use createdAt formatted as ISO string
      };
    });

    if (process.env.NODE_ENV === 'development') {
      logger.info('📊 Students with enrollment counts:', result.map((s: any) => ({
        name: s.name,
        email: s.email,
        enrolledCourses: s.enrolledCourses
      })));
    }

    stopMonitoring();
    return NextResponse.json({
      students: result
    });
  } catch (error: any) {
    stopMonitoring();
    logger.error('❌ Get students error:', error);
    logger.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    // Check if it's a database connection error
    if (error.message?.includes('Database is not available') ||
      error.message?.includes('DATABASE_URL')) {
      return NextResponse.json(
        {
          message: 'Database connection failed',
          error: 'Database is not available. Please check your DATABASE_URL in .env.local',
          students: [] // Return empty array instead of failing
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Failed to fetch students',
        error: error.message,
        students: [] // Return empty array instead of failing
      },
      { status: 500 }
    );
  }
}
