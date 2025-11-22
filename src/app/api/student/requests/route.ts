import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { accessRequests, courses } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// GET - Fetch student's own access requests
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'student') {
      return NextResponse.json({ message: 'Student access required' }, { status: 403 });
    }

    const db = getDatabase();

    // Fetch student's requests with course details
    const requests = await db
      .select({
        id: accessRequests.id,
        courseId: accessRequests.courseId,
        courseTitle: courses.title,
        reason: accessRequests.reason,
        status: accessRequests.status,
        requestedAt: accessRequests.requestedAt,
        reviewedAt: accessRequests.reviewedAt,
      })
      .from(accessRequests)
      .innerJoin(courses, eq(accessRequests.courseId, courses.id))
      .where(eq(accessRequests.studentId, decoded.id))
      .orderBy(desc(accessRequests.requestedAt));

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error('Get student requests error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch requests', error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new access request
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

    // Check if request already exists and is pending
    const existing = await db
      .select()
      .from(accessRequests)
      .where(
        and(
          eq(accessRequests.studentId, decoded.id),
          eq(accessRequests.courseId, parseInt(courseId)),
          eq(accessRequests.status, 'pending')
        )
      );

    if (existing.length > 0) {
      return NextResponse.json(
        { message: 'You already have a pending request for this course' },
        { status: 400 }
      );
    }

    // Create new request
    const result = await db.insert(accessRequests).values({
      studentId: decoded.id,
      courseId: parseInt(courseId),
      reason: reason || 'Requesting access to this course',
      status: 'pending',
    }).returning();

    console.log('✅ Access request created:', result[0]);

    return NextResponse.json({
      message: 'Request submitted successfully',
      request: result[0],
    });
  } catch (error: any) {
    console.error('Create request error:', error);
    return NextResponse.json(
      { message: 'Failed to submit request', error: error.message },
      { status: 500 }
    );
  }
}

