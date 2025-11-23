import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { users, studentProgress, courses } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { logActivity } from '@/lib/activity-log';

// POST - Enroll student in a course
export async function POST(
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

    const body = await request.json();
    const { courseId } = body;

    if (!courseId) {
      return NextResponse.json({ message: 'Course ID is required' }, { status: 400 });
    }

    const db = getDatabase();
    const studentId = parseInt(params.id);

    // Verify student exists and is a student
    const [student] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, studentId), eq(users.role, 'student')))
      .limit(1);

    if (!student) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }

    // Verify course exists
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!course) {
      return NextResponse.json({ message: 'Course not found' }, { status: 404 });
    }

    // Check if already enrolled
    const [existing] = await db
      .select()
      .from(studentProgress)
      .where(and(
        eq(studentProgress.studentId, studentId),
        eq(studentProgress.courseId, courseId)
      ))
      .limit(1);

    if (existing) {
      return NextResponse.json({ message: 'Student is already enrolled in this course' }, { status: 400 });
    }

    // Enroll student
    await db.insert(studentProgress).values({
      studentId,
      courseId,
      totalProgress: 0,
      lastAccessed: new Date(),
    });

    // Log activity
    await logActivity({
      adminId: decoded.id,
      adminName: decoded.name,
      action: 'created',
      entityType: 'student',
      entityId: studentId,
      entityName: `Enrolled in ${course.title}`,
      details: {
        studentName: student.name,
        courseId: courseId,
        courseTitle: course.title,
      },
    });

    return NextResponse.json({
      message: 'Student enrolled successfully',
      success: true,
    });
  } catch (error: any) {
    console.error('Enroll student error:', error);
    return NextResponse.json(
      { message: 'Failed to enroll student', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Unenroll student from a course
export async function DELETE(
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

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({ message: 'Course ID is required' }, { status: 400 });
    }

    const db = getDatabase();
    const studentId = parseInt(params.id);

    // Verify student exists
    const [student] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, studentId), eq(users.role, 'student')))
      .limit(1);

    if (!student) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }

    // Get course info for logging
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, parseInt(courseId)))
      .limit(1);

    // Check if enrolled
    const [enrollment] = await db
      .select()
      .from(studentProgress)
      .where(and(
        eq(studentProgress.studentId, studentId),
        eq(studentProgress.courseId, parseInt(courseId))
      ))
      .limit(1);

    if (!enrollment) {
      return NextResponse.json({ message: 'Student is not enrolled in this course' }, { status: 400 });
    }

    // Unenroll student - Delete from studentProgress
    const deleteResult = await db
      .delete(studentProgress)
      .where(and(
        eq(studentProgress.studentId, studentId),
        eq(studentProgress.courseId, parseInt(courseId))
      ))
      .returning();

    console.log(`✅ Unenrolled student ${studentId} from course ${courseId}. Deleted ${deleteResult.length} progress entry/entries.`);

    // Verify deletion
    const verifyDeletion = await db
      .select()
      .from(studentProgress)
      .where(and(
        eq(studentProgress.studentId, studentId),
        eq(studentProgress.courseId, parseInt(courseId))
      ));

    if (verifyDeletion.length > 0) {
      console.error(`⚠️ WARNING: Progress entry still exists after deletion! Student: ${studentId}, Course: ${courseId}`);
    } else {
      console.log(`✅ Verified: Progress entry successfully deleted.`);
    }

    // Log activity
    await logActivity({
      adminId: decoded.id,
      adminName: decoded.name,
      action: 'deleted',
      entityType: 'student',
      entityId: studentId,
      entityName: `Unenrolled from ${course?.title || 'course'}`,
      details: {
        studentName: student.name,
        courseId: parseInt(courseId),
        courseTitle: course?.title,
      },
    });

    return NextResponse.json({
      message: 'Student unenrolled successfully',
      success: true,
    });
  } catch (error: any) {
    console.error('Unenroll student error:', error);
    return NextResponse.json(
      { message: 'Failed to unenroll student', error: error.message },
      { status: 500 }
    );
  }
}

