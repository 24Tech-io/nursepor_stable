import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { qbankEnrollments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { fetchFilteredQuestions } from '@/lib/qbank-helpers';

export const dynamic = 'force-dynamic';

export async function GET(
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

    const { searchParams } = new URL(request.url);
    const count = parseInt(searchParams.get('count') || '10');
    const difficulty = searchParams.get('difficulty') || 'mixed';

    // New Filters
    const subjects = searchParams.get('subjects')?.split(',').filter(Boolean);
    const systems = searchParams.get('systems')?.split(',').filter(Boolean);
    const clientNeeds = searchParams.get('clientNeeds')?.split(',').filter(Boolean);
    const topics = searchParams.get('topics')?.split(',').filter(Boolean);
    const mode = searchParams.get('mode') || 'all';

    const db = await getDatabaseWithRetry();

    // Check enrollment
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

    // Use helper
    const { questions: selectedQuestions, total: totalAvailable } = await fetchFilteredQuestions({
      qbankId,
      studentId,
      subjects,
      systems,
      clientNeeds,
      topics,
      difficulty,
      mode,
      count
    }, db);

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

    // Format questions
    const formattedQuestions = selectedQuestions.map((q) => {
      const options = safeJsonParse(q.options, []);
      const formattedOptions = Array.isArray(options)
        ? options.map((opt: any, idx: number) => ({
          id: opt.id || String.fromCharCode(97 + idx),
          text: opt.text || opt || '',
        }))
        : [];

      return {
        id: q.id,
        question: q.question,
        questionType: q.questionType,
        options: formattedOptions,
        correctAnswer: safeJsonParse(q.correctAnswer, null),
        explanation: q.explanation,
        difficulty: q.difficulty,
        subject: q.subject,
        system: q.lesson,
        topic: q.subcategory,
      };
    });

    return NextResponse.json({
      questions: formattedQuestions,
      total: totalAvailable, // Logic here changed slightly: 'total' returned by helper is "all matching filtered", but before it was "all matching conditions" which is same.
      availableMatches: totalAvailable,
    });
  } catch (error: any) {
    logger.error('Error fetching questions:', error);
    return NextResponse.json(
      { message: 'Failed to fetch questions', error: error.message },
      { status: 500 }
    );
  }
}

