import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { studentProgress, courses, accessRequests, enrollments } from '@/lib/db/schema';
import { eq, and, desc, or, sql } from 'drizzle-orm';
import { getPublishedCourseFilter } from '@/lib/enrollment-helpers';
import { createAuthError } from '@/lib/error-handler';

// Cache for 30 seconds - allows stale-while-revalidate
export const revalidate = 30;

/**
 * Unified dashboard endpoint that fetches all dashboard data in a single request
 * This significantly improves performance by:
 * 1. Reducing network round trips (4 requests -> 1 request)
 * 2. Allowing parallel database queries
 * 3. Enabling better caching
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('studentToken')?.value;

    if (!token) {
      return createAuthError('Not authenticated');
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.id) {
      return createAuthError('Invalid token');
    }

    const db = getDatabase();
    const userId = decoded.id;

    // Fetch all dashboard data in parallel for maximum performance
    const [
      // Stats data
      statsData,
      // All courses
      coursesData,
      // Enrolled courses
      enrolledCoursesData,
      // Pending requests
      requestsData,
    ] = await Promise.all([
      // 1. Fetch stats
      fetchStats(userId, db),
      // 2. Fetch all courses
      fetchCourses(userId, db),
      // 3. Fetch enrolled courses
      fetchEnrolledCourses(userId, db),
      // 4. Fetch pending requests
      fetchPendingRequests(userId, db),
    ]);

    return NextResponse.json(
      {
        stats: statsData,
        courses: coursesData,
        enrolledCourses: enrolledCoursesData,
        requests: requestsData,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error: any) {
    console.error('Dashboard data error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch dashboard data', error: error.message },
      { status: 500 }
    );
  }
}

// Helper function to fetch stats
async function fetchStats(userId: number, db: any) {
  try {
    // Get pending request course IDs to exclude from enrolled count
    const pendingRequests = await db
      .select({
        courseId: accessRequests.courseId,
      })
      .from(accessRequests)
      .where(and(eq(accessRequests.studentId, userId), eq(accessRequests.status, 'pending')));

    const pendingRequestCourseIds = pendingRequests.map((r: any) => r.courseId);

    // Get all enrolled courses from BOTH tables in parallel
    const [allEnrolledProgress, allEnrolledRecords] = await Promise.all([
      db
        .select({
          courseId: studentProgress.courseId,
        })
        .from(studentProgress)
        .innerJoin(courses, eq(studentProgress.courseId, courses.id))
        .where(and(eq(studentProgress.studentId, userId), getPublishedCourseFilter())),
      db
        .select({
          courseId: enrollments.courseId,
        })
        .from(enrollments)
        .innerJoin(courses, eq(enrollments.courseId, courses.id))
        .where(
          and(
            eq(enrollments.userId, userId),
            eq(enrollments.status, 'active'),
            getPublishedCourseFilter()
          )
        ),
    ]);

    // Merge course IDs from both tables
    const allEnrolledCourseIds = new Set([
      ...allEnrolledProgress.map((p: any) => p.courseId),
      ...allEnrolledRecords.map((e: any) => e.courseId),
    ]);

    // Filter out courses with pending requests
    const actualEnrolledCourseIds = Array.from(allEnrolledCourseIds).filter(
      (courseId: number) => !pendingRequestCourseIds.includes(courseId)
    );

    const coursesEnrolled = actualEnrolledCourseIds.length;

    // Get completed courses (progress >= 100) from BOTH tables
    const [allCompletedProgress, allCompletedEnrollments] = await Promise.all([
      db
        .select({
          courseId: studentProgress.courseId,
        })
        .from(studentProgress)
        .innerJoin(courses, eq(studentProgress.courseId, courses.id))
        .where(
          and(
            eq(studentProgress.studentId, userId),
            getPublishedCourseFilter(),
            sql`${studentProgress.totalProgress} >= 100`
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
            eq(enrollments.userId, userId),
            eq(enrollments.status, 'active'),
            getPublishedCourseFilter(),
            sql`${enrollments.progress} >= 100`
          )
        ),
    ]);

    // Merge completed course IDs
    const allCompletedCourseIds = new Set([
      ...allCompletedProgress.map((p: any) => p.courseId),
      ...allCompletedEnrollments.map((e: any) => e.courseId),
    ]);

    const actualCompletedCourseIds = Array.from(allCompletedCourseIds).filter(
      (courseId: number) => !pendingRequestCourseIds.includes(courseId)
    );

    const coursesCompleted = actualCompletedCourseIds.length;

    // Calculate total hours learned
    const [progressSum, enrollmentSum] = await Promise.all([
      db
        .select({
          totalProgress: sql<number>`coalesce(sum(${studentProgress.totalProgress}), 0)`,
        })
        .from(studentProgress)
        .where(eq(studentProgress.studentId, userId)),
      db
        .select({
          progress: sql<number>`coalesce(sum(${enrollments.progress}), 0)`,
        })
        .from(enrollments)
        .where(and(eq(enrollments.userId, userId), eq(enrollments.status, 'active'))),
    ]);

    // Use the higher value (prefer enrollments.progress)
    const totalProgress = Math.max(
      Number(progressSum[0]?.totalProgress || 0),
      Number(enrollmentSum[0]?.progress || 0)
    );
    const hoursLearned = Math.round(totalProgress / 10); // Approximate: 10% = 1 hour

    // Get quiz completions (simplified - you may want to add actual quiz tracking)
    const quizzesCompleted = 0; // TODO: Add actual quiz completion tracking

    // Get current streak (simplified)
    const currentStreak = 0; // TODO: Add actual streak tracking

    // Get total points (simplified)
    const totalPoints = 0; // TODO: Add actual points system

    return {
      coursesEnrolled,
      coursesCompleted,
      hoursLearned,
      quizzesCompleted,
      currentStreak,
      totalPoints,
    };
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return {
      coursesEnrolled: 0,
      coursesCompleted: 0,
      hoursLearned: 0,
      quizzesCompleted: 0,
      currentStreak: 0,
      totalPoints: 0,
    };
  }
}

// Helper function to fetch all courses
async function fetchCourses(userId: number, db: any) {
  try {
    const allCourses = await db
      .select()
      .from(courses)
      .where(
        or(
          eq(courses.status, 'published'),
          eq(courses.status, 'active'),
          eq(courses.status, 'Active')
        )
      )
      .orderBy(desc(courses.createdAt));

    // Get enrollment status in parallel
    const [enrolledProgress, enrolledRecords, pendingRequests] = await Promise.all([
      db
        .select({ courseId: studentProgress.courseId })
        .from(studentProgress)
        .where(eq(studentProgress.studentId, userId)),
      db
        .select({ courseId: enrollments.courseId })
        .from(enrollments)
        .where(and(eq(enrollments.userId, userId), eq(enrollments.status, 'active'))),
      db
        .select({ courseId: accessRequests.courseId })
        .from(accessRequests)
        .where(
          and(eq(accessRequests.studentId, userId), eq(accessRequests.status, 'pending'))
        ),
    ]);

    const enrolledCourseIds = new Set([
      ...enrolledProgress.map((p: any) => p.courseId),
      ...enrolledRecords.map((e: any) => e.courseId),
    ]);

    const pendingRequestCourseIds = new Set(
      pendingRequests.map((r: any) => r.courseId)
    );

    return allCourses.map((course: any) => ({
      ...course,
      isEnrolled: enrolledCourseIds.has(course.id),
      hasPendingRequest: pendingRequestCourseIds.has(course.id),
    }));
  } catch (error: any) {
    console.error('Error fetching courses:', error);
    return [];
  }
}

// Helper function to fetch enrolled courses
async function fetchEnrolledCourses(userId: number, db: any) {
  try {
    // Get enrolled courses from both tables
    const [progressRecords, enrollmentRecords] = await Promise.all([
      db
        .select({
          courseId: studentProgress.courseId,
          progress: studentProgress.totalProgress,
        })
        .from(studentProgress)
        .innerJoin(courses, eq(studentProgress.courseId, courses.id))
        .where(and(eq(studentProgress.studentId, userId), getPublishedCourseFilter())),
      db
        .select({
          courseId: enrollments.courseId,
          progress: enrollments.progress,
        })
        .from(enrollments)
        .innerJoin(courses, eq(enrollments.courseId, courses.id))
        .where(
          and(
            eq(enrollments.userId, userId),
            eq(enrollments.status, 'active'),
            getPublishedCourseFilter()
          )
        ),
    ]);

    // Merge and deduplicate
    const enrolledMap = new Map<number, number>();
    progressRecords.forEach((p: any) => {
      enrolledMap.set(p.courseId, p.progress || 0);
    });
    enrollmentRecords.forEach((e: any) => {
      const existing = enrolledMap.get(e.courseId) || 0;
      enrolledMap.set(e.courseId, Math.max(existing, e.progress || 0));
    });

    return Array.from(enrolledMap.entries()).map(([courseId, progress]) => ({
      courseId,
      progress,
    }));
  } catch (error: any) {
    console.error('Error fetching enrolled courses:', error);
    return [];
  }
}

// Helper function to fetch pending requests
async function fetchPendingRequests(userId: number, db: any) {
  try {
    const requests = await db
      .select({
        id: accessRequests.id,
        courseId: accessRequests.courseId,
        courseTitle: courses.title,
        reason: accessRequests.reason,
        status: accessRequests.status,
        requestedAt: accessRequests.requestedAt,
        reviewedAt: accessRequests.reviewedAt,
      })
      .from(accessRequests)
      .innerJoin(courses, eq(accessRequests.courseId, courses.id))
      .where(eq(accessRequests.studentId, userId))
      .orderBy(desc(accessRequests.requestedAt));

    return requests;
  } catch (error: any) {
    console.error('Error fetching pending requests:', error);
    return [];
  }
}


