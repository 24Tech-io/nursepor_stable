import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { studentProgress, courses, accessRequests } from '@/lib/db/schema';
import { eq, and, or, notInArray } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.id) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get database instance
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
          courses: []
        },
        { status: 500 }
      );
    }

    // IMPORTANT: First get all pending request course IDs to exclude them
    // Also get approved requests - these should be treated as enrolled
    const [pendingRequests, approvedRequests] = await Promise.all([
      db
        .select({
          courseId: accessRequests.courseId,
        })
        .from(accessRequests)
        .where(
          and(
            eq(accessRequests.studentId, decoded.id),
            eq(accessRequests.status, 'pending')
          )
        ),
      db
        .select({
          courseId: accessRequests.courseId,
        })
        .from(accessRequests)
        .where(
          and(
            eq(accessRequests.studentId, decoded.id),
            eq(accessRequests.status, 'approved')
          )
        )
    ]);

    const pendingRequestCourseIds = pendingRequests.map((r: any) => r.courseId);
    const approvedRequestCourseIds = approvedRequests.map((r: any) => r.courseId);
    
    console.log(`🔍 Student ${decoded.id}: Found ${pendingRequestCourseIds.length} pending requests and ${approvedRequestCourseIds.length} approved requests`);
    
    // For approved requests, ensure enrollment exists (sync)
    if (approvedRequestCourseIds.length > 0) {
      const { syncEnrollmentAfterApproval } = await import('@/lib/enrollment-sync');
      for (const courseId of approvedRequestCourseIds) {
        try {
          // Check if already enrolled
          const existing = await db
            .select({ id: studentProgress.id })
            .from(studentProgress)
            .where(
              and(
                eq(studentProgress.studentId, decoded.id),
                eq(studentProgress.courseId, courseId)
              )
            )
            .limit(1);
          
          if (existing.length === 0) {
            // Not enrolled yet - sync it
            console.log(`🔄 Syncing enrollment for approved request: student ${decoded.id}, course ${courseId}`);
            await syncEnrollmentAfterApproval(decoded.id, courseId);
          }
        } catch (syncError: any) {
          console.error(`❌ Error syncing enrollment for course ${courseId}:`, syncError);
          // Continue with other courses
        }
      }
    }

    // Get enrolled courses for the student
    // IMPORTANT: Exclude courses that have pending requests
    const allProgress = await db
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
          pricing: courses.pricing,
          status: courses.status,
        },
      })
      .from(studentProgress)
      .innerJoin(courses, eq(studentProgress.courseId, courses.id))
      .where(
        and(
          eq(studentProgress.studentId, decoded.id),
          or(
            eq(courses.status, 'published'),
            eq(courses.status, 'active')
          )
        )
      );

    // Filter out courses with pending requests
    // A course with a pending request should NOT be shown as enrolled
    const enrolledProgress = allProgress.filter((p: any) => 
      !pendingRequestCourseIds.includes(p.courseId)
    );

    console.log(`✅ Student ${decoded.id}: Showing ${enrolledProgress.length} enrolled courses (excluded ${allProgress.length - enrolledProgress.length} with pending requests)`);

    return NextResponse.json({
      enrolledCourses: enrolledProgress.map((p: any) => ({
        courseId: p.courseId.toString(),
        progress: p.totalProgress,
        lastAccessed: p.lastAccessed ? new Date(p.lastAccessed).toISOString() : null,
        course: p.course,
      })),
    });
  } catch (error: any) {
    console.error('❌ Get enrolled courses error:', error);
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
          enrolledCourses: []
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        message: 'Failed to get enrolled courses',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        enrolledCourses: []
      },
      { status: 500 }
    );
  }
}

