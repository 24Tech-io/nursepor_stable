import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { studentProgress, courses, users } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

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
    const db = getDatabase();

    const userId = decoded.id;

    // Get enrolled courses count
    const enrolledCoursesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(studentProgress)
      .innerJoin(courses, eq(studentProgress.courseId, courses.id))
      .where(
        and(
          eq(studentProgress.studentId, userId),
          eq(courses.status, 'published')
        )
      );

    const coursesEnrolled = Number(enrolledCoursesResult[0]?.count || 0);

    // Get completed courses (progress >= 100)
    const completedCoursesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(studentProgress)
      .innerJoin(courses, eq(studentProgress.courseId, courses.id))
      .where(
        and(
          eq(studentProgress.studentId, userId),
          eq(courses.status, 'published'),
          sql`${studentProgress.totalProgress} >= 100`
        )
      );

    const coursesCompleted = Number(completedCoursesResult[0]?.count || 0);

    // Calculate total hours learned (sum of video durations watched)
    // For now, we'll estimate based on progress and course duration
    // In a real system, you'd track actual video watch time
    const hoursLearnedResult = await db
      .select({
        totalProgress: sql<number>`sum(${studentProgress.totalProgress})`,
      })
      .from(studentProgress)
      .where(eq(studentProgress.studentId, userId));

    // Estimate: assume average course is 10 hours, multiply by progress percentage
    const totalProgress = Number(hoursLearnedResult[0]?.totalProgress || 0);
    // Average 10 hours per course, calculate based on progress
    const estimatedHours = coursesEnrolled > 0 
      ? Math.round((totalProgress / coursesEnrolled / 100) * 10 * 10) / 10 
      : 0;

    // Get quizzes completed count
    // For now, we'll estimate based on progress (assume 1 quiz per 20% progress)
    // In a real system, you'd have a quizAttempts table
    const quizzesCompleted = coursesEnrolled > 0 
      ? Math.floor(totalProgress / coursesEnrolled / 20) 
      : 0;

    // Calculate login streak
    // Get user's last login dates and calculate consecutive days
    const user = await db
      .select({ lastLogin: users.lastLogin })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    let currentStreak = 0;
    if (user[0]?.lastLogin) {
      const lastLogin = new Date(user[0].lastLogin);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastLoginDate = new Date(lastLogin);
      lastLoginDate.setHours(0, 0, 0, 0);
      
      const diffTime = today.getTime() - lastLoginDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // If logged in today or yesterday, streak is at least 1
      if (diffDays <= 1) {
        currentStreak = 1; // Simplified - in real system, track daily logins
      }
    }

    // Calculate total points
    // Points = (courses completed * 100) + (quizzes completed * 10) + (streak * 5)
    const totalPoints = (coursesCompleted * 100) + (quizzesCompleted * 10) + (currentStreak * 5);

    return NextResponse.json({
      stats: {
        coursesEnrolled,
        coursesCompleted,
        hoursLearned: estimatedHours,
        quizzesCompleted,
        currentStreak,
        totalPoints,
      },
    });
  } catch (error: any) {
    console.error('Get student stats error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to get student stats',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

