import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { accessRequests, users, courses, studentProgress } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';

// GET - Fetch all access requests
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = getDatabase();

    // Fetch all requests with student and course details
    const allRequests = await db
      .select({
        id: accessRequests.id,
        studentId: accessRequests.studentId,
        studentName: users.name,
        studentEmail: users.email,
        courseId: accessRequests.courseId,
        courseTitle: courses.title,
        reason: accessRequests.reason,
        status: accessRequests.status,
        requestedAt: accessRequests.requestedAt,
        reviewedAt: accessRequests.reviewedAt,
      })
      .from(accessRequests)
      .innerJoin(users, eq(accessRequests.studentId, users.id))
      .innerJoin(courses, eq(accessRequests.courseId, courses.id))
      .orderBy(desc(accessRequests.requestedAt));

    // Filter out approved/rejected requests where student is already enrolled
    // This cleans up old requests that should have been deleted
    const enrolledCourses = await db
      .select({
        studentId: studentProgress.studentId,
        courseId: studentProgress.courseId,
      })
      .from(studentProgress);

    const enrolledSet = new Set(enrolledCourses.map((e: any) => `${e.studentId}-${e.courseId}`));

    // Filter requests: ONLY show pending requests
    // Approved/rejected requests should be deleted immediately, so we filter them out
    const filteredRequests = allRequests.filter((req: any) => {
      // Only show pending requests
      if (req.status !== 'pending') {
        console.log(
          `🔍 Filtering out ${req.status} request #${req.id} - only showing pending requests`
        );
        return false;
      }
      return true;
    });

    // Clean up ALL approved/rejected requests (they should be deleted immediately after processing)
    const requestsToDelete = allRequests.filter((req: any) => req.status !== 'pending');

    if (requestsToDelete.length > 0) {
      // Delete all non-pending requests synchronously to ensure cleanup
      try {
        const deleteIds = requestsToDelete.map((req: any) => req.id);
        for (const id of deleteIds) {
          try {
            await db.delete(accessRequests).where(eq(accessRequests.id, id));
            console.log(
              `🗑️ Cleaned up ${requestsToDelete.find((r: any) => r.id === id)?.status || 'processed'} request #${id}`
            );
          } catch (err: any) {
            console.error(`Error cleaning up request #${id}:`, err);
          }
        }
        console.log(
          `🧹 Cleaned up ${requestsToDelete.length} processed requests (approved/rejected)`
        );
      } catch (error: any) {
        console.error('Error during request cleanup:', error);
      }
    }

    return NextResponse.json({ requests: filteredRequests });
  } catch (error: any) {
    console.error('Get requests error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch requests', error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new access request (called by students)
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'student') {
      return NextResponse.json({ message: 'Student access required' }, { status: 403 });
    }

    const { courseId, reason } = await request.json();

    if (!courseId) {
      return NextResponse.json({ message: 'Course ID is required' }, { status: 400 });
    }

    const db = getDatabase();

    // Check if request already exists
    const existing = await db
      .select()
      .from(accessRequests)
      .where(
        eq(accessRequests.studentId, decoded.id) &&
          eq(accessRequests.courseId, courseId) &&
          eq(accessRequests.status, 'pending')
      );

    if (existing.length > 0) {
      return NextResponse.json(
        { message: 'You already have a pending request for this course' },
        { status: 400 }
      );
    }

    // Create new request
    await db.insert(accessRequests).values({
      studentId: decoded.id,
      courseId: parseInt(courseId),
      reason: reason || '',
      status: 'pending',
    });

    return NextResponse.json({ message: 'Request submitted successfully' });
  } catch (error: any) {
    console.error('Create request error:', error);
    return NextResponse.json(
      { message: 'Failed to submit request', error: error.message },
      { status: 500 }
    );
  }
}
