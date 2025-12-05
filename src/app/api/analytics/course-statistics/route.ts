import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { courses, enrollments, accessRequests } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import cache, { CacheKeys, CacheTTL } from '@/lib/cache';
import { getPublishedCourseFilter } from '@/lib/enrollment-helpers';

/**
 * Analytics Course Statistics API
 * Calculates course-level statistics using SQL aggregation for performance
 * Replaces the inefficient method of fetching individual student details
 */
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

    // Check cache first
    const cacheKey = CacheKeys.courseStats();
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('✅ Serving course statistics from cache');
      return NextResponse.json(cached);
    }

    const db = getDatabase();

    // Get all published/active courses using standardized filter
    const allCourses = await db
      .select({
        id: courses.id,
        title: courses.title,
        status: courses.status,
      })
      .from(courses)
      .where(getPublishedCourseFilter());

    // Calculate statistics for each course using SQL aggregation
    // This is much faster than fetching individual student details
    const courseStatsPromises = allCourses.map(async (course) => {
      // Get enrollment count and average progress from enrollments table (single source of truth)
      const enrollmentStats = await db
        .select({
          count: sql<number>`count(*)::int`,
          avgProgress: sql<number>`coalesce(avg(${enrollments.progress})::int, 0)`,
          completedCount: sql<number>`count(*) filter (where ${enrollments.progress} >= 100)::int`,
        })
        .from(enrollments)
        .where(and(eq(enrollments.courseId, course.id), eq(enrollments.status, 'active')));

      const enrollmentData = enrollmentStats[0] || { count: 0, avgProgress: 0, completedCount: 0 };

      // Get unique student IDs from enrollments table
      const [enrollmentStudentIds, pendingRequestStudentIds] = await Promise.all([
        db
          .select({ studentId: enrollments.userId })
          .from(enrollments)
          .where(and(eq(enrollments.courseId, course.id), eq(enrollments.status, 'active'))),
        db
          .select({ studentId: accessRequests.studentId })
          .from(accessRequests)
          .where(and(eq(accessRequests.courseId, course.id), eq(accessRequests.status, 'pending'))),
      ]);

      // Get unique student IDs (deduplicate in JavaScript)
      const allStudentIds = new Set(enrollmentStudentIds.map((e: any) => e.studentId));

      // Get pending request student IDs to exclude
      const pendingStudentIds = new Set(pendingRequestStudentIds.map((r: any) => r.studentId));

      // Calculate total enrollments (unique students minus those with pending requests)
      const totalEnrollments = Array.from(allStudentIds).filter(
        (studentId) => !pendingStudentIds.has(studentId)
      ).length;

      const pendingCount = pendingStudentIds.size;

      // Calculate average progress from enrollments table
      const avgProgress = Number(enrollmentData.avgProgress) || 0;

      // Calculate completion count
      const totalCompleted = Number(enrollmentData.completedCount) || 0;
      const completionRate =
        totalEnrollments > 0 ? Math.round((totalCompleted / totalEnrollments) * 100) : 0;

      return {
        courseId: course.id,
        courseTitle: course.title,
        enrollments: totalEnrollments,
        averageProgress: avgProgress,
        completionRate,
        completedCount: totalCompleted,
        pendingRequests: pendingCount,
      };
    });

    const courseStats = await Promise.all(courseStatsPromises);

    // Calculate overall statistics
    const totalEnrollments = courseStats.reduce((sum, stat) => sum + stat.enrollments, 0);
    const totalProgressSum = courseStats.reduce(
      (sum, stat) => sum + stat.averageProgress * stat.enrollments,
      0
    );
    const overallAverageProgress =
      totalEnrollments > 0 ? Math.round(totalProgressSum / totalEnrollments) : 0;

    const totalCompleted = courseStats.reduce((sum, stat) => sum + stat.completedCount, 0);
    const overallCompletionRate =
      totalEnrollments > 0 ? Math.round((totalCompleted / totalEnrollments) * 100) : 0;

    const result = {
      overall: {
        totalEnrollments,
        averageProgress: overallAverageProgress,
        completionRate: overallCompletionRate,
        totalCompleted,
      },
      courses: courseStats,
      generatedAt: new Date().toISOString(),
    };

    // Cache the result
    cache.set(cacheKey, result, CacheTTL.analytics);
    console.log('📊 Fetched and cached course statistics');

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ Analytics course statistics error:', error);
    return NextResponse.json(
      {
        message: 'Failed to get course statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
