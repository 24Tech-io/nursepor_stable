import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { 
  questionBanks, 
  qbankQuestions, 
  qbankQuestionStatistics,
  qbankTests,
  qbankQuestionAttempts,
  studentProgress,
} from '@/lib/db/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);

    if (!decoded || !decoded.id) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const db = await getDatabaseWithRetry();
    const courseIdNum = parseInt(params.courseId);
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('testType') || 'mixed'; // classic, ngn, mixed
    const subject = searchParams.get('subject');
    const lesson = searchParams.get('lesson');
    const clientNeedArea = searchParams.get('clientNeedArea');
    const subcategory = searchParams.get('subcategory');

    // Check enrollment
    const enrollment = await db
      .select()
      .from(studentProgress)
      .where(
        and(eq(studentProgress.studentId, decoded.id), eq(studentProgress.courseId, courseIdNum))
      )
      .limit(1);

    if (enrollment.length === 0) {
      return NextResponse.json({ message: 'Not enrolled in this course' }, { status: 403 });
    }

    // Get question bank
    const qbank = await db
      .select()
      .from(questionBanks)
      .where(and(eq(questionBanks.courseId, courseIdNum), eq(questionBanks.isActive, true)))
      .limit(1);

    if (qbank.length === 0) {
      return NextResponse.json({
        statistics: {
          totalQuestions: 0,
          usedQuestions: 0,
          unusedQuestions: 0,
          totalCorrect: 0,
          totalIncorrect: 0,
          totalOmitted: 0,
          totalCorrectOnReattempt: 0,
          yourScore: 0,
          maxScore: 0,
          percentage: 0,
        },
      });
    }

    const qbankId = qbank[0].id;

    // Build filter conditions
    const questionFilters: any[] = [eq(qbankQuestions.questionBankId, qbankId)];

    if (testType !== 'mixed') {
      questionFilters.push(eq(qbankQuestions.testType, testType));
    }
    if (subject) {
      questionFilters.push(eq(qbankQuestions.subject, subject));
    }
    if (lesson) {
      questionFilters.push(eq(qbankQuestions.lesson, lesson));
    }
    if (clientNeedArea) {
      questionFilters.push(eq(qbankQuestions.clientNeedArea, clientNeedArea));
    }
    if (subcategory) {
      questionFilters.push(eq(qbankQuestions.subcategory, subcategory));
    }

    // Get total questions
    const totalQuestions = await db
      .select({ count: sql<number>`count(*)` })
      .from(qbankQuestions)
      .where(and(...questionFilters));

    const totalCount = Number(totalQuestions[0]?.count || 0);

    // Get user statistics
    const userStats = await db
      .select({
        timesAttempted: sql<number>`sum(${qbankQuestionStatistics.timesAttempted})`,
        timesCorrect: sql<number>`sum(${qbankQuestionStatistics.timesCorrect})`,
        timesIncorrect: sql<number>`sum(${qbankQuestionStatistics.timesIncorrect})`,
        timesOmitted: sql<number>`sum(${qbankQuestionStatistics.timesOmitted})`,
        timesCorrectOnReattempt: sql<number>`sum(${qbankQuestionStatistics.timesCorrectOnReattempt})`,
      })
      .from(qbankQuestionStatistics)
      .innerJoin(qbankQuestions, eq(qbankQuestionStatistics.questionId, qbankQuestions.id))
      .where(
        and(
          eq(qbankQuestionStatistics.userId, decoded.id),
          eq(qbankQuestionStatistics.questionBankId, qbankId),
          ...questionFilters
        )
      );

    const stats = userStats[0] || {
      timesAttempted: 0,
      timesCorrect: 0,
      timesIncorrect: 0,
      timesOmitted: 0,
      timesCorrectOnReattempt: 0,
    };

    const usedQuestions = Number(stats.timesAttempted || 0);
    const unusedQuestions = totalCount - usedQuestions;
    const totalCorrect = Number(stats.timesCorrect || 0);
    const totalIncorrect = Number(stats.timesIncorrect || 0);
    const totalOmitted = Number(stats.timesOmitted || 0);
    const totalCorrectOnReattempt = Number(stats.timesCorrectOnReattempt || 0);

    // Calculate scores (assuming 1 point per question)
    const yourScore = totalCorrect + totalCorrectOnReattempt;
    const maxScore = totalCount;
    const percentage = maxScore > 0 ? (yourScore / maxScore) * 100 : 0;

    return NextResponse.json({
      statistics: {
        totalQuestions: totalCount,
        usedQuestions,
        unusedQuestions: Math.max(0, unusedQuestions),
        totalCorrect,
        totalIncorrect,
        totalOmitted,
        totalCorrectOnReattempt,
        yourScore,
        maxScore,
        percentage: Math.round(percentage * 100) / 100,
      },
    });
  } catch (error: any) {
    logger.error('Get statistics error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}
