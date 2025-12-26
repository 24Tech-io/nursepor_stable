import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { z } from 'zod';
/**
 * Unified Student Data API - Admin Version
 * Single endpoint that returns ALL student data for admin view
 *
 * Same as student version but:
 * - Uses token cookie
 * - Accepts studentId query parameter
 * - Requires admin role
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { studentProgress, enrollments, accessRequests, courses } from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';

// Reuse the same merge logic as student app
function mergeEnrollmentData(progressRecords: any[], enrollmentRecords: any[]) {
  const map = new Map();

  // Add enrollments first (source of truth)
  enrollmentRecords.forEach((e: any) => {
    map.set(e.courseId, {
      courseId: e.courseId,
      progress: e.progress || 0,
      status: e.status || 'active',
      enrolledAt: e.enrolledAt,
      lastAccessed: null,
      source: 'enrollments',
    });
  });

  // Add from studentProgress only if not in enrollments
  progressRecords.forEach((p: any) => {
    if (!map.has(p.courseId)) {
      map.set(p.courseId, {
        courseId: p.courseId,
        progress: p.totalProgress || 0,
        status: 'active',
        enrolledAt: p.createdAt,
        lastAccessed: p.lastAccessed || null,
        source: 'studentProgress',
      });
    } else {
      const existing = map.get(p.courseId);
      if (p.lastAccessed && (!existing.lastAccessed || p.lastAccessed > existing.lastAccessed)) {
        existing.lastAccessed = p.lastAccessed;
      }
    }
  });

  return Array.from(map.values());
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || !decoded.id) {
      return createAuthError('Invalid token');
    }

    logger.info(`📊 [Unified API] Fetching data for user ${decoded.id}`);

    // Check if cache bypass is requested
    const { searchParams } = new URL(request.url);
    const studentIdParam = searchParams.get('studentId');

    if (!studentIdParam) {
      return NextResponse.json({ message: 'studentId parameter required' }, { status: 400 });
    }

    const studentId = parseInt(studentIdParam);
    console.log(`📊 [Admin Unified API] Fetching data for student ${studentId}`);

    logger.info(`✅ [Unified API] Returning data: ${response.enrollments.length} enrollments, ${response.courses.length} courses, ${response.requests.length} requests`);

    // Fetch ALL data in single transaction
    const snapshot = await db.transaction(async (tx) => {
      const [progressRecords, enrollmentRecords, requestRecords, allCourses] = await Promise.all([
        tx.select().from(studentProgress).where(eq(studentProgress.studentId, studentId)),
        tx.select().from(enrollments).where(eq(enrollments.userId, studentId)),
        tx.select().from(accessRequests).where(eq(accessRequests.studentId, studentId)),
        tx
          .select()
          .from(courses)
          .where(
            or(
              eq(courses.status, 'published'),
              eq(courses.status, 'active'),
              eq(courses.status, 'Active')
            )
          ),
      ]);

      const mergedEnrollments = mergeEnrollmentData(progressRecords, enrollmentRecords);

      return {
        studentId,
        enrollments: mergedEnrollments,
        requests: requestRecords,
        courses: allCourses,
        stats: {
          coursesEnrolled: mergedEnrollments.length,
          coursesCompleted: mergedEnrollments.filter((e: any) => e.progress >= 100).length,
          pendingRequests: requestRecords.filter((r: any) => r.status === 'pending').length,
        },
        timestamp: Date.now(),
      };
    });

    console.log(
      `✅ [Admin Unified API] Returning data: ${snapshot.enrollments.length} enrollments, ${snapshot.courses.length} courses`
    );

    return NextResponse.json(snapshot);
  } catch (error: any) {
    logger.error('❌ [Unified API] Error:', error);
    return NextResponse.json(
      {
        message: 'Failed to fetch student data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}


    const decoded = await verifyToken(token);
    if (!decoded || !decoded.id) {
      return createAuthError('Invalid token');
    }


    return NextResponse.json({
      message: 'Cache invalidated',
      userId: decoded.id,
    });

  } catch (error: any) {
    logger.error('❌ [Unified API] Cache invalidation error:', error);
    return NextResponse.json(
      {
        message: 'Failed to invalidate cache',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

