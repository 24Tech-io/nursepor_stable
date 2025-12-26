import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { createQuestionSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { questionBanks, qbankQuestions } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

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

// GET - Get all questions in a Q-Bank
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
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

    // Get all questions in this Q-Bank
    const questions = await db
      .select({
        id: qbankQuestions.id,
        question: qbankQuestions.question,
        questionType: qbankQuestions.questionType,
        options: qbankQuestions.options,
        correctAnswer: qbankQuestions.correctAnswer,
        explanation: qbankQuestions.explanation,
        subject: qbankQuestions.subject,
        lesson: qbankQuestions.lesson,
        clientNeedArea: qbankQuestions.clientNeedArea,
        subcategory: qbankQuestions.subcategory,
        testType: qbankQuestions.testType,
        difficulty: qbankQuestions.difficulty,
        points: qbankQuestions.points,
        createdAt: qbankQuestions.createdAt,
        updatedAt: qbankQuestions.updatedAt,
      })
      .from(qbankQuestions)
      .where(eq(qbankQuestions.questionBankId, qbankId))
      .orderBy(desc(qbankQuestions.createdAt));

    // Transform to frontend format
    const formattedQuestions = questions.map((q: any) => ({
      id: q.id,
      stem: q.question,
      category: q.testType === 'ngn' ? 'ngn' : 'classic',
      type: q.questionType,
      label: getQuestionTypeLabel(q.questionType),
      fullQuestion: q.question,
      options: safeJsonParse(q.options, []),
      correctAnswer: safeJsonParse(q.correctAnswer, null),
      explanation: q.explanation,
      subject: q.subject,
      lesson: q.lesson,
      clientNeedArea: q.clientNeedArea,
      subcategory: q.subcategory,
      difficulty: q.difficulty,
      points: q.points,
      testType: q.testType,
    }));

    return NextResponse.json({ questions: formattedQuestions, total: formattedQuestions.length });
  } catch (error: any) {
    logger.error('Get Q-Bank questions error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch questions', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

// POST - Add question to Q-Bank
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
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

    // Validate request body
    const bodyValidation = await extractAndValidate(request, createQuestionSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const questionData = bodyValidation.data;

    // Insert question
    const [newQuestion] = await db
      .insert(qbankQuestions)
      .values({
        questionBankId: qbankId,
        question: questionData.question || questionData.stem || '',
        questionType: questionData.questionType || questionData.type || 'multiple_choice',
        // Serialize complex data into options if applicable
        options: (() => {
          const type = questionData.questionType || questionData.type;
          if (type === 'bowtie' && questionData.bowtieData) {
            return JSON.stringify(questionData.bowtieData);
          }
          if ((type === 'casestudy' || type === 'ngn_case_study') && questionData.stepQuestions) {
            return JSON.stringify({
              title: questionData.caseTitle,
              description: questionData.caseDescription,
              data: questionData.caseData,
              steps: questionData.stepQuestions
            });
          }
          if (type === 'ranking' && questionData.rankingData) {
            return JSON.stringify(questionData.rankingData);
          }
          if ((type === 'matrix' || type === 'matrix_multiple_response') && questionData.matrixData) {
            return JSON.stringify(questionData.matrixData);
          }
          if ((type === 'drag_drop' || type === 'extended_drag_drop') && questionData.dragDropData) {
            return JSON.stringify(questionData.dragDropData);
          }
          if ((type === 'calculation' || type === 'dosage_calculation') && questionData.dosageData) {
            return JSON.stringify(questionData.dosageData);
          }
          if ((type === 'highlight' || type === 'highlight_text') && questionData.highlightData) {
            return JSON.stringify(questionData.highlightData);
          }
          if ((type === 'trend' || type === 'trend_item') && questionData.options) {
            // Trend item bundles everything into options object already, so just stringify it
            return typeof questionData.options === 'string' ? questionData.options : JSON.stringify(questionData.options);
          }
          if ((type === 'select_n') && questionData.selectNCount) {
            // For Select N, we need to preserve the N count and the options
            return JSON.stringify({
              selectNCount: questionData.selectNCount,
              options: questionData.options || []
            });
          }
          // Fallback
          return typeof questionData.options === 'string' ? questionData.options : JSON.stringify(questionData.options || []);
        })(),
        correctAnswer: typeof questionData.correctAnswer === 'string' ? questionData.correctAnswer : JSON.stringify(questionData.correctAnswer || {}),
        explanation: questionData.explanation || null,
        subject: questionData.subject || null,
        lesson: questionData.lesson || null,
        clientNeedArea: questionData.clientNeedArea || null,
        subcategory: questionData.subcategory || null,
        testType: questionData.testType || questionData.category === 'ngn' ? 'ngn' : 'classic',
        difficulty: questionData.difficulty || 'medium',
        points: questionData.points || 1,
      })
      .returning();

    return NextResponse.json({ question: newQuestion }, { status: 201 });
  } catch (error: any) {
    logger.error('Add question error:', error);
    return NextResponse.json(
      { message: 'Failed to add question', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

function getQuestionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'multiple_choice': 'Single Best Answer',
    'sata': 'SATA (Classic)',
    'ngn_case_study': 'Case Study',
    'unfolding_ngn': 'Unfolding NGN',
    'bowtie': 'Bow-Tie',
    'casestudy': 'Case Study',
    'matrix': 'Matrix',
    'trend': 'Trend',
    'standard': 'Single Best Answer',
    'sata_classic': 'SATA (Classic)',
    'calculation': 'Dosage Calculation',
    'dosage_calculation': 'Dosage Calculation',
    'matrix': 'Matrix / Grid',
    'matrix_multiple_response': 'Matrix / Grid',
    'drag_drop': 'Extended Drag & Drop',
    'extended_drag_drop': 'Extended Drag & Drop',
    'highlight': 'Highlight Text',
    'highlight_text': 'Highlight Text',
    'trend': 'Trend (Clinical Data)',
    'trend_item': 'Trend (Clinical Data)',
    'cloze': 'Cloze (Drop-Down)',
    'select_n': 'Select N',
    'ranking': 'Ordered Response',
    'ordering': 'Ordered Response',
  };
  return labels[type] || type;
}
