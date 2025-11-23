import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { accessRequests, studentProgress, courses } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { syncEnrollmentAfterApproval } from '@/lib/enrollment-sync';

// PATCH - Approve or deny request
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔄 [PATCH /api/requests/[id]] Starting request approval/denial...');
    
    // Check authentication
    const token = request.cookies.get('adminToken')?.value;
    if (!token) {
      console.error('❌ No adminToken cookie found');
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
      return NextResponse.json(
        { message: 'Invalid request body' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { message: 'Invalid request ID' },
        { status: 400 }
      );
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
          courseTitle: courses.title
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
      courseTitle: accessRequest.courseTitle
    });

    // If request is already approved/rejected, delete it and return success
    // This handles cases where the request was approved but not deleted
    if (accessRequest.status !== 'pending') {
      console.warn(`⚠️ Request #${requestId} already reviewed (status: ${accessRequest.status}). Deleting it now.`);
      
      // If approved, ensure enrollment is synced before deleting
      if (accessRequest.status === 'approved') {
        try {
          await syncEnrollmentAfterApproval(
            accessRequest.studentId,
            accessRequest.courseId
          );
        } catch (enrollmentError: any) {
          console.error('❌ Error ensuring enrollment:', enrollmentError);
        }
      }
      
      // Delete the request regardless of status
      try {
        await db.delete(accessRequests).where(eq(accessRequests.id, requestId));
        console.log(`🗑️ Deleted already-reviewed request #${requestId} (status: ${accessRequest.status})`);
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

    // For approve/deny, DELETE immediately without updating status first
    // This prevents any chance of the request remaining with wrong status
    console.log(`🗑️ [PATCH /api/requests/${requestId}] Processing ${action} - will delete immediately`);
    
    // If approved, grant access by creating studentProgress entry FIRST
    if (action === 'approve') {
      try {
        console.log(`🔄 Syncing enrollment for student ${accessRequest.studentId} and course ${accessRequest.courseId}...`);
        const synced = await syncEnrollmentAfterApproval(
          accessRequest.studentId,
          accessRequest.courseId
        );
        
        if (synced) {
          console.log(`✅ Student ${accessRequest.studentId} enrolled in course ${accessRequest.courseId}`);
        } else {
          console.log(`ℹ️ Student ${accessRequest.studentId} already enrolled in course ${accessRequest.courseId}`);
        }
        
        // Verify enrollment was successful
        const enrollmentCheck = await db
          .select()
          .from(studentProgress)
          .where(
            and(
              eq(studentProgress.studentId, accessRequest.studentId),
              eq(studentProgress.courseId, accessRequest.courseId)
            )
          )
          .limit(1);
        
        if (enrollmentCheck.length === 0) {
          console.warn(`⚠️ [PATCH /api/requests/${requestId}] Enrollment not confirmed, but proceeding with deletion`);
        }
      } catch (enrollmentError: any) {
        console.error(`❌ [PATCH /api/requests/${requestId}] Error syncing enrollment:`, enrollmentError);
        // Continue with deletion even if enrollment fails
      }
    }
    
    // Delete the request IMMEDIATELY - don't update status first
    // Use retry logic to ensure deletion succeeds
    let deleted = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    console.log(`🗑️ [PATCH /api/requests/${requestId}] Deleting request immediately...`);
    
    while (!deleted && retryCount < maxRetries) {
      try {
        await db.delete(accessRequests).where(eq(accessRequests.id, requestId));
        
        // Verify deletion succeeded
        const verifyDelete = await db
          .select({ id: accessRequests.id })
          .from(accessRequests)
          .where(eq(accessRequests.id, requestId))
          .limit(1);
        
        if (verifyDelete.length === 0) {
          deleted = true;
          console.log(`✅ [PATCH /api/requests/${requestId}] Request deleted and verified (attempt ${retryCount + 1})`);
        } else {
          retryCount++;
          console.warn(`⚠️ [PATCH /api/requests/${requestId}] Deletion verification failed, retrying... (attempt ${retryCount}/${maxRetries})`);
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 100 * retryCount)); // Exponential backoff
          }
        }
      } catch (deleteError: any) {
        retryCount++;
        console.error(`❌ [PATCH /api/requests/${requestId}] Failed to delete request (attempt ${retryCount}/${maxRetries}):`, deleteError);
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 100 * retryCount)); // Exponential backoff
        }
      }
    }
    
    if (!deleted) {
      console.error(`❌ [PATCH /api/requests/${requestId}] CRITICAL: Failed to delete request after ${maxRetries} attempts`);
      return NextResponse.json(
        { 
          message: 'Failed to delete request after processing',
          error: 'Deletion failed after multiple retries',
          requestId 
        },
        { status: 500 }
      );
    }
      
      return NextResponse.json({
        message: action === 'approve' 
          ? 'Request approved, access granted, and request removed' 
          : 'Request denied and removed',
        action,
        requestId,
        studentId: accessRequest.studentId,
        courseId: accessRequest.courseId,
        deleted: true, // Indicate that the request was deleted
      });
  } catch (error: any) {
    console.error('❌ [PATCH /api/requests/[id]] Unexpected error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        message: 'Failed to update request', 
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
