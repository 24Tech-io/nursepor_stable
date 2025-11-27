import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { users, studentProgress, courses, accessRequests, enrollments } from '@/lib/db/schema';
import { eq, sql, and, or } from 'drizzle-orm';

// GET - Fetch all students with their stats
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    let db;
    try {
      db = getDatabase();
    } catch (dbError: any) {
      console.error('❌ Database initialization error:', dbError);
      return NextResponse.json(
        { 
          message: 'Database connection failed',
          error: dbError.message || 'Database is not available',
          hint: 'Please check your DATABASE_URL in .env.local',
          students: []
        },
        { status: 500 }
      );
    }

    // Fetch all students first
    const allStudents = await db
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
      })
      .from(users)
      .where(eq(users.role, 'student'));

    // For each student, get detailed enrollment status
    const studentsWithStats = await Promise.all(
      allStudents.map(async (student: any) => {
        // Get all enrolled course IDs from BOTH tables - filter by status (case-insensitive)
        const [enrolledProgress, enrolledRecords] = await Promise.all([
          db
            .select({
              courseId: studentProgress.courseId,
            })
            .from(studentProgress)
            .innerJoin(courses, eq(studentProgress.courseId, courses.id))
            .where(
              and(
                eq(studentProgress.studentId, student.id),
                or(
                  eq(courses.status, 'published'),
                  eq(courses.status, 'active'),
                  eq(courses.status, 'Published'), // Case-insensitive
                  eq(courses.status, 'Active')     // Case-insensitive
                )
              )
            ),
          db
            .select({
              courseId: enrollments.courseId,
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
            ),
        ]);

        // Get all pending request course IDs
        const pendingRequests = await db
          .select({
            courseId: accessRequests.courseId,
          })
          .from(accessRequests)
          .where(
            and(
              eq(accessRequests.studentId, student.id),
              eq(accessRequests.status, 'pending')
            )
          );

        // Merge course IDs from both tables
        const allEnrolledCourseIds = new Set([
          ...enrolledProgress.map((p: any) => p.courseId),
          ...enrolledRecords.map((e: any) => e.courseId),
        ]);
        const pendingRequestCourseIds = new Set(pendingRequests.map((r: any) => r.courseId));

        // IMPORTANT: Only count as enrolled if there's an enrollment entry AND no pending request
        // A course with a pending request should NOT be counted as enrolled
        const actualEnrolledCourses = Array.from(allEnrolledCourseIds).filter(
          (courseId) => !pendingRequestCourseIds.has(courseId)
        );

        const enrolled = actualEnrolledCourses.length;
        const requested = pendingRequests.length;

        console.log(`📊 Student ${student.name} (ID: ${student.id}):`, {
          enrolled: enrolled,
          requested: requested,
          enrolledCourseIds: Array.from(allEnrolledCourseIds),
          pendingRequestCourseIds: Array.from(pendingRequestCourseIds),
        });

        return {
          ...student,
          enrolledCourses: enrolled,
          pendingRequests: requested,
          enrollmentStatus: {
            enrolled,
            requested,
            total: enrolled + requested,
          },
        };
      })
    );

    const result = studentsWithStats.map((student: any) => ({
      ...student,
      enrolledCourses: Number(student.enrolledCourses || 0),
    }));

    console.log('📊 Students with enrollment counts:', result.map((s: any) => ({
      name: s.name,
      email: s.email,
      enrolledCourses: s.enrolledCourses
    })));

    return NextResponse.json({ 
      students: result
    });
  } catch (error: any) {
    console.error('❌ Get students error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    // Check if it's a database connection error
    if (error.message?.includes('Database is not available') || 
        error.message?.includes('DATABASE_URL')) {
      return NextResponse.json(
        { 
          message: 'Database connection failed', 
          error: 'Database is not available. Please check your DATABASE_URL in .env.local',
          students: [] // Return empty array instead of failing
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        message: 'Failed to fetch students', 
        error: error.message,
        students: [] // Return empty array instead of failing
      },
      { status: 500 }
    );
  }
}

