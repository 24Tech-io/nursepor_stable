import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { questionBanks, qbankQuestions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
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
        format: q.questionFormat,
        question: q.question,
        explanation: q.explanation,
        points: q.points,
        data: {
          options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : [],
          correctAnswer: q.correctAnswer ? (typeof q.correctAnswer === 'string' ? JSON.parse(q.correctAnswer) : q.correctAnswer) : {},
          matrixData: q.matrixData,
          dragDropData: q.dragDropData,
          trendTabs: q.trendTabs,
          bowtieData: q.bowtieData,
          clozeData: q.clozeData,
          rankingData: q.rankingData,
          highlightData: q.highlightData,
          selectNCount: q.selectNCount,
        },
      })),
    });
  } catch (error: any) {
    console.error('Get questions error:', error);
    return NextResponse.json(
      { message: 'Failed to get questions', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const db = getDatabase();
    const courseId = parseInt(params.courseId);
    const { questions: questionsData } = await request.json();

    if (!Array.isArray(questionsData) || questionsData.length === 0) {
      return NextResponse.json(
        { message: 'Questions array is required' },
        { status: 400 }
      );
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
          questionFormat: q.format || 'multiple_choice',
          questionType: q.format || 'multiple_choice',
          question: q.question || '',
          explanation: q.explanation || null,
          points: q.points || 1,
          options: q.data?.options ? JSON.stringify(q.data.options) : '[]',
          correctAnswer: q.data?.correctAnswer ? JSON.stringify(q.data.correctAnswer) : '{}',
          matrixData: q.data?.matrixData || null,
          dragDropData: q.data?.dragDropData || null,
          trendTabs: q.data?.trendTabs || null,
          bowtieData: q.data?.bowtieData || null,
          clozeData: q.data?.clozeData || null,
          rankingData: q.data?.rankingData || null,
          highlightData: q.data?.highlightData || null,
          selectNCount: q.data?.selectNCount || null,
        }))
      )
      .returning();

    return NextResponse.json({
      message: 'Questions created successfully',
      questions: insertedQuestions.map((q: any) => ({
        id: q.id.toString(),
        format: q.questionFormat,
        question: q.question,
        explanation: q.explanation,
        points: q.points,
        data: {
          options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : [],
          correctAnswer: q.correctAnswer ? (typeof q.correctAnswer === 'string' ? JSON.parse(q.correctAnswer) : q.correctAnswer) : {},
          matrixData: q.matrixData,
          dragDropData: q.dragDropData,
          trendTabs: q.trendTabs,
          bowtieData: q.bowtieData,
          clozeData: q.clozeData,
          rankingData: q.rankingData,
          highlightData: q.highlightData,
          selectNCount: q.selectNCount,
        },
      })),
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create questions error:', error);
    return NextResponse.json(
      { message: 'Failed to create questions', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
