import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { courses, studentProgress, payments } from '@/lib/db/schema';
import { desc, eq, and, or } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      console.log('❌ No token found in cookies');
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.id) {
      console.log('❌ Token verification failed:', { 
        hasDecoded: !!decoded, 
        hasId: decoded?.id,
        tokenLength: token.length 
      });
      return NextResponse.json(
        { message: 'Invalid or expired token. Please log in again.' },
        { status: 401 }
      );
    }

    console.log('✅ Token verified for user:', decoded.id, decoded.email);

    const db = getDatabase();

    // First, ensure Nurse Pro course exists (auto-fix inline)
    try {
      const existingCourses = await db
        .select()
        .from(courses)
        .where(
          or(
            eq(courses.title, 'Nurse Pro'),
            eq(courses.title, 'Q-Bank')
          )
        );

      if (existingCourses.length === 0) {
        // Create the course
        await db.insert(courses).values({
          title: 'Nurse Pro',
          description: 'Comprehensive nursing education platform with Q-Bank, live reviews, notes, and cheat sheets. Master nursing concepts and prepare for your exams.',
          instructor: 'Nurse Pro Academy',
          thumbnail: null,
          pricing: 0,
          status: 'published',
          isRequestable: true,
          isDefaultUnlocked: false,
        });
        console.log('✅ Auto-created Nurse Pro course');
      } else {
        // Update existing course to ensure it's correct
        const course = existingCourses[0];
        await db
          .update(courses)
          .set({
            title: 'Nurse Pro',
            pricing: 0,
            status: 'published',
          })
          .where(eq(courses.id, course.id));
        console.log('✅ Auto-fixed Nurse Pro course');
      }
    } catch (e) {
      // Silently continue - course might already exist
      console.log('Note: Could not auto-fix course (this is normal)');
    }

    // Get all published courses
    const allCourses = await db
      .select()
      .from(courses)
      .where(eq(courses.status, 'published'))
      .orderBy(desc(courses.createdAt));

    // Get enrolled course IDs (from student progress or payments)
    const enrolledProgress = await db
      .select({ courseId: studentProgress.courseId })
      .from(studentProgress)
      .where(eq(studentProgress.studentId, decoded.id));

    const purchasedCourses = await db
      .select({ courseId: payments.courseId })
      .from(payments)
      .where(
        and(
          eq(payments.userId, decoded.id),
          eq(payments.status, 'completed')
        )
      );

    const enrolledCourseIds = new Set([
      ...enrolledProgress.map((p: typeof enrolledProgress[0]) => p.courseId.toString()),
      ...purchasedCourses.map((p: typeof purchasedCourses[0]) => p.courseId.toString()),
    ]);

    // Auto-grant access to default unlocked courses
    const defaultUnlockedCourses = allCourses.filter((c: any) => c.isDefaultUnlocked);
    for (const course of defaultUnlockedCourses) {
      if (!enrolledCourseIds.has(course.id.toString())) {
        try {
          // Check if progress entry already exists
          const existingProgress = await db
            .select()
            .from(studentProgress)
            .where(
              and(
                eq(studentProgress.studentId, decoded.id),
                eq(studentProgress.courseId, course.id)
              )
            );

          if (existingProgress.length === 0) {
            // Create progress entry (grants access)
            await db.insert(studentProgress).values({
              studentId: decoded.id,
              courseId: course.id,
              totalProgress: 0,
            });
            enrolledCourseIds.add(course.id.toString());
            console.log(`✅ Auto-granted access to default unlocked course: ${course.title}`);
          }
        } catch (error) {
          console.error(`Error auto-granting access to course ${course.id}:`, error);
        }
      }
    }

    const coursesList = allCourses.map((course: any) => ({
      id: course.id.toString(),
      title: course.title,
      description: course.description,
      instructor: course.instructor,
      thumbnail: course.thumbnail,
      pricing: course.pricing || 0,
      status: course.status,
      isRequestable: course.isRequestable,
      isDefaultUnlocked: course.isDefaultUnlocked,
      isEnrolled: enrolledCourseIds.has(course.id.toString()),
      createdAt: course.createdAt?.toISOString(),
      updatedAt: course.updatedAt?.toISOString(),
    }));

    console.log('📚 API: Returning courses:', coursesList.length);
    console.log('📚 API: Course titles:', coursesList.map((c: any) => c.title));

    return NextResponse.json({
      courses: coursesList,
    });
  } catch (error: any) {
    console.error('Get student courses error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to get courses',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
