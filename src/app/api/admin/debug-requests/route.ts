import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { accessRequests, users, courses } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Debug endpoint to check all access requests in database
 * Shows requests even if student/course is deleted
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

    const db = getDatabase();

    // Get ALL requests (raw data)
    const allRequests = await db
      .select()
      .from(accessRequests)
      .orderBy(desc(accessRequests.requestedAt));

    // Get requests with student/course details
    const requestsWithDetails = await Promise.all(
      allRequests.map(async (req: any) => {
        const [student] = await db.select().from(users).where(eq(users.id, req.studentId)).limit(1);

        const [course] = await db
          .select()
          .from(courses)
          .where(eq(courses.id, req.courseId))
          .limit(1);

        return {
          id: req.id,
          studentId: req.studentId,
          studentName: student?.name || 'STUDENT NOT FOUND',
          studentEmail: student?.email || 'N/A',
          courseId: req.courseId,
          courseTitle: course?.title || 'COURSE NOT FOUND',
          courseStatus: course?.status || 'DELETED',
          reason: req.reason,
          status: req.status,
          requestedAt: req.requestedAt?.toISOString(),
          reviewedAt: req.reviewedAt?.toISOString(),
          reviewedBy: req.reviewedBy,
          isValid: !!(student && course),
        };
      })
    );

    const pendingRequests = requestsWithDetails.filter((r) => r.status === 'pending');
    const validPending = pendingRequests.filter((r) => r.isValid);
    const orphanedPending = pendingRequests.filter((r) => !r.isValid);

    return NextResponse.json({
      success: true,
      summary: {
        totalRequests: allRequests.length,
        pendingRequests: pendingRequests.length,
        validPendingRequests: validPending.length,
        orphanedPendingRequests: orphanedPending.length,
      },
      allRequests: requestsWithDetails,
      pendingRequests: pendingRequests,
      validPendingRequests: validPending,
      orphanedPendingRequests: orphanedPending,
      message: `Found ${allRequests.length} total requests. ${pendingRequests.length} pending (${validPending.length} valid, ${orphanedPending.length} orphaned)`,
    });
  } catch (error: any) {
    console.error('Debug requests error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to debug requests',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

