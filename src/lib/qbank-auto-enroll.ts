/**
 * Q-Bank Auto-Enrollment Helper
 * Automatically enrolls students in course Q-Banks when they enroll in a course
 */

import { questionBanks, qbankEnrollments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Auto-enroll student in course Q-Bank
 * Called when student enrolls in a course
 */
export async function autoEnrollInCourseQBank(
  tx: any,
  studentId: number,
  courseId: number
): Promise<{ enrolled: boolean; qbankId?: number }> {
  try {
    // Check if course has a Q-Bank
    const qbank = await tx
      .select()
      .from(questionBanks)
      .where(
        and(
          eq(questionBanks.courseId, courseId),
          eq(questionBanks.status, 'published'),
          eq(questionBanks.isActive, true)
        )
      )
      .limit(1);

    if (qbank.length === 0) {
      return { enrolled: false };
    }

    const qbankData = qbank[0];

    // Check if already enrolled
    const existingEnrollment = await tx
      .select()
      .from(qbankEnrollments)
      .where(
        and(
          eq(qbankEnrollments.studentId, studentId),
          eq(qbankEnrollments.qbankId, qbankData.id)
        )
      )
      .limit(1);

    if (existingEnrollment.length > 0) {
      return { enrolled: true, qbankId: qbankData.id };
    }

    // Create enrollment
    await tx.insert(qbankEnrollments).values({
      studentId,
      qbankId: qbankData.id,
      enrolledAt: new Date(),
      lastAccessedAt: new Date(),
      progress: 0,
      questionsAttempted: 0,
      questionsCorrect: 0,
      totalTimeSpentMinutes: 0,
      testsCompleted: 0,
      tutorialTestsCompleted: 0,
      timedTestsCompleted: 0,
      assessmentTestsCompleted: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      readinessScore: 0,
    });

    return { enrolled: true, qbankId: qbankData.id };
  } catch (error: any) {
    console.error('Auto-enroll in course Q-Bank error:', error);
    // Don't throw - enrollment should succeed even if Q-Bank enrollment fails
    return { enrolled: false };
  }
}

