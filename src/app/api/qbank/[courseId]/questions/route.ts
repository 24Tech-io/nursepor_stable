import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { verifyAuth } from '@/lib/auth-helpers';
import { 
  questionBanks, 
  qbankQuestions, 
  qbankQuestionStatistics,
  qbankMarkedQuestions,
  courseQuestionAssignments 
} from '@/lib/db/schema';
import { eq, and, sql, or } from 'drizzle-orm';

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

    // Verify authentication
    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult.user;

    // Get or create question bank for this course
    let [qbank] = await db
      .select()
      .from(questionBanks)
      .where(eq(questionBanks.courseId, courseId))
      .limit(1);

    if (!qbank) {
      // Create course-specific question bank
      [qbank] = await db
        .insert(questionBanks)
        .values({
          courseId,
          name: `Q-Bank for Course ${courseId}`,
          isActive: true,
        })
        .returning();
    }

    // Get ALL questions for this course:
    // 1. Questions directly in this course's question bank
    // 2. Questions assigned to this course via course_question_assignments
    
    // Get directly assigned questions (from course-specific bank)
    const directQuestions = await db
      .select()
      .from(qbankQuestions)
      .where(eq(qbankQuestions.questionBankId, qbank.id));

    // Get questions assigned through course_question_assignments table
    const assignedQuestionsData = await db
      .select({
        id: qbankQuestions.id,
        questionBankId: qbankQuestions.questionBankId,
        categoryId: qbankQuestions.categoryId,
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
      .from(courseQuestionAssignments)
      .innerJoin(qbankQuestions, eq(courseQuestionAssignments.questionId, qbankQuestions.id))
      .where(eq(courseQuestionAssignments.courseId, courseId));

    // Combine both sources and remove duplicates
    const questionMap = new Map();
    
    // Add direct questions
    directQuestions.forEach(q => questionMap.set(q.id, q));
    
    // Add assigned questions
    assignedQuestionsData.forEach(q => questionMap.set(q.id, q));

    // Convert back to array
    const allQuestions = Array.from(questionMap.values());

    // Get user's statistics for all questions in this question bank
    const userStatistics = await db
      .select()
      .from(qbankQuestionStatistics)
      .where(
        and(
          eq(qbankQuestionStatistics.userId, user.id),
          eq(qbankQuestionStatistics.questionBankId, qbank.id)
        )
      );

    // Get user's marked questions
    const markedQuestions = await db
      .select()
      .from(qbankMarkedQuestions)
      .where(
        and(
          eq(qbankMarkedQuestions.userId, user.id),
          eq(qbankMarkedQuestions.questionBankId, qbank.id)
        )
      );

    // Create maps for quick lookup
    const statsMap = new Map(userStatistics.map(s => [s.questionId, s]));
    const markedMap = new Map(markedQuestions.map(m => [m.questionId, m]));

    // Initialize counts
    const counts = {
      all: { classic: 0, ngn: 0 },
      unused: { classic: 0, ngn: 0 },
      marked: { classic: 0, ngn: 0 },
      incorrect: { classic: 0, ngn: 0 },
      correct_reattempt: { classic: 0, ngn: 0 },
      omitted: { classic: 0, ngn: 0 },
    };

    // Enrich questions with statistics and calculate counts
    const enrichedQuestions = allQuestions.map((q: any) => {
      const stats = statsMap.get(q.id);
      const isMarked = markedMap.has(q.id);
      const isClassic = q.testType === 'classic' || q.testType === 'mixed';
      const isNGN = q.testType === 'ngn' || q.testType === 'mixed';
      
      // Count for 'all'
      if (isClassic) counts.all.classic++;
      if (isNGN) counts.all.ngn++;

      // Count based on statistics
      const timesAttempted = stats?.timesAttempted || 0;
      const timesIncorrect = stats?.timesIncorrect || 0;
      const timesOmitted = stats?.timesOmitted || 0;
      const timesCorrectOnReattempt = stats?.timesCorrectOnReattempt || 0;

      // Unused: never attempted
      if (timesAttempted === 0) {
        if (isClassic) counts.unused.classic++;
        if (isNGN) counts.unused.ngn++;
      }

      // Marked: flagged for review
      if (isMarked) {
        if (isClassic) counts.marked.classic++;
        if (isNGN) counts.marked.ngn++;
      }

      // Incorrect: got wrong at least once
      if (timesIncorrect > 0) {
        if (isClassic) counts.incorrect.classic++;
        if (isNGN) counts.incorrect.ngn++;
      }

      // Correct on reattempt: got wrong first, then right
      if (timesCorrectOnReattempt > 0) {
        if (isClassic) counts.correct_reattempt.classic++;
        if (isNGN) counts.correct_reattempt.ngn++;
      }

      // Omitted: skipped at least once
      if (timesOmitted > 0) {
        if (isClassic) counts.omitted.classic++;
        if (isNGN) counts.omitted.ngn++;
      }

      return {
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
        lesson: q.lesson,
        clientNeedArea: q.clientNeedArea,
        subcategory: q.subcategory,
        difficulty: q.difficulty,
        testType: q.testType,
        data: {
          options: safeJsonParse(q.options, []),
          correctAnswer: safeJsonParse(q.correctAnswer, null),
        },
        statistics: {
          timesAttempted: stats?.timesAttempted || 0,
          timesCorrect: stats?.timesCorrect || 0,
          timesIncorrect: stats?.timesIncorrect || 0,
          timesOmitted: stats?.timesOmitted || 0,
          timesCorrectOnReattempt: stats?.timesCorrectOnReattempt || 0,
          confidenceLevel: stats?.confidenceLevel || null,
          lastAttemptedAt: stats?.lastAttemptedAt || null,
          isMarked,
          isUnused: timesAttempted === 0,
        },
      };
    });

    return NextResponse.json({
      questions: enrichedQuestions,
      counts,
      filters: {
        subjects: [...new Set(allQuestions.map((q: any) => q.subject).filter(Boolean))],
        lessons: [...new Set(allQuestions.map((q: any) => q.lesson).filter(Boolean))],
        clientNeedAreas: [...new Set(allQuestions.map((q: any) => q.clientNeedArea).filter(Boolean))],
        subcategories: [...new Set(allQuestions.map((q: any) => q.subcategory).filter(Boolean))],
        questionTypes: [...new Set(allQuestions.map((q: any) => q.questionType).filter(Boolean))],
      },
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
