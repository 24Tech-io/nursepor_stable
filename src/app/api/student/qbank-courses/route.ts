import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import {
  studentProgress,
  enrollments,
  courses,
  courseQuestionAssignments,
  questionBanks,
  qbankTests,
} from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

// GET - Fetch all courses student is enrolled in that have Q-Bank access
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult.user;

    // Get all enrolled courses from studentProgress
    const enrolledCourses = await db
      .select({
        courseId: studentProgress.courseId,
        progress: studentProgress.totalProgress,
        lastAccessed: studentProgress.lastAccessed,
        course: {
          id: courses.id,
          title: courses.title,
          description: courses.description,
          thumbnail: courses.thumbnail,
          instructor: courses.instructor,
        },
      })
      .from(studentProgress)
      .innerJoin(courses, eq(studentProgress.courseId, courses.id))
      .where(eq(studentProgress.studentId, user.id));

    // For each course, check if it has Q-Bank questions and get stats
    const coursesWithQBank = await Promise.all(
      enrolledCourses.map(async (enrollment) => {
        const courseId = enrollment.courseId;

        // Count assigned questions
        const questionCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(courseQuestionAssignments)
          .where(eq(courseQuestionAssignments.courseId, courseId));

        const totalQuestions = Number(questionCount[0]?.count) || 0;

        // Get questionBank if exists
        const qbank = await db
          .select()
          .from(questionBanks)
          .where(and(eq(questionBanks.courseId, courseId), eq(questionBanks.isActive, true)))
          .limit(1);

        // Get student's test stats for this course
        let testStats = {
          totalTests: 0,
          completedTests: 0,
          avgScore: 0,
          lastTestDate: null,
        };

        if (qbank.length > 0) {
          const tests = await db
            .select()
            .from(qbankTests)
            .where(
              and(eq(qbankTests.questionBankId, qbank[0].id), eq(qbankTests.userId, user.id))
            );

          const completedTests = tests.filter((t) => t.status === 'completed');
          const avgScore =
            completedTests.length > 0
              ? Math.round(
                  completedTests.reduce((sum, t) => sum + (t.percentage || 0), 0) /
                    completedTests.length
                )
              : 0;

          testStats = {
            totalTests: tests.length,
            completedTests: completedTests.length,
            avgScore,
            lastTestDate: tests.length > 0 ? tests[0].createdAt : null,
          };
        }

        return {
          courseId,
          course: enrollment.course,
          totalQuestions,
          hasQBank: totalQuestions > 0,
          questionBankId: qbank.length > 0 ? qbank[0].id : null,
          progress: enrollment.progress || 0,
          lastAccessed: enrollment.lastAccessed,
          ...testStats,
        };
      })
    );

    // Filter to only courses with Q-Bank
    const coursesWithQBankAccess = coursesWithQBank.filter((c) => c.hasQBank);

    return NextResponse.json({
      courses: coursesWithQBankAccess,
      totalCourses: coursesWithQBankAccess.length,
      totalQuestions: coursesWithQBankAccess.reduce((sum, c) => sum + c.totalQuestions, 0),
    });
  } catch (error: any) {
    console.error('Get student Q-Bank courses error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch Q-Bank courses', error: error.message },
      { status: 500 }
    );
  }
}



