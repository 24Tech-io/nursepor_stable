/**
 * Q-Bank Analytics Calculation Functions
 * Archer Review-style analytics and performance tracking
 */

import { getDatabaseWithRetry } from '@/lib/db';
import {
  qbankEnrollments,
  qbankTestAttempts,
  qbankCategoryPerformance,
  qbankSubjectPerformance,
  qbankRemediationTracking,
  qbankQuestions,
  qbankQuestionAttempts,
  qbankCategories,
} from '@/lib/db/schema';
import { eq, and, sql, desc, gte } from 'drizzle-orm';

/**
 * Calculate readiness score (0-100)
 * Formula: overallAccuracy * 0.40 + categoryCoverage * 0.20 + weakAreaImprovement * 0.20 + testModePerformance * 0.10 + confidenceLevels * 0.10
 */
export async function calculateReadinessScore(
  enrollmentId: number,
  studentId: number,
  qbankId: number
): Promise<{ score: number; level: string; breakdown: any }> {
  const db = await getDatabaseWithRetry();

  // Get enrollment data
  const enrollment = await db
    .select()
    .from(qbankEnrollments)
    .where(eq(qbankEnrollments.id, enrollmentId))
    .limit(1);

  if (enrollment.length === 0) {
    return { score: 0, level: 'Very Low', breakdown: {} };
  }

  const enrollmentData = enrollment[0];

  // 1. Overall Accuracy (40%)
  const overallAccuracy = enrollmentData.questionsAttempted > 0
    ? (enrollmentData.questionsCorrect / enrollmentData.questionsAttempted) * 100
    : 0;

  // 2. Category Coverage (20%)
  const totalCategoriesResult = await db
    .select({ count: sql<number>`count(distinct ${qbankCategories.id})` })
    .from(qbankCategories)
    .innerJoin(qbankQuestions, eq(qbankQuestions.categoryId, qbankCategories.id))
    .where(eq(qbankQuestions.questionBankId, qbankId));

  const totalCategories = totalCategoriesResult[0]?.count || 0;

  const attemptedCategoriesResult = await db
    .select({ count: sql<number>`count(distinct ${qbankCategoryPerformance.categoryId})` })
    .from(qbankCategoryPerformance)
    .where(eq(qbankCategoryPerformance.enrollmentId, enrollmentId));

  const attemptedCategories = attemptedCategoriesResult[0]?.count || 0;

  const categoryCoverage = totalCategories > 0
    ? (attemptedCategories / totalCategories) * 100
    : 0;

  // 3. Weak Area Improvement (20%)
  const weakCategories = await db
    .select()
    .from(qbankCategoryPerformance)
    .where(
      and(
        eq(qbankCategoryPerformance.enrollmentId, enrollmentId),
        eq(qbankCategoryPerformance.needsRemediation, true)
      )
    );

  const weakAreaImprovement = weakCategories.length === 0 ? 100 : Math.max(0, 100 - (weakCategories.length * 10));

  // 4. Test Mode Performance (10%)
  const recentTests = await db
    .select()
    .from(qbankTestAttempts)
    .where(
      and(
        eq(qbankTestAttempts.enrollmentId, enrollmentId),
        eq(qbankTestAttempts.isCompleted, true)
      )
    )
    .orderBy(desc(qbankTestAttempts.completedAt))
    .limit(5);

  const testModePerformance = recentTests.length > 0
    ? recentTests.reduce((sum, test) => sum + (test.score || 0), 0) / recentTests.length
    : 0;

  // 5. Confidence Levels (10%)
  // Note: qbankQuestionAttempts uses testId from qbankTests, not qbankTestAttempts
  // For now, we'll use a simpler calculation based on enrollment stats
  const confidenceScore = enrollmentData.questionsAttempted > 0
    ? (enrollmentData.questionsCorrect / enrollmentData.questionsAttempted) * 100 * 0.1
    : 0;

  // Calculate final score
  const score = Math.round(
    overallAccuracy * 0.40 +
    categoryCoverage * 0.20 +
    weakAreaImprovement * 0.20 +
    testModePerformance * 0.10 +
    confidenceScore * 0.10
  );

  // Determine level
  let level = 'Very Low';
  if (score >= 81) level = 'High';
  else if (score >= 61) level = 'Pass';
  else if (score >= 51) level = 'Borderline';
  else if (score >= 26) level = 'Low';
  else level = 'Very Low';

  return {
    score: Math.min(100, Math.max(0, score)),
    level,
    breakdown: {
      overallAccuracy,
      categoryCoverage,
      weakAreaImprovement,
      testModePerformance,
      confidenceScore,
    },
  };
}

/**
 * Get category performance breakdown
 */
export async function getCategoryPerformance(enrollmentId: number) {
  const db = await getDatabaseWithRetry();

  const performance = await db
    .select({
      categoryId: qbankCategoryPerformance.categoryId,
      categoryName: qbankCategories.name,
      questionsAttempted: qbankCategoryPerformance.questionsAttempted,
      questionsCorrect: qbankCategoryPerformance.questionsCorrect,
      accuracyPercentage: qbankCategoryPerformance.accuracyPercentage,
      averageTimeSeconds: qbankCategoryPerformance.averageTimeSeconds,
      performanceLevel: qbankCategoryPerformance.performanceLevel,
      needsRemediation: qbankCategoryPerformance.needsRemediation,
    })
    .from(qbankCategoryPerformance)
    .innerJoin(qbankCategories, eq(qbankCategoryPerformance.categoryId, qbankCategories.id))
    .where(eq(qbankCategoryPerformance.enrollmentId, enrollmentId))
    .orderBy(desc(qbankCategoryPerformance.accuracyPercentage));

  return performance;
}

/**
 * Get subject performance breakdown
 */
export async function getSubjectPerformance(enrollmentId: number) {
  const db = await getDatabaseWithRetry();

  const performance = await db
    .select()
    .from(qbankSubjectPerformance)
    .where(eq(qbankSubjectPerformance.enrollmentId, enrollmentId))
    .orderBy(desc(qbankSubjectPerformance.accuracyPercentage));

  return performance;
}

/**
 * Identify strengths and weaknesses
 */
export async function getStrengthsAndWeaknesses(
  enrollmentId: number,
  threshold: number = 60
): Promise<{ strengths: any[]; weaknesses: any[] }> {
  const categoryPerf = await getCategoryPerformance(enrollmentId);

  const strengths = categoryPerf.filter(
    p => p.accuracyPercentage >= threshold && !p.needsRemediation
  );
  const weaknesses = categoryPerf.filter(
    p => p.accuracyPercentage < threshold || p.needsRemediation
  );

  return { strengths, weaknesses };
}

/**
 * Get remediation questions
 */
export async function getRemediationQuestions(enrollmentId: number) {
  const db = await getDatabaseWithRetry();

  const remediation = await db
    .select({
      questionId: qbankRemediationTracking.questionId,
      question: qbankQuestions.question,
      categoryId: qbankQuestions.categoryId,
      categoryName: qbankCategories.name,
      totalAttempts: qbankRemediationTracking.totalAttempts,
      consecutiveCorrect: qbankRemediationTracking.consecutiveCorrect,
      firstIncorrectAt: qbankRemediationTracking.firstIncorrectAt,
      needsRemediation: qbankRemediationTracking.needsRemediation,
      remediationCompleted: qbankRemediationTracking.remediationCompleted,
    })
    .from(qbankRemediationTracking)
    .innerJoin(qbankQuestions, eq(qbankRemediationTracking.questionId, qbankQuestions.id))
    .leftJoin(qbankCategories, eq(qbankQuestions.categoryId, qbankCategories.id))
    .where(
      and(
        eq(qbankRemediationTracking.enrollmentId, enrollmentId),
        eq(qbankRemediationTracking.needsRemediation, true)
      )
    )
    .orderBy(desc(qbankRemediationTracking.firstIncorrectAt));

  return remediation;
}

/**
 * Get performance trends over time
 */
export async function getPerformanceTrends(
  enrollmentId: number,
  period: '7d' | '30d' | 'all' = '30d'
) {
  const db = await getDatabaseWithRetry();

  let dateFilter: any = null;
  const now = new Date();
  if (period === '7d') {
    dateFilter = gte(qbankTestAttempts.completedAt, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
  } else if (period === '30d') {
    dateFilter = gte(qbankTestAttempts.completedAt, new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
  }

  const whereClause = dateFilter
    ? and(eq(qbankTestAttempts.enrollmentId, enrollmentId), eq(qbankTestAttempts.isCompleted, true), dateFilter)
    : and(eq(qbankTestAttempts.enrollmentId, enrollmentId), eq(qbankTestAttempts.isCompleted, true));

  const trends = await db
    .select({
      id: qbankTestAttempts.id,
      testMode: qbankTestAttempts.testMode,
      score: qbankTestAttempts.score,
      completedAt: qbankTestAttempts.completedAt,
      correctCount: qbankTestAttempts.correctCount,
      questionCount: qbankTestAttempts.questionCount,
    })
    .from(qbankTestAttempts)
    .where(whereClause)
    .orderBy(desc(qbankTestAttempts.completedAt));

  return trends;
}

/**
 * Generate study recommendations
 */
export async function generateStudyRecommendations(
  enrollmentId: number,
  studentId: number,
  qbankId: number
) {
  const db = await getDatabaseWithRetry();

  const recommendations: any[] = [];

  // Get weaknesses
  const { weaknesses } = await getStrengthsAndWeaknesses(enrollmentId, 60);

  // 1. Focus area recommendations (high priority)
  const criticalWeaknesses = weaknesses.filter(w => w.accuracyPercentage < 50);
  for (const weakness of criticalWeaknesses.slice(0, 3)) {
    recommendations.push({
      recommendationType: 'focus_area',
      priority: 'high',
      title: `Focus on ${weakness.categoryName}`,
      description: `Your accuracy in ${weakness.categoryName} is ${weakness.accuracyPercentage.toFixed(1)}%. Focus on this area to improve your overall readiness.`,
      actionItems: JSON.stringify([
        `Complete 50 questions in ${weakness.categoryName}`,
        `Review explanations for incorrect answers`,
        `Take a tutorial test focused on this category`,
      ]),
      categoryId: weakness.categoryId,
      generatedAt: new Date(),
    });
  }

  // 2. Test strategy recommendations
  const enrollment = await db
    .select()
    .from(qbankEnrollments)
    .where(eq(qbankEnrollments.id, enrollmentId))
    .limit(1);

  if (enrollment.length > 0) {
    const enrollmentData = enrollment[0];
    const tutorialAvg = enrollmentData.tutorialTestsCompleted > 0
      ? (enrollmentData.averageScore || 0)
      : 0;

    if (tutorialAvg > 0 && enrollmentData.timedTestsCompleted === 0) {
      recommendations.push({
        recommendationType: 'test_strategy',
        priority: 'medium',
        title: 'Start Taking Timed Tests',
        description: 'You\'ve completed tutorial tests. Start practicing with timed tests to simulate exam conditions.',
        actionItems: JSON.stringify([
          'Take a 20-question timed test',
          'Practice managing time per question',
          'Build test-taking stamina',
        ]),
        generatedAt: new Date(),
      });
    }
  }

  // 3. Time management recommendations
  const slowTests = await db
    .select()
    .from(qbankTestAttempts)
    .where(
      and(
        eq(qbankTestAttempts.enrollmentId, enrollmentId),
        eq(qbankTestAttempts.isCompleted, true),
        sql`${qbankTestAttempts.averageTimePerQuestion} > 120`
      )
    )
    .limit(5);

  if (slowTests.length > 0) {
    recommendations.push({
      recommendationType: 'time_management',
      priority: 'medium',
      title: 'Improve Test Speed',
      description: 'You\'re spending more than 2 minutes per question on average. Practice with timed tests to improve speed.',
      actionItems: JSON.stringify([
        'Take shorter timed tests (10-15 questions)',
        'Set a goal of 1.5 minutes per question',
        'Skip difficult questions and return later',
      ]),
      generatedAt: new Date(),
    });
  }

  return recommendations;
}

