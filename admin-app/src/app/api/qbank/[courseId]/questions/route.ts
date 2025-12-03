import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { questionBanks, qbankQuestions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Safe JSON parser that handles both JSON strings and plain values
function safeJsonParse(value: any, fallback: any = null) {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    // If it's not valid JSON, return as-is (e.g., single letter answers like 'b')
    return value;
  }
}

// Get human-readable label for question type
function getQuestionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    multiple_choice: 'Single Best Answer',
    sata: 'SATA (Classic)',
    ngn_case_study: 'Case Study',
    unfolding_ngn: 'Unfolding NGN',
    bowtie: 'Bow-Tie',
    casestudy: 'Case Study',
    matrix: 'Matrix',
    trend: 'Trend',
    standard: 'Single Best Answer',
    sata_classic: 'SATA (Classic)',
  };
  return labels[type] || type;
}

export async function GET(request: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const db = getDatabase();
    const courseId = parseInt(params.courseId);

    // Get or create question bank for this course
    let [qbank] = await db
      .select()
      .from(questionBanks)
      .where(eq(questionBanks.courseId, courseId))
      .limit(1);

    if (!qbank) {
      return NextResponse.json({ questions: [] });
    }

    const allQuestions = await db
      .select()
      .from(qbankQuestions)
      .where(eq(qbankQuestions.questionBankId, qbank.id));

    return NextResponse.json({
      questions: allQuestions.map((q: any) => ({
        id: q.id.toString(),
        stem: q.question
          ? q.question.substring(0, 100) + (q.question.length > 100 ? '...' : '')
          : 'No question text',
        category: q.testType || 'classic',
        label: getQuestionTypeLabel(q.questionType),
        format: q.questionType || 'multiple_choice',
        question: q.question,
        explanation: q.explanation,
        points: q.points,
        subject: q.subject,
        difficulty: q.difficulty,
        testType: q.testType,
        data: {
          options: safeJsonParse(q.options, []),
          correctAnswer: safeJsonParse(q.correctAnswer, null),
        },
      })),
    });
  } catch (error: any) {
    console.error('Get questions error:', error);
    return NextResponse.json(
      {
        message: 'Failed to get questions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const db = getDatabase();
    const courseId = parseInt(params.courseId);
    const { questions: questionsData } = await request.json();

    if (!Array.isArray(questionsData) || questionsData.length === 0) {
      return NextResponse.json({ message: 'Questions array is required' }, { status: 400 });
    }

    // Get or create question bank
    let [qbank] = await db
      .select()
      .from(questionBanks)
      .where(eq(questionBanks.courseId, courseId))
      .limit(1);

    if (!qbank) {
      [qbank] = await db
        .insert(questionBanks)
        .values({
          courseId,
          name: `Q-Bank for Course ${courseId}`,
        })
        .returning();
    }

    // Insert questions
    const insertedQuestions = await db
      .insert(qbankQuestions)
      .values(
        questionsData.map((q: any) => ({
          questionBankId: qbank.id,
          questionType: q.format || 'multiple_choice',
          question: q.question || '',
          explanation: q.explanation || null,
          points: q.points || 1,
          options: q.data?.options ? JSON.stringify(q.data.options) : '[]',
          correctAnswer: q.data?.correctAnswer ? JSON.stringify(q.data.correctAnswer) : '{}',
          subject: q.subject || null,
          lesson: q.lesson || null,
          clientNeedArea: q.clientNeedArea || null,
          subcategory: q.subcategory || null,
          testType: q.testType || 'mixed',
          difficulty: q.difficulty || 'medium',
        }))
      )
      .returning();

    return NextResponse.json(
      {
        message: 'Questions created successfully',
        questions: insertedQuestions.map((q: any) => ({
          id: q.id.toString(),
          stem: q.question
            ? q.question.substring(0, 100) + (q.question.length > 100 ? '...' : '')
            : 'No question text',
          category: q.testType || 'classic',
          label: getQuestionTypeLabel(q.questionType),
          format: q.questionType,
          question: q.question,
          explanation: q.explanation,
          points: q.points,
          subject: q.subject,
          difficulty: q.difficulty,
          testType: q.testType,
          data: {
            options: safeJsonParse(q.options, []),
            correctAnswer: safeJsonParse(q.correctAnswer, null),
          },
        })),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create questions error:', error);
    return NextResponse.json(
      {
        message: 'Failed to create questions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
