/**
 * Unified Student Data API
 * Single endpoint that returns ALL student data
 *
 * This replaces multiple fragmented endpoints:
 * - /api/student/courses
 * - /api/student/enrolled-courses
 * - /api/student/stats
 * - /api/student/requests
 *
 * Benefits:
 * - Single database transaction (atomic)
 * - Consistent data across all pages
 * - Built-in caching
 * - Reduced API calls (1 instead of 4+)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { unifiedDataService } from '@/lib/services/unified-data-service';
import { createAuthError } from '@/lib/error-handler';
import type { UnifiedStudentData } from '@/types/unified-data';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return createAuthError('Not authenticated');
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return createAuthError('Invalid token');
    }

    console.log(`📊 [Unified API] Fetching data for user ${decoded.id}`);

    // Check if cache bypass is requested
    const { searchParams } = new URL(request.url);
    const bypassCache = searchParams.get('fresh') === 'true';

    // Get ALL data from unified service
    const snapshot = await unifiedDataService.getStudentData(decoded.id, { bypassCache });

    // Transform to API response format
    const response: UnifiedStudentData = {
      user: {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name || '',
        role: decoded.role,
      },
      enrollments: snapshot.enrollments,
      enrolledCourseIds: snapshot.enrollments.map((e) => e.courseId),
      requests: snapshot.requests,
      pendingRequests: snapshot.requests.filter((r) => r.status === 'pending'),
      courses: snapshot.availableCourses,
      stats: snapshot.stats,
      timestamp: snapshot.timestamp,
    };

    console.log(
      `✅ [Unified API] Returning data: ${response.enrollments.length} enrollments, ${response.courses.length} courses, ${response.requests.length} requests`
    );

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('❌ [Unified API] Error:', error);
    return NextResponse.json(
      {
        message: 'Failed to fetch student data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Invalidate cache (for manual refresh)
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return createAuthError('Not authenticated');
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return createAuthError('Invalid token');
    }

    // Invalidate cache for this user
    unifiedDataService.invalidateCache(decoded.id);

    return NextResponse.json({
      message: 'Cache invalidated',
      userId: decoded.id,
    });
  } catch (error: any) {
    console.error('❌ [Unified API] Cache invalidation error:', error);
    return NextResponse.json(
      {
        message: 'Failed to invalidate cache',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
