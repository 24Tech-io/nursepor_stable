import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { users, studentProgress, courses } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';

/**
 * Debug endpoint to check a specific student's enrollments
 * Shows all progress entries, including orphaned ones
 */
export async function GET(request: NextRequest, { params }: { params: { studentId: string } }) {
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
    const studentId = parseInt(params.studentId);

    // Get student info
    const [student] = await db.select().from(users).where(eq(users.id, studentId)).limit(1);

    if (!student) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }

    // Get ALL progress entries for this student (including orphaned)
    const allProgress = await db
      .select({
        id: studentProgress.id,
        courseId: studentProgress.courseId,
        totalProgress: studentProgress.totalProgress,
      })
      .from(studentProgress)
      .where(eq(studentProgress.studentId, studentId));

    // Check each progress entry
    const enrollmentDetails = await Promise.all(
      allProgress.map(async (progress: any) => {
        const [course] = await db
          .select()
          .from(courses)
          .where(eq(courses.id, progress.courseId))
          .limit(1);

        return {
          progressId: progress.id,
          courseId: progress.courseId,
          courseExists: !!course,
          courseTitle: course?.title || 'COURSE NOT FOUND',
          courseStatus: course?.status || 'DELETED',
          totalProgress: progress.totalProgress,
          isValid: !!course && (course.status === 'published' || course.status === 'active'),
        };
      })
    );

    const validEnrollments = enrollmentDetails.filter((e) => e.isValid);
    const orphanedEnrollments = enrollmentDetails.filter((e) => !e.isValid);

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
      },
      totalProgressEntries: allProgress.length,
      validEnrollments: validEnrollments.length,
      orphanedEnrollments: orphanedEnrollments.length,
      details: enrollmentDetails,
      orphaned: orphanedEnrollments,
      message:
        orphanedEnrollments.length > 0
          ? `Found ${orphanedEnrollments.length} orphaned enrollment(s). Use /api/admin/cleanup-orphaned-enrollments to remove them.`
          : 'All enrollments are valid',
    });
  } catch (error: any) {
    console.error('Check student enrollments error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to check enrollments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

