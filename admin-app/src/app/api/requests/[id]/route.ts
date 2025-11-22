import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { accessRequests, studentProgress } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// PATCH - Approve or deny request
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const { action } = await request.json(); // 'approve' or 'deny'
    const requestId = parseInt(params.id);

    if (!action || !['approve', 'deny'].includes(action)) {
      return NextResponse.json(
        { message: 'Invalid action. Must be "approve" or "deny"' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Get the request details
    const requestData = await db
      .select()
      .from(accessRequests)
      .where(eq(accessRequests.id, requestId))
      .limit(1);

    if (requestData.length === 0) {
      return NextResponse.json({ message: 'Request not found' }, { status: 404 });
    }

    const accessRequest = requestData[0];

    if (accessRequest.status !== 'pending') {
      return NextResponse.json(
        { message: 'Request has already been reviewed' },
        { status: 400 }
      );
    }

    // Update request status
    await db
      .update(accessRequests)
      .set({
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewedAt: new Date(),
        reviewedBy: decoded.id,
      })
      .where(eq(accessRequests.id, requestId));

    // If approved, grant access by creating studentProgress entry
    if (action === 'approve') {
      // Check if student already has progress for this course
      const existingProgress = await db
        .select()
        .from(studentProgress)
        .where(
          and(
            eq(studentProgress.studentId, accessRequest.studentId),
            eq(studentProgress.courseId, accessRequest.courseId)
          )
        );

      if (existingProgress.length === 0) {
        // Create new progress entry (grants access)
        await db.insert(studentProgress).values({
          studentId: accessRequest.studentId,
          courseId: accessRequest.courseId,
          totalProgress: 0,
        });
      }
    }

    return NextResponse.json({
      message: action === 'approve' ? 'Request approved and access granted' : 'Request denied',
      action,
    });
  } catch (error: any) {
    console.error('Update request error:', error);
    return NextResponse.json(
      { message: 'Failed to update request', error: error.message },
      { status: 500 }
    );
  }
}

