import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { submitQuizSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { 
  courseQuestionAssignments, 
  qbankQuestions, 
  courses,
  questionBanks,
  qbankTests,
  qbankQuestionAttempts,
  qbankQuestionStatistics
} from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

// GET - Fetch Quiz Bank questions for a course (student view)
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    // Type narrowing: if authResult is a NextResponse, return it directly
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    if (!authResult.user) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const user = authResult.user;

    const courseId = parseInt(params.courseId);
    const url = new URL(request.url);
    const moduleId = url.searchParams.get('moduleId');

    // Get all assigned questions for this course/module
    let query = db
      .select({
        questionId: qbankQuestions.id,
        question: qbankQuestions.question,
        questionType: qbankQuestions.questionType,
        options: qbankQuestions.options,
        correctAnswer: qbankQuestions.correctAnswer,
        explanation: qbankQuestions.explanation,
        difficulty: qbankQuestions.difficulty,
        points: qbankQuestions.points,
        subject: qbankQuestions.subject,
      })
      .from(courseQuestionAssignments)
      .innerJoin(qbankQuestions, eq(courseQuestionAssignments.questionId, qbankQuestions.id))
      .where(eq(courseQuestionAssignments.courseId, courseId));

    // Filter by module if specified
    if (moduleId) {
      query = query.where(eq(courseQuestionAssignments.moduleId, parseInt(moduleId)));
    }

    const questions = await query;

    // Helper to safely parse JSON
    const safeJsonParse = (value: any, fallback: any = null) => {
      if (!value) return fallback;
      if (typeof value !== 'string') return value;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    };

    return NextResponse.json({
      questions: questions.map((q) => ({
        id: q.questionId,
        question: q.question,
        type: q.questionType,
        options: safeJsonParse(q.options, []),
        explanation: q.explanation,
        difficulty: q.difficulty,
        points: q.points,
        subject: q.subject,
      })),
      totalQuestions: questions.length,
    });
  } catch (error: any) {
    logger.error('Get student course qbank error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch questions', error: error.message },
      { status: 500 }
    );
  }
}

// POST - Submit Quiz Bank test answers
export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    // Type narrowing: if authResult is a NextResponse, return it directly
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    if (!authResult.user) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const user = authResult.user;

    const courseId = parseInt(params.courseId);

    // Validate request body
    const bodyValidation = await extractAndValidate(request, submitQuizSchema.extend({
      moduleId: z.number().int().positive().optional(),
    }));
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const { answers, moduleId } = bodyValidation.data;

    // ✅ FIX: Get or create question bank for this course
    let qbank = await db
      .select()
      .from(questionBanks)
      .where(and(eq(questionBanks.courseId, courseId), eq(questionBanks.isActive, true)))
      .limit(1);

    let qbankId: number;
    if (qbank.length === 0) {
      console.log(`📚 Creating question bank for course ${courseId}`);
      const [newQBank] = await db.insert(questionBanks).values({
        courseId,
        name: `Course ${courseId} Q-Bank`,
        isActive: true,
      }).returning();
      qbankId = newQBank.id;
    } else {
      qbankId = qbank[0].id;
    }

    // ✅ FIX: Create test session
    const testId = `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const [newTest] = await db
      .insert(qbankTests)
      .values({
        questionBankId: qbankId,
        userId: user.id,
        testId,
        title: `Course Practice Test`,
        mode: 'tutorial',
        testType: 'mixed',
        organization: 'sequential',
        questionIds: JSON.stringify(Object.keys(answers).map(Number)),
        totalQuestions: Object.keys(answers).length,
        status: 'in_progress',
        startedAt: new Date(),
      })
      .returning();

    console.log(`📝 Created test session ${newTest.id} for user ${user.id}`);

    // Get all assigned questions with correct answers
    const assignedQuestions = await db
      .select({
        questionId: qbankQuestions.id,
        correctAnswer: qbankQuestions.correctAnswer,
        points: qbankQuestions.points,
        questionBankId: qbankQuestions.questionBankId,
      })
      .from(courseQuestionAssignments)
      .innerJoin(qbankQuestions, eq(courseQuestionAssignments.questionId, qbankQuestions.id))
      .where(
        and(
          eq(courseQuestionAssignments.courseId, courseId),
          moduleId ? eq(courseQuestionAssignments.moduleId, moduleId) : undefined
        )
      );

    // Helper to safely parse JSON
    const safeJsonParse = (value: any) => {
      if (!value) return null;
      if (typeof value !== 'string') return value;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    };

    // Grade answers and track attempts
    let correctCount = 0;
    let totalPoints = 0;
    let earnedPoints = 0;
    const results: any[] = [];
    const attemptInserts: any[] = [];
    const statsToCreate: any[] = [];

    // ✅ FIX: Batch check existing stats first
    const questionIds = assignedQuestions.map(q => q.questionId);
    const existingStats = await db
      .select()
      .from(qbankQuestionStatistics)
      .where(
        and(
          eq(qbankQuestionStatistics.userId, user.id),
          eq(qbankQuestionStatistics.questionBankId, qbankId)
        )
      );

    const existingStatsMap = new Map();
    existingStats.forEach(stat => {
      existingStatsMap.set(stat.questionId, stat);
    });

    for (const q of assignedQuestions) {
      const studentAnswer = answers[q.questionId];
      const correctAnswer = safeJsonParse(q.correctAnswer);

      totalPoints += q.points;

      let isCorrect = false;
      if (Array.isArray(correctAnswer) && Array.isArray(studentAnswer)) {
        // SATA - check if arrays match
        isCorrect = correctAnswer.length === studentAnswer.length &&
          correctAnswer.every((a: any) => studentAnswer.includes(a));
      } else {
        // MCQ - direct comparison
        isCorrect = studentAnswer === correctAnswer;
      }

      if (isCorrect) {
        correctCount++;
        earnedPoints += q.points;
      }

      results.push({
        questionId: q.questionId,
        isCorrect,
        studentAnswer,
        correctAnswer,
      });

      // ✅ FIX: Create question attempt record
      attemptInserts.push({
        testId: newTest.id,
        questionId: q.questionId,
        userId: user.id,
        userAnswer: typeof studentAnswer === 'object' ? JSON.stringify(studentAnswer) : String(studentAnswer),
        isCorrect,
        markedForReview: false,
        timeSpent: null,
      });

      // ✅ FIX: Update question statistics (batch mode)
      const existing = existingStatsMap.get(q.questionId);

      if (!existing) {
        // Queue for batch insert
        statsToCreate.push({
          userId: user.id,
          questionId: q.questionId,
          questionBankId: qbankId,
          timesAttempted: 1,
          timesCorrect: isCorrect ? 1 : 0,
          timesIncorrect: isCorrect ? 0 : 1,
          timesOmitted: 0,
          timesCorrectOnReattempt: 0,
          lastAttemptedAt: new Date(),
        });
      } else {
        // Update existing stats
        await db
          .update(qbankQuestionStatistics)
          .set({
            timesAttempted: sql`${qbankQuestionStatistics.timesAttempted} + 1`,
            timesCorrect: isCorrect
              ? sql`${qbankQuestionStatistics.timesCorrect} + 1`
              : qbankQuestionStatistics.timesCorrect,
            timesIncorrect: !isCorrect
              ? sql`${qbankQuestionStatistics.timesIncorrect} + 1`
              : qbankQuestionStatistics.timesIncorrect,
            lastAttemptedAt: new Date(),
          })
          .where(eq(qbankQuestionStatistics.id, existing.id));
      }
    }

    // ✅ FIX: Batch insert new stats
    if (statsToCreate.length > 0) {
      await db
        .insert(qbankQuestionStatistics)
        .values(statsToCreate)
        .onConflictDoNothing(); // Prevent duplicates
      console.log(`✅ Created ${statsToCreate.length} new question statistics`);
    }

    // ✅ FIX: Save all question attempts
    if (attemptInserts.length > 0) {
      await db.insert(qbankQuestionAttempts).values(attemptInserts);
      console.log(`✅ Saved ${attemptInserts.length} question attempts`);
    }

    // ✅ FIX: Update test completion
    const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    await db
      .update(qbankTests)
      .set({
        status: 'completed',
        score: earnedPoints,
        maxScore: totalPoints,
        percentage,
        completedAt: new Date(),
      })
      .where(eq(qbankTests.id, newTest.id));

    console.log(`✅ Test ${newTest.id} completed: ${percentage}% (${correctCount}/${assignedQuestions.length})`);

    return NextResponse.json({
      score: percentage,
      correctCount,
      totalQuestions: assignedQuestions.length,
      earnedPoints,
      totalPoints,
      results,
      passed: percentage >= 70,
      testId: newTest.id, // ✅ Return test ID for history
    });
  } catch (error: any) {
    logger.error('Submit qbank test error:', error);
    return NextResponse.json(
      { message: 'Failed to submit test', error: error.message },
      { status: 500 }
    );
  }
}
