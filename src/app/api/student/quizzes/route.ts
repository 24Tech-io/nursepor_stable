import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { 
  quizzes, 
  chapters, 
  modules, 
  courses,
  enrollments,
  quizAttempts
} from '@/lib/db/schema';
import { eq, and, or, desc, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET - List all quizzes available to the student
 * Returns quizzes from enrolled courses, categorized by status
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('student_token')?.value || request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'student') {
      return NextResponse.json({ message: 'Student access required' }, { status: 403 });
    }

    const studentId = decoded.id;
    const db = await getDatabaseWithRetry();

    // Get enrolled course IDs
    const enrolledCourses = await db
      .select({ courseId: enrollments.courseId })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, studentId),
          eq(enrollments.status, 'active')
        )
      );

    const enrolledCourseIds = enrolledCourses.map(e => e.courseId);

    let allQuizzes: any[] = [];
    
    if (enrolledCourseIds.length > 0) {
      // Get all published quizzes from enrolled courses
      try {
        allQuizzes = await db
          .select({
            id: quizzes.id,
            title: quizzes.title,
            passMark: quizzes.passMark,
            timeLimit: quizzes.timeLimit,
            maxAttempts: quizzes.maxAttempts,
            chapterId: quizzes.chapterId,
            chapterTitle: chapters.title,
            moduleTitle: modules.title,
            courseId: courses.id,
            courseTitle: courses.title,
            createdAt: quizzes.createdAt,
          })
          .from(quizzes)
          .innerJoin(chapters, eq(quizzes.chapterId, chapters.id))
          .innerJoin(modules, eq(chapters.moduleId, modules.id))
          .innerJoin(courses, eq(modules.courseId, courses.id))
          .where(
            and(
              eq(quizzes.isPublished, true),
              inArray(courses.id, enrolledCourseIds)
            )
          )
          .orderBy(desc(quizzes.createdAt));
      } catch (queryError: any) {
        logger.warn('Could not fetch quizzes:', queryError.message);
        allQuizzes = [];
      }
    }

    // Get all quiz attempts for this student
    const allAttempts = await db
      .select({
        id: quizAttempts.id,
        chapterId: quizAttempts.chapterId,
        score: quizAttempts.score,
        totalQuestions: quizAttempts.totalQuestions,
        passed: quizAttempts.passed,
        attemptedAt: quizAttempts.attemptedAt,
      })
      .from(quizAttempts)
      .where(eq(quizAttempts.userId, studentId))
      .orderBy(desc(quizAttempts.attemptedAt));

    // Categorize quizzes
    const pending: any[] = [];
    const completed: any[] = [];
    const available: any[] = [];

    for (const quiz of allQuizzes) {
      // Find attempts for this quiz's chapter
      const chapterAttempts = allAttempts.filter(a => a.chapterId === quiz.chapterId);
      const latestAttempt = chapterAttempts.length > 0 ? chapterAttempts[0] : null;
      
      const quizData = {
        id: quiz.id,
        title: quiz.title,
        passMark: quiz.passMark,
        timeLimit: quiz.timeLimit,
        maxAttempts: quiz.maxAttempts,
        chapterId: quiz.chapterId,
        chapterTitle: quiz.chapterTitle,
        moduleTitle: quiz.moduleTitle,
        courseId: quiz.courseId,
        courseTitle: quiz.courseTitle,
        attemptCount: chapterAttempts.length,
        latestAttempt: latestAttempt ? {
          score: latestAttempt.score,
          totalQuestions: latestAttempt.totalQuestions,
          percentage: latestAttempt.totalQuestions > 0 
            ? Math.round((latestAttempt.score / latestAttempt.totalQuestions) * 100)
            : 0,
          passed: latestAttempt.passed,
          attemptedAt: latestAttempt.attemptedAt,
        } : null,
        canRetake: latestAttempt 
          ? (quiz.maxAttempts === 0 || chapterAttempts.length < quiz.maxAttempts)
          : true,
      };

      if (latestAttempt) {
        // Check if passed
        if (latestAttempt.passed) {
          completed.push(quizData);
        } else {
          // Failed but can retake
          if (quizData.canRetake) {
            pending.push(quizData);
          } else {
            completed.push(quizData);
          }
        }
      } else {
        // Not attempted yet
        available.push(quizData);
      }
    }

    logger.info(`✅ Fetched ${allQuizzes.length} quizzes for student ${studentId}: ${available.length} available, ${pending.length} pending, ${completed.length} completed`);

    return NextResponse.json({
      pending,
      completed,
      available,
      total: allQuizzes.length,
    });
  } catch (error: any) {
    logger.error('Get student quizzes error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch quizzes', error: error.message },
      { status: 500 }
    );
  }
}
