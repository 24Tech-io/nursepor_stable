import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { submitQBankTestSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { qbankTestAttempts, qbankQuestions, qbankEnrollments, qbankQuestionAttempts, qbankTests, questionBanks, qbankSubjectPerformance } from '@/lib/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';

// Helper function to calculate readiness level (ArcherReview-style)
function calculateReadinessLevel(averageScore: number, testsCompleted: number): { level: string; score: number } {
  if (testsCompleted < 3) {
    return { level: 'insufficient_data', score: Math.round(averageScore) };
  }

  // Readiness score based on average performance
  const readinessScore = Math.round(averageScore);

  if (readinessScore >= 80) return { level: 'very_high', score: readinessScore };  // 98-99% pass probability
  if (readinessScore >= 65) return { level: 'high', score: readinessScore };        // 90-97% pass probability
  if (readinessScore >= 55) return { level: 'borderline', score: readinessScore };  // 70-89% pass probability
  return { level: 'low', score: readinessScore };                                   // <70% pass probability
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
    const bodyValidation = await extractAndValidate(request, submitQBankTestSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const { answers, timeSpent } = bodyValidation.data;

    const db = await getDatabaseWithRetry();

    // Get the most recent test attempt for this student and Q-Bank
    const testAttempts = await db
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

    if (testAttempts.length === 0) {
      return NextResponse.json({ message: 'No active test attempt found' }, { status: 404 });
    }

    const testAttempt = testAttempts[0];

    // Get or create qbankTests record for question attempts
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
    } else {
      // Create new qbankTests record
      [qbankTest] = await db
        .insert(qbankTests)
        .values({
          questionBankId: qbankId,
          userId: studentId,
          testId: `TEST-${testAttempt.id}-${Date.now()}`,
          mode: testAttempt.testMode || 'tutorial',
          testType: testAttempt.testType || 'mixed',
          questionIds: JSON.stringify([]),
          totalQuestions: 0,
          status: 'in_progress',
        })
        .returning();
    }

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


    // Helper for Deep Equality
    const deepEqual = (a: any, b: any): boolean => {
      if (a === b) return true;
      if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      for (const key of keysA) {
        if (!keysB.includes(key) || !deepEqual(a[key], b[key])) return false;
      }
      return true;
    };

    // Calculate score and create question attempt records
    let correctCount = 0;
    let incorrectCount = 0;
    const questionIds = Object.keys(answers).map(id => parseInt(id));
    const questionAttempts: any[] = [];

    // Track performance by subject/lesson for analytics
    const subjectPerformance: Map<string, { attempted: number; correct: number; subject: string; lesson: string | null; clientNeedArea: string | null }> = new Map();

    if (questionIds.length > 0) {
      const questions = await db
        .select()
        .from(qbankQuestions)
        .where(
          and(
            eq(qbankQuestions.questionBankId, qbankId),
            inArray(qbankQuestions.id, questionIds)
          )
        );

      const questionMap = new Map(questions.map(q => [q.id, q]));

      for (const questionId of questionIds) {
        const question = questionMap.get(questionId) as any;
        if (question) {
          const userAnswer = answers[questionId];
          const correctAnswer = safeJsonParse(question.correctAnswer);

          let isCorrect = false;

          // Special handling for Arrays (SATA, etc) where order might not matter
          // But for Ordered Response, order DOES matter.
          // Classic SATA: order doesn't matter.
          // Ranking: order matters.
          // We need to check questionType if possible, OR just use deepEqual for strict match.
          // Given `question.questionType`, let's refine.

          if (question.questionType === 'sata' || question.questionType === 'sata_classic') {
            // Set-based comparison (Order doesn't matter)
            const sArr = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
            const cArr = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
            const sSet = new Set(sArr.map((x: any) => String(x)));
            const cSet = new Set(cArr.map((x: any) => String(x)));
            isCorrect = sSet.size === cSet.size && [...sSet].every(x => cSet.has(x));
          } else {
            // Strict Deep Equal (Order matters for Ranking, Structure matters for Objects)
            isCorrect = deepEqual(userAnswer, correctAnswer);
          }


          if (isCorrect) {
            correctCount++;
          } else {
            incorrectCount++;
          }

          // Track subject/lesson performance
          const subjectKey = question.subject || 'Uncategorized';
          const existing = subjectPerformance.get(subjectKey) || {
            attempted: 0,
            correct: 0,
            subject: subjectKey,
            lesson: question.lesson || null,
            clientNeedArea: question.clientNeedArea || null,
          };
          existing.attempted++;
          if (isCorrect) existing.correct++;
          subjectPerformance.set(subjectKey, existing);

          // Create question attempt record
          questionAttempts.push({
            testId: qbankTest.id,
            questionId: questionId,
            userId: studentId,
            userAnswer: JSON.stringify(userAnswer),
            selectedAnswer: JSON.stringify(userAnswer),
            correctAnswer: JSON.stringify(correctAnswer),
            isCorrect,
            isPartiallyCorrect: false,
            pointsEarned: isCorrect ? question.points : 0,
            isFirstAttempt: true,
          });
        }
      }
    }

    // Insert all question attempts
    if (questionAttempts.length > 0) {
      await db.insert(qbankQuestionAttempts).values(questionAttempts);

      // Update qbankTests with question IDs
      await db
        .update(qbankTests)
        .set({
          questionIds: JSON.stringify(questionIds),
          totalQuestions: questionIds.length,
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(qbankTests.id, qbankTest.id));
    }

    const totalQuestions = testAttempt.questionCount;
    const unansweredCount = totalQuestions - (correctCount + incorrectCount);
    const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

    // Update test attempt with performance breakdown
    const performanceBreakdown = {
      bySubject: Object.fromEntries(
        Array.from(subjectPerformance.entries()).map(([key, val]) => [
          key,
          { attempted: val.attempted, correct: val.correct, accuracy: val.attempted > 0 ? Math.round((val.correct / val.attempted) * 100) : 0 }
        ])
      ),
    };

    await db
      .update(qbankTestAttempts)
      .set({
        isCompleted: true,
        completedAt: new Date(),
        timeSpentSeconds: timeSpent || 0,
        score: score,
        correctCount: correctCount,
        incorrectCount: incorrectCount,
        unansweredCount: unansweredCount,
        isPassed: score >= 70,
        performanceBreakdown: JSON.stringify(performanceBreakdown),
      })
      .where(eq(qbankTestAttempts.id, testAttempt.id));

    // Update enrollment stats
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

    let readinessData = { level: 'insufficient_data', score: 0 };

    if (enrollment.length > 0) {
      const currentStats = enrollment[0];
      const newTestsCompleted = (currentStats.testsCompleted || 0) + 1;

      // Calculate new average score
      const currentAvg = currentStats.averageScore || 0;
      const oldTotalScore = currentAvg * (newTestsCompleted - 1);
      const newAverageScore = (oldTotalScore + score) / newTestsCompleted;

      // Calculate high/low scores
      const currentHigh = currentStats.highestScore || 0;
      const currentLow = currentStats.lowestScore !== null ? currentStats.lowestScore : 0;
      const newHighestScore = Math.max(currentHigh, score);
      let newLowestScore = score;
      if (newTestsCompleted > 1) {
        newLowestScore = Math.min(currentLow, score);
      }

      // Increment specific mode counters
      let tutorialCount = currentStats.tutorialTestsCompleted || 0;
      let timedCount = currentStats.timedTestsCompleted || 0;
      let assessmentCount = currentStats.assessmentTestsCompleted || 0;

      if (testAttempt.testMode === 'tutorial') tutorialCount++;
      else if (testAttempt.testMode === 'timed') timedCount++;
      else if (testAttempt.testMode === 'assessment') assessmentCount++;

      // Calculate progress as (questionsCorrect / totalQuestionsInQBank) * 100
      const newQuestionsCorrect = (currentStats.questionsCorrect || 0) + correctCount;

      // Get total questions in Q-Bank to calculate progress percentage
      const qbankData = await db
        .select({ totalQuestions: questionBanks.totalQuestions })
        .from(questionBanks)
        .where(eq(questionBanks.id, qbankId))
        .limit(1);

      const totalQuestionsInQBank = qbankData[0]?.totalQuestions || 0;
      const newProgress = totalQuestionsInQBank > 0
        ? Math.round((newQuestionsCorrect / totalQuestionsInQBank) * 100)
        : 0;

      // Calculate readiness level (ArcherReview-style)
      readinessData = calculateReadinessLevel(newAverageScore, newTestsCompleted);

      await db
        .update(qbankEnrollments)
        .set({
          questionsAttempted: (currentStats.questionsAttempted || 0) + totalQuestions,
          questionsCorrect: newQuestionsCorrect,
          testsCompleted: newTestsCompleted,
          tutorialTestsCompleted: tutorialCount,
          timedTestsCompleted: timedCount,
          assessmentTestsCompleted: assessmentCount,
          averageScore: newAverageScore,
          highestScore: newHighestScore,
          lowestScore: newLowestScore,
          progress: newProgress,
          readinessScore: readinessData.score,
          readinessLevel: readinessData.level,
          lastReadinessCalculation: new Date(),
          totalTimeSpentMinutes: (currentStats.totalTimeSpentMinutes || 0) + Math.floor((timeSpent || 0) / 60),
          lastAccessedAt: new Date(),
        })
        .where(eq(qbankEnrollments.id, currentStats.id));

      // Update subject performance table
      for (const [subject, perf] of subjectPerformance.entries()) {
        const existingSubjectPerf = await db
          .select()
          .from(qbankSubjectPerformance)
          .where(
            and(
              eq(qbankSubjectPerformance.enrollmentId, currentStats.id),
              eq(qbankSubjectPerformance.subject, subject)
            )
          )
          .limit(1);

        if (existingSubjectPerf.length > 0) {
          // Update existing
          const existing = existingSubjectPerf[0];
          const newAttempted = (existing.questionsAttempted || 0) + perf.attempted;
          const newCorrect = (existing.questionsCorrect || 0) + perf.correct;
          const newAccuracy = newAttempted > 0 ? Math.round((newCorrect / newAttempted) * 100) : 0;

          await db
            .update(qbankSubjectPerformance)
            .set({
              questionsAttempted: newAttempted,
              questionsCorrect: newCorrect,
              accuracyPercentage: newAccuracy,
              performanceLevel: newAccuracy >= 80 ? 'mastery' : newAccuracy >= 65 ? 'proficient' : newAccuracy >= 50 ? 'developing' : 'weak',
              lastUpdated: new Date(),
            })
            .where(eq(qbankSubjectPerformance.id, existing.id));
        } else {
          // Insert new
          const accuracy = perf.attempted > 0 ? Math.round((perf.correct / perf.attempted) * 100) : 0;
          await db
            .insert(qbankSubjectPerformance)
            .values({
              enrollmentId: currentStats.id,
              studentId: studentId,
              subject: subject,
              lesson: perf.lesson,
              clientNeedArea: perf.clientNeedArea,
              questionsAttempted: perf.attempted,
              questionsCorrect: perf.correct,
              accuracyPercentage: accuracy,
              performanceLevel: accuracy >= 80 ? 'mastery' : accuracy >= 65 ? 'proficient' : accuracy >= 50 ? 'developing' : 'weak',
              lastUpdated: new Date(),
            });
        }
      }
    }

    return NextResponse.json({
      attemptId: testAttempt.id,
      score: score,
      correctCount: correctCount,
      incorrectCount: incorrectCount,
      unansweredCount: unansweredCount,
      totalQuestions: totalQuestions,
      isPassed: score >= 70,
      readiness: readinessData,
      performanceBreakdown: performanceBreakdown,
      message: 'Test submitted successfully',
    });
  } catch (error: any) {
    logger.error('Error submitting test:', error);
    return NextResponse.json(
      { message: 'Failed to submit test', error: error.message },
      { status: 500 }
    );
  }
}


