import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { studentProgress, courses, accessRequests, enrollments } from '@/lib/db/schema';
import { eq, and, or, sql } from 'drizzle-orm';

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
          progress: []
        },
        { status: 500 }
      );
    }

    // Get pending request course IDs to exclude
    const pendingRequests = await db
      .select({
        courseId: accessRequests.courseId,
      })
      .from(accessRequests)
      .where(
        and(
          eq(accessRequests.studentId, decoded.id),
          eq(accessRequests.status, 'pending')
        )
      );

    const pendingRequestCourseIds = pendingRequests.map((r: any) => r.courseId);

    // Get all enrolled courses from both studentProgress and enrollments tables
    let progressRecords: any[] = [];
    let enrollmentRecords: any[] = [];
    
    try {
      // Get from studentProgress table
      progressRecords = await db
        .select({
          courseId: studentProgress.courseId,
          totalProgress: studentProgress.totalProgress,
          completedChapters: studentProgress.completedChapters,
          watchedVideos: studentProgress.watchedVideos,
          quizAttempts: studentProgress.quizAttempts,
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
            eq(studentProgress.studentId, decoded.id),
            or(
              eq(courses.status, 'published'),
              eq(courses.status, 'active')
            )
          )
        );
    } catch (error: any) {
      console.error('Error fetching progress records:', error);
    }
    
    try {
      // Get from enrollments table
      enrollmentRecords = await db
        .select({
          courseId: enrollments.courseId,
          progress: enrollments.progress,
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
            eq(enrollments.userId, decoded.id),
            or(
              eq(courses.status, 'published'),
              eq(courses.status, 'active')
            )
          )
        );
    } catch (error: any) {
      // If enrollments table doesn't exist or query fails, continue with just progress records
      console.log('Enrollments table query failed (may not exist):', error.message);
      enrollmentRecords = [];
    }

    // Create a map of all enrolled courses
    const enrolledCoursesMap = new Map();
    
    // Add courses from studentProgress
    progressRecords.forEach((p: any) => {
      enrolledCoursesMap.set(p.courseId, {
        courseId: p.courseId,
        totalProgress: p.totalProgress,
        completedChapters: p.completedChapters,
        watchedVideos: p.watchedVideos,
        quizAttempts: p.quizAttempts,
        lastAccessed: p.lastAccessed,
        course: p.course,
      });
    });
    
    // Add courses from enrollments that don't have progress records
    // Also create progress records for them in the database
    for (const e of enrollmentRecords) {
      if (!enrolledCoursesMap.has(e.courseId)) {
        // Create a progress record in the database if it doesn't exist
        try {
          const existingProgress = await db
            .select({ id: studentProgress.id })
            .from(studentProgress)
            .where(
              and(
                eq(studentProgress.studentId, decoded.id),
                eq(studentProgress.courseId, e.courseId)
              )
            )
            .limit(1);
          
          if (existingProgress.length === 0) {
            // Create progress record
            await db.insert(studentProgress).values({
              studentId: decoded.id,
              courseId: e.courseId,
              completedChapters: '[]',
              watchedVideos: '[]',
              quizAttempts: '[]',
              totalProgress: e.progress || 0,
            });
            console.log(`✅ Created progress record for course ${e.courseId} for student ${decoded.id}`);
          }
        } catch (error: any) {
          console.error(`Error creating progress record for course ${e.courseId}:`, error);
        }
        
        // Add to map for response
        enrolledCoursesMap.set(e.courseId, {
          courseId: e.courseId,
          totalProgress: e.progress || 0,
          completedChapters: '[]',
          watchedVideos: '[]',
          quizAttempts: '[]',
          lastAccessed: new Date(),
          course: e.course,
        });
      }
    }

    // Convert map to array and filter out courses with pending requests
    const filteredProgress = Array.from(enrolledCoursesMap.values()).filter((p: any) => 
      !pendingRequestCourseIds.includes(p.courseId)
    );

    // Parse the JSON fields and calculate stats
    const progressList = filteredProgress.map((p: any) => {
      let completedChapters = [];
      let watchedVideos = [];
      let quizAttempts = [];

      try {
        completedChapters = JSON.parse(p.completedChapters || '[]');
      } catch (e) {
        completedChapters = [];
      }

      try {
        watchedVideos = JSON.parse(p.watchedVideos || '[]');
      } catch (e) {
        watchedVideos = [];
      }

      try {
        quizAttempts = JSON.parse(p.quizAttempts || '[]');
      } catch (e) {
        quizAttempts = [];
      }

      // Count unique completed quizzes (from quiz attempts)
      const completedQuizzes = new Set(quizAttempts.map((qa: any) => qa.quizId || qa)).size;

      return {
        courseId: p.courseId.toString(),
        course: {
          id: p.course.id.toString(),
          title: p.course.title,
          description: p.course.description,
          instructor: p.course.instructor,
          thumbnail: p.course.thumbnail,
        },
        totalProgress: p.totalProgress || 0,
        completedModules: completedChapters.length, // Using chapters as modules for now
        completedQuizzes: completedQuizzes,
        watchedVideos: watchedVideos.length,
        lastAccessed: p.lastAccessed ? new Date(p.lastAccessed).toISOString() : new Date().toISOString(),
      };
    });

    return NextResponse.json({
      progress: progressList,
    });
  } catch (error: any) {
    console.error('❌ Get progress details error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to get progress',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        progress: []
      },
      { status: 500 }
    );
  }
}


