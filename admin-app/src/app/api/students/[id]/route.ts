import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { users, studentProgress, courses, accessRequests, enrollments } from '@/lib/db/schema';
import { eq, and, or, sql } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('📥 GET /api/students/[id] called with params:', params);
    console.log('📥 Request URL:', request.url);

    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      console.error('❌ No token provided');
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      console.error('❌ Invalid token or not admin');
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    if (!params || !params.id) {
      console.error('❌ No ID in params:', params);
      return NextResponse.json({ message: 'Student ID is required' }, { status: 400 });
    }

    const db = getDatabase();
    const studentId = parseInt(params.id);

    if (isNaN(studentId)) {
      console.error('❌ Invalid student ID:', params.id);
      return NextResponse.json({ message: 'Invalid student ID' }, { status: 400 });
    }

    console.log('🔍 Fetching student with ID:', studentId);

    const [userCheck] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, studentId))
      .limit(1);

    if (!userCheck) {
      console.error('User not found with ID:', studentId);
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }

    if (userCheck.role !== 'student') {
      console.error('User is not a student. Role:', userCheck.role, 'ID:', studentId);
      return NextResponse.json(
        {
          message: 'User is not a student',
          error: `User with ID ${studentId} has role: ${userCheck.role}`,
        },
        { status: 404 }
      );
    }

    const [student] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        isActive: users.isActive,
        faceIdEnrolled: users.faceIdEnrolled,
        fingerprintEnrolled: users.fingerprintEnrolled,
        joinedDate: users.joinedDate,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
        role: users.role,
      })
      .from(users)
      .where(and(eq(users.id, studentId), eq(users.role, 'student')))
      .limit(1);

    if (!student) {
      console.error('Student not found after role check. ID:', studentId);
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }

    console.log('✅ Student found:', student.name, student.email);

    // Get pending requests to exclude from enrolled courses
    // Wrap in try-catch to prevent blocking if this query fails
    let pendingRequestCourseIds = new Set<string>();
    try {
      const pendingRequests = await db
        .select({ courseId: accessRequests.courseId })
        .from(accessRequests)
        .where(and(eq(accessRequests.studentId, student.id), eq(accessRequests.status, 'pending')))
        .limit(100); // Limit to prevent huge queries

      pendingRequestCourseIds = new Set(pendingRequests.map((r: any) => r.courseId.toString()));
      console.log('📋 Pending request course IDs:', Array.from(pendingRequestCourseIds));
    } catch (pendingError: any) {
      console.error(
        '⚠️ Error fetching pending requests (continuing without filter):',
        pendingError
      );
      // Continue without pending requests filter if query fails
      pendingRequestCourseIds = new Set();
    }

    // Optimized: Fetch enrollments from BOTH tables and merge
    // IMPORTANT: Prefer enrollments.progress as source of truth, fallback to studentProgress.totalProgress
    let enrollmentsList: any[] = [];
    let enrolledCount = 0;
    try {
      // Get enrollments from enrollments table (new source of truth)
      // IMPORTANT: Only show published/active courses
      const enrollmentsData = await db
        .select({
          courseId: enrollments.courseId,
          progress: enrollments.progress,
          lastAccessed: enrollments.updatedAt,
          course: {
            id: courses.id,
            title: courses.title,
            description: courses.description,
            instructor: courses.instructor,
            thumbnail: courses.thumbnail,
            status: courses.status,
          },
        })
        .from(enrollments)
        .innerJoin(courses, eq(enrollments.courseId, courses.id))
        .where(
          and(
            eq(enrollments.userId, student.id),
            eq(enrollments.status, 'active'),
            or(
              eq(courses.status, 'published'),
              eq(courses.status, 'active'),
              eq(courses.status, 'Published'),
              eq(courses.status, 'Active')
            )
          )
        )
        .limit(100);

      // Get enrollments from studentProgress table (legacy)
      // IMPORTANT: Only show published/active courses
      const studentProgressData = await db
        .select({
          courseId: studentProgress.courseId,
          totalProgress: studentProgress.totalProgress,
          lastAccessed: studentProgress.lastAccessed,
          course: {
            id: courses.id,
            title: courses.title,
            description: courses.description,
            instructor: courses.instructor,
            thumbnail: courses.thumbnail,
            status: courses.status,
          },
        })
        .from(studentProgress)
        .innerJoin(courses, eq(studentProgress.courseId, courses.id))
        .where(
          and(
            eq(studentProgress.studentId, student.id),
            or(
              eq(courses.status, 'published'),
              eq(courses.status, 'active'),
              eq(courses.status, 'Published'),
              eq(courses.status, 'Active')
            )
          )
        )
        .limit(100);

      // Merge: prefer enrollments.progress (new source of truth), fallback to studentProgress.totalProgress
      const enrollmentMap = new Map();

      // First, add all from enrollments table (new source of truth)
      enrollmentsData.forEach((e: any) => {
        const courseIdStr = e.courseId.toString();
        if (!pendingRequestCourseIds.has(courseIdStr)) {
          enrollmentMap.set(courseIdStr, {
            courseId: e.courseId,
            progress: e.progress || 0, // Use enrollments.progress
            totalProgress: e.progress || 0, // Also set totalProgress for compatibility
            lastAccessed: e.lastAccessed,
            course: e.course,
          });
        }
      });

      // Then, add any from studentProgress that aren't in enrollments (legacy data)
      studentProgressData.forEach((e: any) => {
        const courseIdStr = e.courseId.toString();
        if (!pendingRequestCourseIds.has(courseIdStr)) {
          if (!enrollmentMap.has(courseIdStr)) {
            // Not in enrollments table, use studentProgress
            enrollmentMap.set(courseIdStr, {
              courseId: e.courseId,
              progress: e.totalProgress || 0,
              totalProgress: e.totalProgress || 0,
              lastAccessed: e.lastAccessed,
              course: e.course,
            });
          } else {
            // Already in map from enrollments, but update lastAccessed if studentProgress is more recent
            const existing = enrollmentMap.get(courseIdStr);
            if (
              e.lastAccessed &&
              (!existing.lastAccessed || e.lastAccessed > existing.lastAccessed)
            ) {
              existing.lastAccessed = e.lastAccessed;
            }
          }
        }
      });

      enrollmentsList = Array.from(enrollmentMap.values());
      enrolledCount = enrollmentsList.length;
      console.log(
        `✅ Found ${enrolledCount} valid enrollments (merged from both tables, excluded ${enrollmentsData.length + studentProgressData.length - enrolledCount} with pending requests)`
      );
    } catch (enrollmentError: any) {
      console.error('Error fetching enrollments:', enrollmentError);
      enrollmentsList = [];
      enrolledCount = 0;
    }

    // Get pending requests with course details
    let pendingRequests: any[] = [];
    try {
      const requestsData = await db
        .select({
          courseId: accessRequests.courseId,
          course: {
            id: courses.id,
            title: courses.title,
            description: courses.description,
            instructor: courses.instructor,
            thumbnail: courses.thumbnail,
            status: courses.status,
          },
          requestedAt: accessRequests.requestedAt,
        })
        .from(accessRequests)
        .innerJoin(courses, eq(accessRequests.courseId, courses.id))
        .where(and(eq(accessRequests.studentId, student.id), eq(accessRequests.status, 'pending')))
        .limit(100);

      pendingRequests = requestsData.map((r: any) => ({
        courseId: r.courseId,
        course: r.course,
        requestedAt: r.requestedAt,
      }));
      console.log(`✅ Found ${pendingRequests.length} pending requests`);
    } catch (requestError: any) {
      console.error('Error fetching pending requests:', requestError);
      pendingRequests = [];
    }

    return NextResponse.json({
      student: {
        ...student,
        enrolledCourses: enrolledCount,
        enrollments: enrollmentsList.map((e: any) => ({
          courseId: e.courseId,
          progress: e.progress || 0, // Use merged progress (prefers enrollments.progress)
          totalProgress: e.totalProgress || 0, // Also include totalProgress for backwards compatibility
          lastAccessed: e.lastAccessed,
          course: e.course,
        })),
        pendingRequests: pendingRequests,
      },
    });
  } catch (error: any) {
    console.error('❌ Get student error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      {
        message: 'Failed to fetch student',
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
