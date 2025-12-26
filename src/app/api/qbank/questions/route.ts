import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth-helpers';
import { qbankQuestions } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';

// Safe JSON parser
function safeJsonParse(value: any, fallback: any = null) {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// GET - Fetch specific questions by IDs (for test taking)
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const db = getDatabase();
    const url = new URL(request.url);
    const idsParam = url.searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json({ message: 'Question IDs required' }, { status: 400 });
    }

    // Parse IDs - handle both string and number arrays
    let questionIds: number[];
    try {
      questionIds = JSON.parse(idsParam).map((id: any) => parseInt(id.toString()));
    } catch {
      return NextResponse.json({ message: 'Invalid IDs format' }, { status: 400 });
    }

    console.log(`🔍 Fetching ${questionIds.length} questions by IDs:`, questionIds);

    // Fetch questions
    const questions = await db
      .select()
      .from(qbankQuestions)
      .where(inArray(qbankQuestions.id, questionIds));

    console.log(`✅ Found ${questions.length} questions in database`);

    // Map to expected format
    const formattedQuestions = questions.map((q: any) => {
      const options = safeJsonParse(q.options, []);
      const correctAnswer = safeJsonParse(q.correctAnswer, null);

      return {
        id: q.id,  // Return as number for consistency
        question: q.question || '',
        questionType: q.questionType || 'multiple_choice',
        type: q.questionType || 'multiple_choice',
        options: options,
        correctAnswer: correctAnswer,
        explanation: q.explanation || '',
        subject: q.subject || '',
        difficulty: q.difficulty || 'medium',
        points: q.points || 1,
        testType: q.testType || 'mixed',
      };
    });

    console.log(`📦 Returning ${formattedQuestions.length} formatted questions`);

    return NextResponse.json({
      questions: formattedQuestions,
      total: formattedQuestions.length,
    });
  } catch (error: any) {
    console.error('❌ Get questions by IDs error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch questions', error: error.message },
      { status: 500 }
    );
  }
}

