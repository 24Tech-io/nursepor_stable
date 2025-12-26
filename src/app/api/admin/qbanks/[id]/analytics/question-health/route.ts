import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { 
  questionBanks,
  qbankQuestions,
  qbankQuestionAttempts
} from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('admin_token')?.value || request.cookies.get('adminToken')?.value || request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const qbankId = parseInt(params.id);
    if (isNaN(qbankId)) {
      return NextResponse.json({ message: 'Invalid Q-Bank ID' }, { status: 400 });
    }

    // Verify Q-Bank exists
    const [qbank] = await db
      .select()
      .from(questionBanks)
      .where(eq(questionBanks.id, qbankId))
      .limit(1);

    if (!qbank) {
      return NextResponse.json({ message: 'Q-Bank not found' }, { status: 404 });
    }

    // Get question health metrics
    const questionHealth = await db
      .select({
        id: qbankQuestions.id,
        question: qbankQuestions.question,
        attempts: sql<number>`count(${qbankQuestionAttempts.id})`,
        correct: sql<number>`sum(case when ${qbankQuestionAttempts.isCorrect} then 1 else 0 end)`,
      })
      .from(qbankQuestions)
      .leftJoin(
        qbankQuestionAttempts,
        eq(qbankQuestionAttempts.questionId, qbankQuestions.id)
      )
      .where(eq(qbankQuestions.questionBankId, qbankId))
      .groupBy(qbankQuestions.id, qbankQuestions.question)
      .having(sql`count(${qbankQuestionAttempts.id}) >= 5`); // Only questions with at least 5 attempts

    // Format and filter problematic questions
    const questions = questionHealth
      .map((q: any) => {
        const attempts = Number(q.attempts) || 0;
        const correct = Number(q.correct) || 0;
        const accuracyPercentage = attempts > 0 ? (correct / attempts) * 100 : 0;
        
        return {
          id: q.id,
          question: q.question,
          accuracyPercentage,
          attempts,
          correct,
        };
      })
      .filter((q: any) => q.accuracyPercentage < 10 || q.accuracyPercentage > 90) // Problematic questions
      .sort((a, b) => {
        // Sort by how problematic (further from 50%)
        const aDeviation = Math.abs(a.accuracyPercentage - 50);
        const bDeviation = Math.abs(b.accuracyPercentage - 50);
        return bDeviation - aDeviation;
      });

    return NextResponse.json({ questions });
  } catch (error: any) {
    logger.error('Get question health error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch question health', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}




