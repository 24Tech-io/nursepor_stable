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

    // If already approved and trying to approve again, just ensure enrollment and return success
    if (accessRequest.status === 'approved' && action === 'approve') {
      console.log('ℹ️ Request already approved. Ensuring enrollment...');
      
      // Ensure student is enrolled even if request was already approved
      try {
        const synced = await syncEnrollmentAfterApproval(
          accessRequest.studentId,
          accessRequest.courseId
        );
        
        if (synced) {
          console.log(`✅ Student ${accessRequest.studentId} enrolled in course ${accessRequest.courseId}`);
        } else {
          console.log(`ℹ️ Student ${accessRequest.studentId} already enrolled in course ${accessRequest.courseId}`);
        }
      } catch (enrollmentError: any) {
        console.error('❌ Error ensuring enrollment:', enrollmentError);
        // Don't fail - just log it
      }
      
      return NextResponse.json({
        message: 'Request already approved. Enrollment verified.',
        action: 'approve',
        requestId,
        studentId: accessRequest.studentId,
        courseId: accessRequest.courseId,
        alreadyApproved: true,
      });
    }

    // If already rejected/denied and trying to deny again, just return success
    if (accessRequest.status === 'rejected' && action === 'deny') {
      console.log('ℹ️ Request already denied.');
      return NextResponse.json({
        message: 'Request already denied.',
        action: 'deny',
        requestId,
        alreadyDenied: true,
      });
    }

    // If status is not pending and not the same action, return error
    if (accessRequest.status !== 'pending') {
      console.warn('⚠️ Request already reviewed. Current status:', accessRequest.status);
      return NextResponse.json(
        { message: `Request has already been reviewed (status: ${accessRequest.status})` },
        { status: 400 }
      );
    }

    // Update request status
    try {
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      
      const updateResult = await db
        .update(accessRequests)
        .set({
          status: newStatus,
          reviewedAt: new Date(),
          reviewedBy: decoded.id,
        })
        .where(eq(accessRequests.id, requestId))
        .returning();

      console.log(`✅ Request ${requestId} updated to status: ${newStatus}`);
      console.log(`📝 Update result:`, updateResult);
      
      // Verify the update by reading it back
      const verifyRequest = await db
        .select({ id: accessRequests.id, status: accessRequests.status })
        .from(accessRequests)
        .where(eq(accessRequests.id, requestId))
        .limit(1);
      
      console.log(`🔍 Verification - Request ${requestId} status is now:`, verifyRequest[0]?.status);
      
      if (verifyRequest[0]?.status !== newStatus) {
        console.error(`❌ STATUS MISMATCH! Expected ${newStatus}, got ${verifyRequest[0]?.status}`);
        return NextResponse.json(
          { message: 'Request status update failed verification', error: 'Status mismatch' },
          { status: 500 }
        );
      }
    } catch (updateError: any) {
      console.error('❌ Error updating request status:', updateError);
      return NextResponse.json(
        { message: 'Failed to update request status', error: updateError.message },
        { status: 500 }
      );
    }

    // If approved, grant access by creating studentProgress entry
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
      } catch (enrollmentError: any) {
        console.error('❌ Error syncing enrollment:', enrollmentError);
        // Don't fail the whole request if enrollment sync fails - request is already approved
        // But log it for debugging
        console.warn('⚠️ Request approved but enrollment sync failed. Student may need manual enrollment.');
      }
    }

      // Final verification - read the request one more time to ensure status is updated
      const finalCheck = await db
        .select({ id: accessRequests.id, status: accessRequests.status, reviewedAt: accessRequests.reviewedAt })
        .from(accessRequests)
        .where(eq(accessRequests.id, requestId))
        .limit(1);
      
      console.log(`🔍 Final status check for request ${requestId}:`, finalCheck[0]);
      
      return NextResponse.json({
        message: action === 'approve' ? 'Request approved and access granted' : 'Request denied',
        action,
        requestId,
        studentId: accessRequest.studentId,
        courseId: accessRequest.courseId,
        status: finalCheck[0]?.status, // Include the actual status in response
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
