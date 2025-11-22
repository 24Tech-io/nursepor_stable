import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { 
  questionBanks, 
  qbankQuestions,
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
    const { searchParams } = new URL(request.url);

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
        questions: [],
        filters: {
          subjects: [],
          lessons: [],
          clientNeedAreas: [],
          subcategories: [],
          questionTypes: [],
        },
      });
    }

    const qbankId = qbank[0].id;

    // Get all questions for filtering
    const allQuestions = await db
      .select()
      .from(qbankQuestions)
      .where(eq(qbankQuestions.questionBankId, qbankId));

    // Extract unique filter values
    const subjects = [...new Set(allQuestions.map(q => q.subject).filter(Boolean))];
    const lessons = [...new Set(allQuestions.map(q => q.lesson).filter(Boolean))];
    const clientNeedAreas = [...new Set(allQuestions.map(q => q.clientNeedArea).filter(Boolean))];
    const subcategories = [...new Set(allQuestions.map(q => q.subcategory).filter(Boolean))];
    const questionTypes = [...new Set(allQuestions.map(q => q.questionType).filter(Boolean))];

    // Apply filters from query params
    const filters: any[] = [eq(qbankQuestions.questionBankId, qbankId)];
    
    const testType = searchParams.get('testType');
    if (testType && testType !== 'mixed') {
      filters.push(eq(qbankQuestions.testType, testType));
    }

    const subject = searchParams.get('subject');
    if (subject) {
      filters.push(eq(qbankQuestions.subject, subject));
    }

    const lesson = searchParams.get('lesson');
    if (lesson) {
      filters.push(eq(qbankQuestions.lesson, lesson));
    }

    const clientNeedArea = searchParams.get('clientNeedArea');
    if (clientNeedArea) {
      filters.push(eq(qbankQuestions.clientNeedArea, clientNeedArea));
    }

    const subcategory = searchParams.get('subcategory');
    if (subcategory) {
      filters.push(eq(qbankQuestions.subcategory, subcategory));
    }

    const questionType = searchParams.get('questionType');
    if (questionType) {
      filters.push(eq(qbankQuestions.questionType, questionType));
    }

    // Get filtered questions
    const questions = await db
      .select({
        id: qbankQuestions.id,
        question: qbankQuestions.question,
        questionType: qbankQuestions.questionType,
        testType: qbankQuestions.testType,
        subject: qbankQuestions.subject,
        lesson: qbankQuestions.lesson,
        clientNeedArea: qbankQuestions.clientNeedArea,
        subcategory: qbankQuestions.subcategory,
      })
      .from(qbankQuestions)
      .where(and(...filters));

    return NextResponse.json({
      questions: questions.map(q => ({
        id: q.id,
        question: q.question,
        questionType: q.questionType,
        testType: q.testType,
        subject: q.subject,
        lesson: q.lesson,
        clientNeedArea: q.clientNeedArea,
        subcategory: q.subcategory,
      })),
      filters: {
        subjects,
        lessons,
        clientNeedAreas,
        subcategories,
        questionTypes,
      },
      totalCount: questions.length,
    });
  } catch (error: any) {
    console.error('Get questions error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

