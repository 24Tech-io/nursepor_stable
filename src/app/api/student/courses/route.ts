import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { courses, studentProgress, payments, accessRequests, enrollments } from '@/lib/db/schema';
import { desc, eq, and, or } from 'drizzle-orm';

// Helper function to retry database operations for reliability
async function retryOperation<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      if (i === retries - 1) throw error;
      console.warn(`Retry ${i + 1}/${retries} after error:`, error.message);
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Operation failed after retries');
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('studentToken')?.value;

    if (!token) {
      console.log('❌ No token found in cookies');
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.id) {
      console.log('❌ Token verification failed');
      return NextResponse.json(
        { message: 'Invalid or expired token. Please log in again.' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', decoded.id, decoded.email);

    let db;
    try {
      db = getDatabase();
    } catch (dbError: any) {
      console.error('❌ Database initialization error:', dbError);
      return NextResponse.json(
        {
          message: 'Database connection failed',
          error: dbError.message || 'Database is not available',
          courses: [],
        },
        { status: 500 }
      );
    }

    // Fetch courses with retry logic for reliability
    const allCourses = await retryOperation(async () => {
      return await db
        .select()
        .from(courses)
        .where(
          or(
            eq(courses.status, 'published'),
            eq(courses.status, 'active'),
            eq(courses.status, 'Active')
          )
        )
        .orderBy(desc(courses.createdAt));
    });

    console.log(`📚 Found ${allCourses.length} published courses`);

    if (allCourses.length === 0) {
      console.warn('⚠️ No published courses found');
      return NextResponse.json({ courses: [] });
    }

    // Get enrollment status in parallel for better performance
    const [enrolledProgress, purchasedCourses, enrolledRecords, pendingRequests] =
      await Promise.all([
        retryOperation(
          async () =>
            await db
              .select({ courseId: studentProgress.courseId })
              .from(studentProgress)
              .where(eq(studentProgress.studentId, decoded.id))
        ),
        retryOperation(
          async () =>
            await db
              .select({ courseId: payments.courseId })
              .from(payments)
              .where(and(eq(payments.userId, decoded.id), eq(payments.status, 'completed')))
        ),
        retryOperation(
          async () =>
            await db
              .select({ courseId: enrollments.courseId })
              .from(enrollments)
              .where(and(eq(enrollments.userId, decoded.id), eq(enrollments.status, 'active')))
        ),
        retryOperation(
          async () =>
            await db
              .select({
                courseId: accessRequests.courseId,
                status: accessRequests.status,
              })
              .from(accessRequests)
              .where(eq(accessRequests.studentId, decoded.id))
        ),
      ]);

    const enrolledCourseIds = new Set([
      ...enrolledProgress.map((p: any) => p.courseId.toString()),
      ...purchasedCourses.map((p: any) => p.courseId.toString()),
      ...enrolledRecords.map((p: any) => p.courseId.toString()),
    ]);

    // Separate pending and approved requests
    const pendingRequestCourseIds = new Set(
      pendingRequests
        .filter((r: any) => r.status === 'pending')
        .map((r: any) => r.courseId.toString())
    );

    const approvedRequestCourseIds = new Set(
      pendingRequests
        .filter((r: any) => r.status === 'approved')
        .map((r: any) => r.courseId.toString())
    );

    // Auto-grant access to default unlocked courses
    for (const course of allCourses.filter((c: any) => c.isDefaultUnlocked)) {
      if (!enrolledCourseIds.has(course.id.toString())) {
        try {
          // We already checked enrolledCourseIds which includes studentProgress
          // So we can safely insert without checking DB again

          // Use Promise.all to insert both records in parallel
          await Promise.all([
            db.insert(studentProgress).values({
              studentId: decoded.id,
              courseId: course.id,
              totalProgress: 0,
            }),
            db.insert(enrollments).values({
              userId: decoded.id,
              courseId: course.id,
              status: 'active',
              progress: 0,
            }),
          ]);

          enrolledCourseIds.add(course.id.toString());
          console.log(`✅ Auto-granted access to default unlocked: ${course.title}`);
        } catch (error) {
          console.error(`Error auto-granting access to course ${course.id}:`, error);
        }
      }
    }

    // Map courses with proper flags and enrollment status
    const coursesList = allCourses.map((course: any) => {
      const courseIdStr = course.id.toString();
      const hasEnrollment = enrolledCourseIds.has(courseIdStr);
      const hasPendingRequest = pendingRequestCourseIds.has(courseIdStr);

      // Enrollment logic:
      // - If enrolled in either table → isEnrolled = true (regardless of pending request)
      // - Pending requests for enrolled courses are stale and should be ignored
      // - Approved requests should also be treated as enrolled (enrollment sync may be in progress)
      const hasApprovedRequest = approvedRequestCourseIds.has(courseIdStr);
      const isEnrolled = hasEnrollment || hasApprovedRequest;

      // If enrolled, pending request is stale - treat as enrolled
      // If not enrolled but has pending request, show as requested
      const finalIsEnrolled = isEnrolled;

      // Normalize status to lowercase for consistent frontend handling
      const normalizedStatus =
        course.status?.toLowerCase() === 'active'
          ? 'active'
          : course.status?.toLowerCase() === 'published'
            ? 'published'
            : course.status;

      return {
        id: courseIdStr,
        title: course.title,
        description: course.description,
        instructor: course.instructor,
        thumbnail: course.thumbnail,
        pricing: course.pricing || 0,
        status: normalizedStatus,
        isRequestable: course.isRequestable ?? true, // Allow Requests checkbox
        isDefaultUnlocked: course.isDefaultUnlocked ?? false, // Default Unlocked checkbox
        isPublic: course.isPublic ?? false, // Public Course checkbox - direct enrollment
        isEnrolled: finalIsEnrolled,
        hasPendingRequest: hasPendingRequest,
        hasApprovedRequest: hasApprovedRequest, // New field to track approved requests
        createdAt: course.createdAt?.toISOString(),
        updatedAt: course.updatedAt?.toISOString(),
      };
    });

    console.log(`✅ Returning ${coursesList.length} courses to student ${decoded.id}`);
    coursesList.forEach((c, idx) => {
      console.log(
        `  ${idx + 1}. "${c.title}" (ID: ${c.id}, Status: ${c.status}, Enrolled: ${c.isEnrolled})`
      );
    });

    return NextResponse.json({
      courses: coursesList,
    });
  } catch (error: any) {
    console.error('❌ Get student courses error:', error);

    // Return empty array instead of error to ensure UI doesn't break
    return NextResponse.json(
      {
        message: 'Failed to fetch courses',
        error: error.message,
        courses: [], // Always return courses array even on error
      },
      { status: 500 }
    );
  }
}
