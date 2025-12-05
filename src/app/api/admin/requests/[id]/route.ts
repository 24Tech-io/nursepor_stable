import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { accessRequests, studentProgress, courses, enrollments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { sendRequestStatusNotification } from '@/lib/notification-helpers';
import { approveRequest, rejectRequest } from '@/lib/data-manager/helpers/request-helper';

// PATCH - Approve or deny request
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('🔄 [PATCH /api/admin/requests/[id]] Starting request approval/denial...');

    // Check authentication - try both token and token
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      console.error('❌ No token cookie found');
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      console.error('❌ Token verification failed');
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    if (decoded.role !== 'admin') {
      console.error('❌ User is not an admin. Role:', decoded.role);
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    console.log('✅ Admin authenticated:', { id: decoded.id, email: decoded.email });

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error('❌ Failed to parse request body:', e);
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }

    const { action } = body; // 'approve' or 'deny'
    const requestId = parseInt(params.id);

    console.log('📋 Request details:', { requestId, action, paramsId: params.id });

    if (!action || !['approve', 'deny'].includes(action)) {
      return NextResponse.json(
        { message: 'Invalid action. Must be "approve" or "deny"' },
        { status: 400 }
      );
    }

    if (isNaN(requestId)) {
      return NextResponse.json({ message: 'Invalid request ID' }, { status: 400 });
    }

    // Get database connection
    let db;
    try {
      db = getDatabase();
      console.log('✅ Database connection established');
    } catch (dbError: any) {
      console.error('❌ Database connection failed:', dbError);
      return NextResponse.json(
        { message: 'Database connection failed', error: dbError.message },
        { status: 500 }
      );
    }

    // Get the request details with course info
    let requestDataWithCourse;
    try {
      requestDataWithCourse = await db
        .select({
          id: accessRequests.id,
          studentId: accessRequests.studentId,
          courseId: accessRequests.courseId,
          status: accessRequests.status,
          courseTitle: courses.title,
        })
        .from(accessRequests)
        .innerJoin(courses, eq(accessRequests.courseId, courses.id))
        .where(eq(accessRequests.id, requestId))
        .limit(1);

      console.log('📊 Request query result:', requestDataWithCourse.length, 'found');
    } catch (queryError: any) {
      console.error('❌ Error querying request:', queryError);
      return NextResponse.json(
        { message: 'Failed to fetch request', error: queryError.message },
        { status: 500 }
      );
    }

    if (requestDataWithCourse.length === 0) {
      console.error('❌ Request not found with ID:', requestId);
      return NextResponse.json({ message: 'Request not found' }, { status: 404 });
    }

    const accessRequest = requestDataWithCourse[0];
    console.log('📋 Request found:', {
      id: accessRequest.id,
      studentId: accessRequest.studentId,
      courseId: accessRequest.courseId,
      status: accessRequest.status,
      courseTitle: accessRequest.courseTitle,
    });

    // If request is already approved/rejected, just delete it and return success
    // This handles cases where the request was approved but not deleted
    if (accessRequest.status !== 'pending') {
      console.warn(
        `⚠️ Request #${requestId} already reviewed (status: ${accessRequest.status}). Deleting it now.`
      );
      try {
        await db.delete(accessRequests).where(eq(accessRequests.id, requestId));
        console.log(`🗑️ Deleted already-reviewed request #${requestId}`);
        return NextResponse.json({
          message: `Request was already ${accessRequest.status} and has been removed`,
          action: accessRequest.status === 'approved' ? 'approve' : 'deny',
          requestId,
          studentId: accessRequest.studentId,
          courseId: accessRequest.courseId,
          deleted: true,
        });
      } catch (deleteError: any) {
        console.error(`❌ Failed to delete already-reviewed request #${requestId}:`, deleteError);
        return NextResponse.json(
          { message: `Request already reviewed (status: ${accessRequest.status})` },
          { status: 400 }
        );
      }
    }

    // Use DataManager for request approval/rejection (with validation, transaction, and event emission)
    if (action === 'approve') {
      const result = await approveRequest({
        requestId,
        action: 'approve',
        adminId: decoded.id,
        reason: body.reason,
      });

      if (!result.success) {
        return NextResponse.json(
          {
            message: result.error?.message || 'Failed to approve request',
            error: result.error?.code,
            details: result.error?.details,
          },
          { status: result.error?.retryable ? 503 : 400 }
        );
      }

      // Verify enrollment was created in both tables
      const [progressCheck, enrollmentCheck] = await Promise.all([
        db
          .select({ id: studentProgress.id })
          .from(studentProgress)
          .where(
            and(
              eq(studentProgress.studentId, accessRequest.studentId),
              eq(studentProgress.courseId, accessRequest.courseId)
            )
          )
          .limit(1),
        db
          .select({ id: enrollments.id })
          .from(enrollments)
          .where(
            and(
              eq(enrollments.userId, accessRequest.studentId),
              eq(enrollments.courseId, accessRequest.courseId),
              eq(enrollments.status, 'active')
            )
          )
          .limit(1),
      ]);

      if (progressCheck.length === 0 && enrollmentCheck.length === 0) {
        console.error(
          `❌ [PATCH /api/admin/requests/${requestId}] CRITICAL: Enrollment not created after approval!`
        );
        // This is a critical error - enrollment should have been created by DataManager
        // Log it but don't fail the request - the transaction should have rolled back
      } else {
        console.log(
          `✅ [PATCH /api/admin/requests/${requestId}] Enrollment verified: progress=${progressCheck.length > 0}, enrollment=${enrollmentCheck.length > 0}`
        );
      }

      // Send notification to student (non-blocking)
      try {
        await sendRequestStatusNotification(
          accessRequest.studentId,
          accessRequest.courseTitle,
          'approved'
        );
        console.log('✅ Notification sent to student');
      } catch (notifError: any) {
        console.error('⚠️ Failed to send notification (non-critical):', notifError);
      }

      return NextResponse.json({
        message: 'Request approved, access granted, and request removed',
        action: 'approve',
        requestId,
        studentId: accessRequest.studentId,
        courseId: accessRequest.courseId,
        deleted: true,
        operationId: result.operationId,
        enrollmentCreated: result.data?.enrollmentCreated || false,
      });
    } else {
      const result = await rejectRequest({
        requestId,
        action: 'reject',
        adminId: decoded.id,
        reason: body.reason,
      });

      if (!result.success) {
        return NextResponse.json(
          {
            message: result.error?.message || 'Failed to reject request',
            error: result.error?.code,
            details: result.error?.details,
          },
          { status: result.error?.retryable ? 503 : 400 }
        );
      }

      // Send notification for denied requests (non-blocking)
      try {
        await sendRequestStatusNotification(
          accessRequest.studentId,
          accessRequest.courseTitle,
          'rejected'
        );
        console.log('✅ Notification sent to student');
      } catch (notifError: any) {
        console.error('⚠️ Failed to send notification (non-critical):', notifError);
      }

      return NextResponse.json({
        message: 'Request denied and removed',
        action: 'deny',
        requestId,
        studentId: accessRequest.studentId,
        courseId: accessRequest.courseId,
        deleted: true,
        operationId: result.operationId,
      });
    }

    // Response is already returned in the approve/reject blocks above
  } catch (error: any) {
    console.error('❌ [PATCH /api/admin/requests/[id]] Unexpected error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      {
        message: 'Failed to update request',
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
