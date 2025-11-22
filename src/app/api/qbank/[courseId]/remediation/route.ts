import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { 
  questionBanks, 
  qbankQuestions, 
  qbankQuestionStatistics,
  studentProgress
} from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
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

    const db = getDatabase();
    const courseIdNum = parseInt(params.courseId);

    // Check enrollment
    const enrollment = await db
      .select()
      .from(studentProgress)
      .where(
        and(
          eq(studentProgress.studentId, decoded.id),
          eq(studentProgress.courseId, courseIdNum)
        )
      )
      .limit(1);

    if (enrollment.length === 0) {
      return NextResponse.json(
        { message: 'Not enrolled in this course' },
        { status: 403 }
      );
    }

    // Get question bank
    const qbank = await db
      .select()
      .from(questionBanks)
      .where(
        and(
          eq(questionBanks.courseId, courseIdNum),
          eq(questionBanks.isActive, true)
        )
      )
      .limit(1);

    if (qbank.length === 0) {
      return NextResponse.json({
        data: {
          incorrectQuestions: 0,
          correctQuestions: 0,
          subjectBreakdown: [],
          questionsByCategory: {
            pendingReview: 0,
            lowConfidence: 0,
            highConfidence: 0,
            correctOnReattempt: 0,
          },
        },
      });
    }

    const qbankId = qbank[0].id;

    // Get user statistics
    const userStats = await db
      .select({
        questionId: qbankQuestionStatistics.questionId,
        timesIncorrect: qbankQuestionStatistics.timesIncorrect,
        timesCorrect: qbankQuestionStatistics.timesCorrect,
        timesOmitted: qbankQuestionStatistics.timesOmitted,
        timesCorrectOnReattempt: qbankQuestionStatistics.timesCorrectOnReattempt,
        confidenceLevel: qbankQuestionStatistics.confidenceLevel,
        subject: qbankQuestions.subject,
      })
      .from(qbankQuestionStatistics)
      .innerJoin(qbankQuestions, eq(qbankQuestionStatistics.questionId, qbankQuestions.id))
      .where(
        and(
          eq(qbankQuestionStatistics.userId, decoded.id),
          eq(qbankQuestionStatistics.questionBankId, qbankId)
        )
      );

    // Calculate totals
    const incorrectQuestions = userStats.reduce((sum, stat) => 
      sum + Number(stat.timesIncorrect || 0) + Number(stat.timesOmitted || 0), 0
    );
    const correctQuestions = userStats.reduce((sum, stat) => 
      sum + Number(stat.timesCorrect || 0), 0
    );

    // Group by subject
    const subjectMap = new Map<string, number>();
    userStats.forEach(stat => {
      if (stat.subject) {
        const current = subjectMap.get(stat.subject) || 0;
        subjectMap.set(
          stat.subject,
          current + Number(stat.timesIncorrect || 0) + Number(stat.timesOmitted || 0)
        );
      }
    });

    const subjectBreakdown = Array.from(subjectMap.entries())
      .map(([subject, count]) => ({
        subject,
        count,
        percentage: incorrectQuestions > 0 ? Math.round((count / incorrectQuestions) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Count by category
    const questionsByCategory = {
      pendingReview: userStats.filter(s => s.confidenceLevel === 'pending_review' || !s.confidenceLevel).length,
      lowConfidence: userStats.filter(s => s.confidenceLevel === 'low_confidence').length,
      highConfidence: userStats.filter(s => s.confidenceLevel === 'high_confidence').length,
      correctOnReattempt: userStats.filter(s => 
        Number(s.timesCorrectOnReattempt || 0) > 0
      ).length,
    };

    return NextResponse.json({
      data: {
        incorrectQuestions,
        correctQuestions,
        subjectBreakdown,
        questionsByCategory,
      },
    });
  } catch (error: any) {
    console.error('Get remediation error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

