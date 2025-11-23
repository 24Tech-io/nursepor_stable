import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { users, studentProgress, courses, accessRequests } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      return NextResponse.json({ 
        message: 'User is not a student',
        error: `User with ID ${studentId} has role: ${userCheck.role}`
      }, { status: 404 });
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
        .where(
          and(
            eq(accessRequests.studentId, student.id),
            eq(accessRequests.status, 'pending')
          )
        )
        .limit(100); // Limit to prevent huge queries

      pendingRequestCourseIds = new Set(
        pendingRequests.map((r: any) => r.courseId.toString())
      );
      console.log('📋 Pending request course IDs:', Array.from(pendingRequestCourseIds));
    } catch (pendingError: any) {
      console.error('⚠️ Error fetching pending requests (continuing without filter):', pendingError);
      // Continue without pending requests filter if query fails
      pendingRequestCourseIds = new Set();
    }

    // Optimized: Fetch enrollments and count in a single query
    // IMPORTANT: Exclude courses with pending requests
    let enrollments: any[] = [];
    let enrolledCount = 0;
    try {
      const enrollmentData = await db
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
        .where(eq(studentProgress.studentId, student.id))
        .limit(100); // Limit to prevent huge queries

      // Filter out courses with pending requests
      enrollments = enrollmentData.filter((e: any) => {
        const courseIdStr = e.courseId.toString();
        const hasPendingRequest = pendingRequestCourseIds.has(courseIdStr);
        if (hasPendingRequest) {
          console.log(`⚠️ Excluding course ${courseIdStr} (${e.course.title}) - has pending request`);
        }
        return !hasPendingRequest;
      });
      
      enrolledCount = enrollments.length;
      console.log(`✅ Found ${enrolledCount} valid enrollments (excluded ${enrollmentData.length - enrolledCount} with pending requests)`);
    } catch (enrollmentError: any) {
      console.error('Error fetching enrollments:', enrollmentError);
      enrollments = [];
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
        .where(
          and(
            eq(accessRequests.studentId, student.id),
            eq(accessRequests.status, 'pending')
          )
        )
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
        enrollments: enrollments.map((e: any) => ({
          courseId: e.courseId,
          progress: e.totalProgress,
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
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

