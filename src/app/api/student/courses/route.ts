import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { courses, studentProgress, payments, accessRequests, enrollments } from '@/lib/db/schema';
import { desc, eq, and, or, sql, inArray } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { withCache, CacheKeys, CacheTTL } from '@/lib/api-cache';
import { startRouteMonitoring, trackQuery } from '@/lib/performance-monitor';

export const dynamic = 'force-dynamic';

const AGENT_LOG_ENABLED = process.env.AGENT_LOG === 'true';

// Helper function to retry database operations for reliability
async function retryOperation<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      if (i === retries - 1) throw error;
      // No delay - instant retry for maximum speed (< 40ms target)
      logger.warn(`Instant retry ${i + 1}/${retries}:`, error.message);
    }
  }
  throw new Error('Operation failed after retries');
}

// CACHE DISABLED - Force fresh data on every request
export const revalidate = 0; // Changed from 30 to 0 for fresh data

export async function GET(request: NextRequest) {
  const stopMonitoring = startRouteMonitoring('/api/student/courses');
  // #region agent log
  if (AGENT_LOG_ENABLED) {
    fetch('http://127.0.0.1:7242/ingest/ce5b96bb-1fe8-4a94-9149-04fb97555724', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/app/api/student/courses/route.ts:24', message: 'Course API GET entry', data: { timestamp: Date.now() }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
  }
  // #endregion
  try {
    const auth = await verifyAuth(request);

    if (!auth.isAuthenticated || !auth.user) {
      // #region agent log
      if (AGENT_LOG_ENABLED) {
        fetch('http://127.0.0.1:7242/ingest/ce5b96bb-1fe8-4a94-9149-04fb97555724', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/app/api/student/courses/route.ts:40', message: 'Token verification failed', data: { hasAuth: !!auth, hasUser: !!auth?.user }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
      }
      // #endregion
      logger.info('❌ Authentication failed');
      return NextResponse.json(
        { message: 'Not authenticated or session expired' },
        { status: 401 }
      );
    }
    const decoded = auth.user;

    // #region agent log
    if (AGENT_LOG_ENABLED) {
      fetch('http://127.0.0.1:7242/ingest/ce5b96bb-1fe8-4a94-9149-04fb97555724', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/app/api/student/courses/route.ts:46', message: 'User authenticated', data: { userId: decoded.id, email: decoded.email }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
    }
    // #endregion
    if (process.env.NODE_ENV === 'development') {
      logger.info('✅ User authenticated:', decoded.id, decoded.email);
    }

    let db;
    try {
      // #region agent log
      if (AGENT_LOG_ENABLED) {
        fetch('http://127.0.0.1:7242/ingest/ce5b96bb-1fe8-4a94-9149-04fb97555724', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/app/api/student/courses/route.ts:50', message: 'Before getDatabaseWithRetry', data: {}, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
      }
      // #endregion
      db = await getDatabaseWithRetry();
      // #region agent log
      if (AGENT_LOG_ENABLED) {
        fetch('http://127.0.0.1:7242/ingest/ce5b96bb-1fe8-4a94-9149-04fb97555724', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/app/api/student/courses/route.ts:52', message: 'Database connection successful', data: { hasDb: !!db }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
      }
      // #endregion
    } catch (dbError: any) {
      // #region agent log
      if (AGENT_LOG_ENABLED) {
        fetch('http://127.0.0.1:7242/ingest/ce5b96bb-1fe8-4a94-9149-04fb97555724', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/app/api/student/courses/route.ts:54', message: 'Database connection failed', data: { error: dbError?.message, code: dbError?.code, stack: dbError?.stack?.substring(0, 200) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
      }
      // #endregion
      logger.error('❌ Database initialization error:', dbError);
      logger.error('Error details:', dbError?.message, dbError?.stack);
      return NextResponse.json(
        {
          message: 'Database connection failed',
          error: dbError?.message || 'Database is not available',
          courses: []
        },
        { status: 500 }
      );
    }

    // Fetch courses with caching and optimized query (filter by status in database, not JS)
    const cacheKey = CacheKeys.USER_ENROLLED_COURSES(decoded.id);
    const rawCourses = await withCache(
      `cache:student:courses:published:${decoded.id}`,
      async () => {
        return await trackQuery(
          'Get published courses',
          async () => {
            return await retryOperation(async () => {
              return await db
                .select({
                  id: courses.id,
                  title: courses.title,
                  description: courses.description,
                  instructor: courses.instructor,
                  thumbnail: courses.thumbnail,
                  pricing: courses.pricing,
                  status: courses.status,
                  isRequestable: courses.isRequestable,
                  isDefaultUnlocked: courses.isDefaultUnlocked,
                  isPublic: courses.isPublic,
                  createdAt: courses.createdAt,
                  updatedAt: courses.updatedAt,
                })
                .from(courses)
                .where(
                  sql`LOWER(${courses.status}) IN ('published', 'active')`
                )
                .orderBy(desc(courses.createdAt));
            });
          }
        );
      },
      { ttl: CacheTTL.COURSE_LIST, dedupe: true }
    );

    if (process.env.NODE_ENV === 'development') {
      logger.info(`🔍 [DEBUG] Raw courses found: ${rawCourses.length}`);
      rawCourses.forEach(c => {
        const statusLower = (c.status || '').toLowerCase();
        const isPublished = statusLower === 'published' || statusLower === 'active';
        logger.info(`   - ID: ${c.id}, Title: "${c.title}", Status: "${c.status}" (lowercase: "${statusLower}", published: ${isPublished})`);
      });
    }

    // Filter out quiz courses (keep Q-Banks) - this is application logic, can't be in DB
    const allCourses = rawCourses.filter(c => {
      const titleLower = (c.title || '').toLowerCase();
      const isQuiz = titleLower.includes('quiz') && !titleLower.includes('q-bank') && !titleLower.includes('qbank');
      if (isQuiz) {
        if (process.env.NODE_ENV === 'development') {
          logger.info(`ℹ️ Course "${c.title}" (ID: ${c.id}) filtered out - identified as quiz course`);
        }
        return false;
      }
      return true;
    });
    if (process.env.NODE_ENV === 'development') {
      logger.info(`✅ [DEBUG] Filtered published courses: ${allCourses.length} out of ${rawCourses.length} total`);
      logger.info(`📚 Found ${allCourses.length} published courses`);
    }

    if (allCourses.length === 0) {
      logger.warn('⚠️ No published courses found');
      return NextResponse.json({ courses: [] });
    }

    // Get enrollment status in parallel with optimized queries and caching
    const enrollmentCacheKey = `cache:student:enrollments:${decoded.id}`;
    const [enrolledProgress, purchasedCourses, enrolledRecords, pendingRequests] = await withCache(
      enrollmentCacheKey,
      async () => {
        return await Promise.all([
          // Wrap studentProgress query in try-catch to handle missing table
          (async () => {
            try {
              return await retryOperation(async () =>
                await db.select({ courseId: studentProgress.courseId })
                  .from(studentProgress)
                  .where(eq(studentProgress.studentId, decoded.id))
              );
            } catch (error: any) {
              // If student_progress table doesn't exist, log and return empty array
              if (error.message?.includes('does not exist') ||
                error.message?.includes('relation') ||
                error.code === '42P01' ||
                error.message?.includes('student_progress')) {
                logger.warn('⚠️ student_progress table does not exist, continuing without it:', error.message);
                return [];
              }
              // Re-throw other errors
              throw error;
            }
          })(),
          // Wrap payments query in try-catch to handle missing table
          (async () => {
            try {
              return await retryOperation(async () =>
                await db.select({ courseId: payments.courseId })
                  .from(payments)
                  .where(
                    and(
                      eq(payments.userId, decoded.id),
                      eq(payments.status, 'completed')
                    )
                  )
              );
            } catch (error: any) {
              // If payments table doesn't exist, log and return empty array
              if (error.message?.includes('does not exist') ||
                error.message?.includes('relation') ||
                error.code === '42P01' ||
                error.message?.includes('payments')) {
                logger.warn('⚠️ payments table does not exist, continuing without it:', error.message);
                return [];
              }
              // Re-throw other errors
              throw error;
            }
          })(),
          // Wrap enrollments query in try-catch to handle missing table
          (async () => {
            try {
              // #region agent log
              if (AGENT_LOG_ENABLED) {
                fetch('http://127.0.0.1:7242/ingest/ce5b96bb-1fe8-4a94-9149-04fb97555724', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/app/api/student/courses/route.ts:118', message: 'Before enrollments query', data: { userId: decoded.id }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
              }
              // #endregion
              const result = await retryOperation(async () =>
                await db.select({ courseId: enrollments.courseId })
                  .from(enrollments)
                  .where(
                    and(
                      eq(enrollments.userId, decoded.id),
                      eq(enrollments.status, 'active')
                    )
                  )
              );
              // #region agent log
              if (AGENT_LOG_ENABLED) {
                fetch('http://127.0.0.1:7242/ingest/ce5b96bb-1fe8-4a94-9149-04fb97555724', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/app/api/student/courses/route.ts:128', message: 'Enrollments query successful', data: { count: result.length }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
              }
              // #endregion
              return result;
            } catch (error: any) {
              // #region agent log
              if (AGENT_LOG_ENABLED) {
                fetch('http://127.0.0.1:7242/ingest/ce5b96bb-1fe8-4a94-9149-04fb97555724', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/app/api/student/courses/route.ts:131', message: 'Enrollments query error', data: { error: error?.message, code: error?.code, includesDoesNotExist: error?.message?.includes('does not exist'), includesRelation: error?.message?.includes('relation'), code42P01: error?.code === '42P01' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
              }
              // #endregion
              // If enrollments table doesn't exist, log and return empty array
              if (error.message?.includes('does not exist') ||
                error.message?.includes('relation') ||
                error.code === '42P01' ||
                error.message?.includes('enrollments')) {
                logger.warn('⚠️ enrollments table does not exist, continuing without it:', error.message);
                return [];
              }
              // Re-throw other errors
              throw error;
            }
          })(),
          // Wrap accessRequests query in try-catch to handle missing table
          (async () => {
            try {
              return await retryOperation(async () =>
                await db.select({
                  courseId: accessRequests.courseId,
                  status: accessRequests.status
                })
                  .from(accessRequests)
                  .where(
                    eq(accessRequests.studentId, decoded.id)
                  )
              );
            } catch (error: any) {
              // If access_requests table doesn't exist, log and return empty array
              if (error.message?.includes('does not exist') ||
                error.message?.includes('relation') ||
                error.code === '42P01' ||
                error.message?.includes('access_requests')) {
                logger.warn('⚠️ access_requests table does not exist, continuing without it:', error.message);
                return [];
              }
              // Re-throw other errors
              throw error;
            }
          })()
        ]);
      },
      { ttl: CacheTTL.USER_DATA, dedupe: true }
    );

    const enrolledCourseIds = new Set([
      ...enrolledProgress.map((p: any) => p.courseId.toString()),
      ...purchasedCourses.map((p: any) => p.courseId.toString()),
      ...enrolledRecords.map((p: any) => p.courseId.toString()),
    ]);

    // Separate pending and approved requests
    const pendingRequestCourseIds = new Set(
      pendingRequests
        .filter((r: any) => r.status === 'pending')
        .map((r: any) => r.courseId.toString())
    );

    const approvedRequestCourseIds = new Set(
      pendingRequests
        .filter((r: any) => r.status === 'approved')
        .map((r: any) => r.courseId.toString())
    );

    // Auto-grant access to default unlocked courses
    for (const course of allCourses.filter((c: any) => c.isDefaultUnlocked)) {
      if (!enrolledCourseIds.has(course.id.toString())) {
        try {
          // Try to insert into studentProgress (may not exist)
          try {
            await db.insert(studentProgress).values({
              studentId: decoded.id,
              courseId: course.id,
              totalProgress: 0,
            });
          } catch (progressError: any) {
            // If student_progress table doesn't exist, just log and continue
            if (progressError.message?.includes('does not exist') ||
              progressError.message?.includes('relation') ||
              progressError.code === '42P01' ||
              progressError.message?.includes('student_progress')) {
              logger.warn(`⚠️ student_progress table not available, skipping progress record for course ${course.id}`);
            } else {
              throw progressError; // Re-throw other errors
            }
          }

          // Try to insert into enrollments (optional - may not exist)
          try {
            await db.insert(enrollments).values({
              userId: decoded.id,
              courseId: course.id,
              status: 'active',
              progress: 0,
            });
          } catch (enrollError: any) {
            // If enrollments table doesn't exist, just log and continue
            if (enrollError.message?.includes('does not exist') ||
              enrollError.message?.includes('relation') ||
              enrollError.code === '42P01' ||
              enrollError.message?.includes('enrollments')) {
              logger.warn(`⚠️ enrollments table not available, skipping enrollment record for course ${course.id}`);
            } else {
              throw enrollError; // Re-throw other errors
            }
          }

          enrolledCourseIds.add(course.id.toString());
          logger.info(`✅ Auto-granted access to default unlocked: ${course.title}`);
        } catch (error) {
          logger.error(`Error auto-granting access to course ${course.id}:`, error);
        }
      }
    }

    // Map courses with proper flags and enrollment status
    const coursesList = allCourses.map((course: any) => {
      const courseIdStr = course.id.toString();
      const hasEnrollment = enrolledCourseIds.has(courseIdStr);
      const hasPendingRequest = pendingRequestCourseIds.has(courseIdStr);

      // Enrollment logic:
      // - If enrolled in either table → isEnrolled = true (regardless of pending request)
      // - Pending requests for enrolled courses are stale and should be ignored
      // - Approved requests should also be treated as enrolled (enrollment sync may be in progress)
      const hasApprovedRequest = approvedRequestCourseIds.has(courseIdStr);
      const isEnrolled = hasEnrollment || hasApprovedRequest;

      // If enrolled, pending request is stale - treat as enrolled
      // If not enrolled but has pending request, show as requested
      const finalIsEnrolled = isEnrolled;

      // Normalize status to lowercase for consistent frontend handling
      const normalizedStatus = course.status?.toLowerCase() === 'active' ? 'active' :
        course.status?.toLowerCase() === 'published' ? 'published' :
          course.status;

      return {
        id: courseIdStr,
        title: course.title,
        description: course.description,
        instructor: course.instructor,
        thumbnail: course.thumbnail,
        pricing: course.pricing || 0,
        status: normalizedStatus,
        isRequestable: course.isRequestable ?? true, // Allow Requests checkbox
        isDefaultUnlocked: course.isDefaultUnlocked ?? false, // Default Unlocked checkbox
        isPublic: course.isPublic ?? false, // Public Course checkbox - direct enrollment
        isEnrolled: finalIsEnrolled,
        hasPendingRequest: hasPendingRequest,
        hasApprovedRequest: hasApprovedRequest, // New field to track approved requests
        createdAt: course.createdAt?.toISOString(),
        updatedAt: course.updatedAt?.toISOString(),
      };
    });

    if (process.env.NODE_ENV === 'development') {
      logger.info(`✅ Returning ${coursesList.length} courses to student ${decoded.id}`);
      if (coursesList.length > 0) {
        coursesList.forEach((c, idx) => {
          logger.info(`  ${idx + 1}. "${c.title}" (ID: ${c.id}, Status: ${c.status}, Enrolled: ${c.isEnrolled}, Public: ${c.isPublic}, Requestable: ${c.isRequestable})`);
        });
      } else {
        logger.warn(`⚠️ WARNING: No courses being returned to student! Raw courses: ${rawCourses.length}, Filtered: ${allCourses.length}, Final list: ${coursesList.length}`);
        logger.warn(`⚠️ Raw course statuses:`, rawCourses.map((c: any) => ({ id: c.id, title: c.title, status: c.status })));
      }
    }

    // #region agent log
    if (AGENT_LOG_ENABLED) {
      fetch('http://127.0.0.1:7242/ingest/ce5b96bb-1fe8-4a94-9149-04fb97555724', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/app/api/student/courses/route.ts:256', message: 'Before returning courses', data: { coursesCount: coursesList.length, rawCount: rawCourses.length, filteredCount: allCourses.length }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
    }
    // #endregion
    stopMonitoring();
    return NextResponse.json({
      courses: coursesList,
      debug: process.env.NODE_ENV === 'development' ? {
        rawCoursesCount: rawCourses.length,
        filteredCoursesCount: allCourses.length,
        finalCoursesCount: coursesList.length,
        rawStatuses: rawCourses.map((c: any) => ({ id: c.id, status: c.status })),
      } : undefined,
    });
  } catch (error: any) {
    stopMonitoring();
    // #region agent log
    if (AGENT_LOG_ENABLED) {
      fetch('http://127.0.0.1:7242/ingest/ce5b96bb-1fe8-4a94-9149-04fb97555724', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/app/api/student/courses/route.ts:263', message: 'Course API error caught', data: { error: error?.message, code: error?.code, stack: error?.stack?.substring(0, 300) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }) }).catch(() => { });
    }
    // #endregion
    logger.error('❌ Get student courses error:', error);

    // Return ERROR details for debugging
    return NextResponse.json(
      {
        message: 'Failed to fetch courses',
        error: error.message,
        stack: error.stack,
        courses: [],
      },
      { status: 500 }
    );
  }
}
