import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { accessRequests, studentProgress } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { message: 'Invalid status. Must be "approved" or "rejected"' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const requestId = parseInt(params.requestId);

    // Get the request
    const [requestData] = await db
      .select()
      .from(accessRequests)
      .where(eq(accessRequests.id, requestId))
      .limit(1);

    if (!requestData) {
      return NextResponse.json(
        { message: 'Request not found' },
        { status: 404 }
      );
    }

    // Update request status
    const [updatedRequest] = await db
      .update(accessRequests)
      .set({
        status,
        reviewedAt: new Date(),
        reviewedBy: decoded.id,
      })
      .where(eq(accessRequests.id, requestId))
      .returning();

    // If approved, enroll student in the course
    if (status === 'approved') {
      // Check if student progress already exists
      const existingProgress = await db
        .select()
        .from(studentProgress)
        .where(
          and(
            eq(studentProgress.studentId, requestData.studentId),
            eq(studentProgress.courseId, requestData.courseId)
          )
        )
        .limit(1);

      // Create student progress if it doesn't exist
      if (existingProgress.length === 0) {
        await db.insert(studentProgress).values({
          studentId: requestData.studentId,
          courseId: requestData.courseId,
          completedChapters: '[]',
          watchedVideos: '[]',
          quizAttempts: '[]',
          totalProgress: 0,
        });
      }
    }

    return NextResponse.json({
      request: {
        id: updatedRequest.id.toString(),
        studentId: updatedRequest.studentId.toString(),
        courseId: updatedRequest.courseId.toString(),
        reason: updatedRequest.reason,
        status: updatedRequest.status,
        requestedAt: updatedRequest.requestedAt?.toISOString(),
        reviewedAt: updatedRequest.reviewedAt?.toISOString(),
        reviewedBy: updatedRequest.reviewedBy?.toString(),
      },
    });
  } catch (error: any) {
    console.error('Update request error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to update request',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    const db = getDatabase();
    const requestId = parseInt(params.requestId);

    await db
      .delete(accessRequests)
      .where(eq(accessRequests.id, requestId));

    return NextResponse.json({ message: 'Request deleted successfully' });
  } catch (error: any) {
    console.error('Delete request error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to delete request',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

