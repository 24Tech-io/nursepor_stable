import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { questionBanks, qbankQuestions } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = getDatabase();
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '1000');

    // If we just need count for dashboard, return early with optimized count query
    if (limit === 0 || url.searchParams.get('countOnly') === 'true') {
      const [result] = await db
        .select({ count: sql<number>`COUNT(${qbankQuestions.id})` })
        .from(qbankQuestions)
        .leftJoin(questionBanks, eq(qbankQuestions.questionBankId, questionBanks.id));

      return NextResponse.json({
        questions: [],
        totalCount: Number(result?.count || 0),
      });
    }

    // Get total count for response
    const [countResult] = await db
      .select({ count: sql<number>`COUNT(${qbankQuestions.id})` })
      .from(qbankQuestions)
      .leftJoin(questionBanks, eq(qbankQuestions.questionBankId, questionBanks.id));

    // Otherwise, fetch questions with limit (use LEFT JOIN to include all questions)
    const questions = await db
      .select({
        id: qbankQuestions.id,
        questionFormat: qbankQuestions.questionFormat,
        question: qbankQuestions.question,
        explanation: qbankQuestions.explanation,
        points: qbankQuestions.points,
        options: qbankQuestions.options,
        correctAnswer: qbankQuestions.correctAnswer,
      })
      .from(qbankQuestions)
      .leftJoin(questionBanks, eq(qbankQuestions.questionBankId, questionBanks.id))
      .limit(limit);

    return NextResponse.json({
      questions: questions.map((q: any) => ({
        id: q.id.toString(),
        format: q.questionFormat,
        question: q.question,
        explanation: q.explanation,
        points: q.points,
        data: {
          options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : [],
          correctAnswer: q.correctAnswer ? (typeof q.correctAnswer === 'string' ? JSON.parse(q.correctAnswer) : q.correctAnswer) : {},
        },
      })),
      totalCount: Number(countResult?.count || 0),
    });
  } catch (error: any) {
    console.error('Get Q-bank questions error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch questions', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = getDatabase();
    const body = await request.json();

    console.log('POST /api/qbank - Received data:', JSON.stringify(body, null, 2));

    // Support both single question and array of questions
    const questionsData = Array.isArray(body) ? body : [body];

    if (questionsData.length === 0) {
      return NextResponse.json(
        { message: 'At least one question is required' },
        { status: 400 }
      );
    }

    // Get or create a general Q-Bank (courseId can be null for standalone questions)
    let [qbank] = await db
      .select()
      .from(questionBanks)
      .where(sql`${questionBanks.courseId} IS NULL`)
      .limit(1);

    if (!qbank) {
      console.log('Creating general Q-Bank...');
      [qbank] = await db
        .insert(questionBanks)
        .values({
          courseId: null,
          name: 'General Q-Bank',
        })
        .returning();
      console.log('General Q-Bank created:', qbank.id);
    }

    // Insert questions
    console.log('Inserting questions into Q-Bank:', qbank.id);
    const insertedQuestions = await db
      .insert(qbankQuestions)
      .values(
        questionsData.map((q: any) => ({
          questionBankId: qbank.id,
          questionFormat: q.format || q.questionFormat || 'standard',
          questionType: q.type || q.questionType || 'standard',
          question: q.question || q.questionStem || '',
          explanation: q.explanation || q.rationale || null,
          points: q.points || 1,
          options: q.options ? (typeof q.options === 'string' ? q.options : JSON.stringify(q.options)) : '[]',
          correctAnswer: q.correctAnswer ? (typeof q.correctAnswer === 'string' ? q.correctAnswer : JSON.stringify(q.correctAnswer)) : '{}',
          matrixData: q.matrixData || null,
          dragDropData: q.dragDropData || null,
          trendTabs: q.trendTabs || null,
          bowtieData: q.bowtieData || null,
          clozeData: q.clozeData || null,
          rankingData: q.rankingData || null,
          highlightData: q.highlightData || null,
          selectNCount: q.selectNCount || null,
        }))
      )
      .returning();

    console.log('Questions inserted:', insertedQuestions.length);

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
        },
      })),
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create Q-bank questions error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      {
        message: 'Failed to create questions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
