import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { accessRequests, courses, enrollments, studentProgress } from '@/lib/db/schema';
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

    const courseIdNum = parseInt(courseId);
    if (isNaN(courseIdNum)) {
      return NextResponse.json({ message: 'Invalid course ID' }, { status: 400 });
    }

    const db = getDatabase();

    // Check if already enrolled (any source)
    const [existingEnrollment, existingProgress] = await Promise.all([
      db.select().from(enrollments)
        .where(and(
          eq(enrollments.userId, decoded.id),
          eq(enrollments.courseId, courseIdNum),
          eq(enrollments.status, 'active')
        )),
      db.select().from(studentProgress)
        .where(and(
          eq(studentProgress.studentId, decoded.id),
          eq(studentProgress.courseId, courseIdNum)
        ))
    ]);

    if (existingEnrollment.length > 0 || existingProgress.length > 0) {
      return NextResponse.json(
        { message: 'You are already enrolled in this course' },
        { status: 400 }
      );
    }

    // Check if request already exists (any status)
    const existing = await db
      .select()
      .from(accessRequests)
      .where(
        and(
          eq(accessRequests.studentId, decoded.id),
          eq(accessRequests.courseId, courseIdNum)
        )
      );

    if (existing.length > 0) {
      const status = existing[0].status;
      if (status === 'pending') {
        return NextResponse.json(
          { message: 'You already have a pending request for this course' },
          { status: 400 }
        );
      } else if (status === 'approved') {
        return NextResponse.json(
          { message: 'Your request for this course has already been approved' },
          { status: 400 }
        );
      } else if (status === 'rejected') {
        // Allow re-request for rejected courses after deleting old request
        await db.delete(accessRequests).where(eq(accessRequests.id, existing[0].id));
        console.log(`🗑️ Deleted old rejected request #${existing[0].id}`);
      }
    }

    // Verify course exists
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, parseInt(courseId)))
      .limit(1);

    if (!course) {
      console.error('❌ Course not found:', courseId);
      return NextResponse.json(
        { message: 'Course not found' },
        { status: 404 }
      );
    }

    console.log('📝 Creating access request:', {
      studentId: decoded.id,
      studentEmail: decoded.email,
      courseId: parseInt(courseId),
      courseTitle: course.title,
      reason: reason || 'Requesting access to this course'
    });

    // Create new request
    const result = await db.insert(accessRequests).values({
      studentId: decoded.id,
      courseId: parseInt(courseId),
      reason: reason || 'Requesting access to this course',
      status: 'pending',
    }).returning();

    console.log('✅ Access request created successfully:', {
      id: result[0].id,
      studentId: result[0].studentId,
      courseId: result[0].courseId,
      status: result[0].status,
      requestedAt: result[0].requestedAt
    });

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

