import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import {
  qbankQuestions,
  qbankEnrollments,
  qbankTestAttempts,
  qbankQuestionAttempts,
  qbankTests
} from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

const submitAnswerSchema = z.object({
  questionId: z.number().int().positive(),
  answer: z.any(), // Can be string or array for SATA
  testAttemptId: z.number().int().positive().optional(),
});

function safeJsonParse(value: any, fallback: any = null) {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('student_token')?.value || request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const studentId = decoded.id;
    const qbankId = parseInt(params.id);

    if (isNaN(qbankId)) {
      return NextResponse.json({ message: 'Invalid Q-Bank ID' }, { status: 400 });
    }

    // Validate request body
    const body = await request.json();
    const validation = submitAnswerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: 'Validation failed', errors: validation.error.format() },
        { status: 400 }
      );
    }

    const { questionId, answer, testAttemptId } = validation.data;

    const db = await getDatabaseWithRetry();

    // Verify enrollment
    const enrollment = await db
      .select()
      .from(qbankEnrollments)
      .where(
        and(
          eq(qbankEnrollments.studentId, studentId),
          eq(qbankEnrollments.qbankId, qbankId)
        )
      )
      .limit(1);

    if (enrollment.length === 0) {
      return NextResponse.json({ message: 'Not enrolled in this Q-Bank' }, { status: 403 });
    }

    // Get the question
    const [question] = await db
      .select()
      .from(qbankQuestions)
      .where(
        and(
          eq(qbankQuestions.id, questionId),
          eq(qbankQuestions.questionBankId, qbankId)
        )
      )
      .limit(1);

    if (!question) {
      return NextResponse.json({ message: 'Question not found' }, { status: 404 });
    }

    // Get or create test attempt (qbankTestAttempts)
    let testAttempt;
    if (testAttemptId) {
      [testAttempt] = await db
        .select()
        .from(qbankTestAttempts)
        .where(
          and(
            eq(qbankTestAttempts.id, testAttemptId),
            eq(qbankTestAttempts.studentId, studentId),
            eq(qbankTestAttempts.qbankId, qbankId)
          )
        )
        .limit(1);
    } else {
      // Get the most recent incomplete test attempt
      const attempts = await db
        .select()
        .from(qbankTestAttempts)
        .where(
          and(
            eq(qbankTestAttempts.studentId, studentId),
            eq(qbankTestAttempts.qbankId, qbankId),
            eq(qbankTestAttempts.isCompleted, false)
          )
        )
        .orderBy(desc(qbankTestAttempts.startedAt))
        .limit(1);

      if (attempts.length > 0) {
        testAttempt = attempts[0];
      } else {
        // Create a new test attempt for tutor mode
        [testAttempt] = await db
          .insert(qbankTestAttempts)
          .values({
            enrollmentId: enrollment[0].id,
            qbankId: qbankId,
            studentId: studentId,
            testMode: 'tutorial',
            questionCount: 1,
            isCompleted: false,
          })
          .returning();
      }
    }

    if (!testAttempt) {
      return NextResponse.json({ message: 'Test attempt not found' }, { status: 404 });
    }

    // Get or create qbankTests record (needed for qbankQuestionAttempts.testId)
    let qbankTest;
    const existingQbankTests = await db
      .select()
      .from(qbankTests)
      .where(
        and(
          eq(qbankTests.userId, studentId),
          eq(qbankTests.questionBankId, qbankId),
          eq(qbankTests.status, 'in_progress')
        )
      )
      .orderBy(desc(qbankTests.createdAt))
      .limit(1);

    if (existingQbankTests.length > 0) {
      qbankTest = existingQbankTests[0];
      // Update questionIds to include this question
      const questionIds = JSON.parse(qbankTest.questionIds || '[]');
      if (!questionIds.includes(questionId)) {
        questionIds.push(questionId);
        await db
          .update(qbankTests)
          .set({
            questionIds: JSON.stringify(questionIds),
            totalQuestions: questionIds.length,
          })
          .where(eq(qbankTests.id, qbankTest.id));
      }
    } else {
      // Create new qbankTests record for question attempts
      [qbankTest] = await db
        .insert(qbankTests)
        .values({
          questionBankId: qbankId,
          userId: studentId,
          testId: `TUTOR-${testAttempt.id}-${Date.now()}`,
          mode: testAttempt.testMode || 'tutorial',
          testType: testAttempt.testType || 'mixed',
          questionIds: JSON.stringify([questionId]),
          totalQuestions: 1,
          status: 'in_progress',
        })
        .returning();
    }

    // Parse correct answer
    const correctAnswer = safeJsonParse(question.correctAnswer);
    const studentAnswer = Array.isArray(answer) ? answer : [answer];

    // Check if answer is correct
    let isCorrect = false;
    let isPartiallyCorrect = false;
    let pointsEarned = 0;

    // Check question types
    const isOrdering = question.questionType === 'ordering' || question.questionType === 'ranking';
    const isBowTie = question.questionType === 'bowtie';
    const isCaseStudy = question.questionType === 'casestudy' || question.questionType === 'ngn_case_study';

    if (isOrdering && Array.isArray(correctAnswer)) {
      // For ordering, order MATTERS. Strict array comparison.
      isCorrect = JSON.stringify(studentAnswer) === JSON.stringify(correctAnswer);
      if (isCorrect) {
        pointsEarned = question.points;
      }
    } else if (isBowTie) {
      // BowTie Scoring: 1 point for condition, 1 for each finding (max 2), 1 for each action (max 2)
      // answer: { findings: [], condition: '', actions: [] } (passed as studentAnswer[0] if it was wrapped in array, but studentAnswer is array itself?)
      // Line 199: const studentAnswer = Array.isArray(answer) ? answer : [answer];
      // studentAnswer might be wrapped in array if client sent object.
      // If client sent { ... }, studentAnswer = [{...}]

      const ans = Array.isArray(answer) ? answer[0] : answer; // Unwrap if needed
      const corr = correctAnswer;

      let score = 0;
      const maxScore = 5;

      // 1. Condition
      if (ans.condition === corr.condition) score += 1;

      // 2. Findings (Order insensitive)
      const correctFindings = new Set(corr.findings || []);
      const studentFindings = new Set(ans.findings || []);
      let findingsMatches = 0;
      studentFindings.forEach((f: any) => { if (correctFindings.has(f)) findingsMatches++; });
      score += Math.min(findingsMatches, 2); // Max 2 points for findings

      // 3. Actions
      const correctActions = new Set(corr.actions || []);
      const studentActions = new Set(ans.actions || []);
      let actionsMatches = 0;
      studentActions.forEach((a: any) => { if (correctActions.has(a)) actionsMatches++; });
      score += Math.min(actionsMatches, 2); // Max 2 points for actions

      pointsEarned = score;
      isCorrect = score === maxScore;
      isPartiallyCorrect = score > 0 && score < maxScore;

    } else if (isCaseStudy) {
      // Case Study Scoring
      const csOptions = safeJsonParse(question.options, {});
      const steps = csOptions.steps || {};
      let score = 0;
      let totalSteps = Object.keys(steps).length || 6;

      const ans = Array.isArray(answer) ? answer[0] : answer; // Unwrap

      // studentAnswer: { 1: idx, 2: idx, ... }
      Object.keys(steps).forEach((stepKey: string) => {
        const step = steps[stepKey];
        const correctStepAns = step.correctAnswer; // index
        const studentStepAns = ans[stepKey];

        if (String(correctStepAns) === String(studentStepAns)) {
          score++;
        }
      });

      pointsEarned = score;
      isCorrect = score === totalSteps;
      isPartiallyCorrect = score > 0 && score < totalSteps;

    } else if (question.questionType === 'dosage_calculation' || question.questionType === 'calculation') {
      const dOpts = safeJsonParse(question.options, {});
      // dOpts might be the dosageData itself or wrapped in dosageData key depending on serialization history
      // In route.ts POST: dosageData object is saved directly if type is calculation/dosage_calculation
      // Check structure:
      const dosageData = dOpts.dosageData || dOpts;
      const tolerance = parseFloat(dosageData.tolerance || '0');
      const correctVal = parseFloat(String(correctAnswer));
      const ansVal = parseFloat(String(studentAnswer[0]));

      if (!isNaN(correctVal) && !isNaN(ansVal)) {
        if (Math.abs(ansVal - correctVal) <= tolerance) {
          isCorrect = true;
          pointsEarned = question.points;
        }
      } else {
        // Fallback to strict string eq if parsing fails
        if (String(studentAnswer[0]) === String(correctAnswer)) {
          isCorrect = true;
          pointsEarned = question.points;
        }
      }
    } else if (
      question.questionType === 'matrix' ||
      question.questionType === 'matrix_multiple_response' ||
      question.questionType === 'drag_drop' ||
      question.questionType === 'extended_drag_drop'
    ) {
      // Object comparison (Matrix: "r-c": bool, DragDrop: "itemId": catIndex)
      // answer is usually an object. studentAnswer is [object] due to wrapper.
      const ans = Array.isArray(answer) ? answer[0] : answer;
      const corr = typeof correctAnswer === 'string' ? safeJsonParse(correctAnswer) : correctAnswer;

      // Strict object equality for simplicity (or should we do partial?)
      // NGN usually wants partial.
      // Let's implement basics: Count matching keys/values.

      let totalKeys = Object.keys(corr || {}).length;
      if (totalKeys === 0 && corr && typeof corr === 'object') totalKeys = Object.keys(corr).length; // Safety

      let matches = 0;

      // Check all correct keys
      if (corr && typeof corr === 'object') {
        Object.keys(corr).forEach(k => {
          if (String(ans[k]) === String(corr[k])) {
            matches++;
          }
        });

        // Also check that student hasn't selected extra wrong things (for Matrix multiple response)
        // But matrix format "r-c": true usually implies selection. identifying false positives is needed.
        // If answer is sparse (only true values), count matches.
        // DragDrop is usually dense (all items assigned).

        if (matches === totalKeys && Object.keys(ans || {}).length === totalKeys) {
          isCorrect = true;
          pointsEarned = question.points;
        } else if (matches > 0) {
          isPartiallyCorrect = true;
          pointsEarned = Math.floor((matches / Math.max(totalKeys, 1)) * question.points);
        }
      }
    } else if (Array.isArray(correctAnswer)) {
      // SATA or multiple correct answers (Order doesn't matter)
      const correctSet = new Set(correctAnswer);
      const studentSet = new Set(studentAnswer);

      if (correctSet.size === studentSet.size &&
        Array.from(correctSet).every(a => studentSet.has(a))) {
        isCorrect = true;
        pointsEarned = question.points;
      } else if (studentAnswer.some(a => correctSet.has(a))) {
        isPartiallyCorrect = true;
        // Partial credit calculation
        const correctSelected = studentAnswer.filter(a => correctSet.has(a)).length;
        pointsEarned = Math.floor((correctSelected / correctAnswer.length) * question.points);
      }
    } else {
      // Single correct answer
      isCorrect = String(studentAnswer[0]) === String(correctAnswer);
      if (isCorrect) {
        pointsEarned = question.points;
      }
    }

    // Check if this is the first attempt for this question
    const existingAttempts = await db
      .select()
      .from(qbankQuestionAttempts)
      .where(
        and(
          eq(qbankQuestionAttempts.questionId, questionId),
          eq(qbankQuestionAttempts.userId, studentId),
          eq(qbankQuestionAttempts.testId, qbankTest.id)
        )
      )
      .limit(1);

    const isFirstAttempt = existingAttempts.length === 0;

    // Create or update question attempt
    if (existingAttempts.length > 0) {
      // Update existing attempt
      await db
        .update(qbankQuestionAttempts)
        .set({
          userAnswer: JSON.stringify(answer),
          selectedAnswer: JSON.stringify(answer),
          correctAnswer: JSON.stringify(correctAnswer),
          isCorrect,
          isPartiallyCorrect,
          pointsEarned,
          isFirstAttempt: false,
          attemptedAt: new Date(),
        })
        .where(eq(qbankQuestionAttempts.id, existingAttempts[0].id));
    } else {
      // Create new attempt
      await db
        .insert(qbankQuestionAttempts)
        .values({
          testId: qbankTest.id,
          questionId: questionId,
          userId: studentId,
          userAnswer: JSON.stringify(answer),
          selectedAnswer: JSON.stringify(answer),
          correctAnswer: JSON.stringify(correctAnswer),
          isCorrect,
          isPartiallyCorrect,
          pointsEarned,
          isFirstAttempt: true,
        });
    }

    return NextResponse.json({
      isCorrect,
      isPartiallyCorrect,
      correctAnswer: correctAnswer,
      explanation: question.explanation,
      pointsEarned,
      totalPoints: question.points,
    });
  } catch (error: any) {
    logger.error('Submit answer error:', error);
    return NextResponse.json(
      { message: 'Failed to submit answer', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

