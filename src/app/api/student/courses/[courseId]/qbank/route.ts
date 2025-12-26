import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { submitQuizSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { courseQuestionAssignments, qbankQuestions, courses } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// GET - Fetch Quiz Bank questions for a course (student view)
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    // Type narrowing: if authResult is a NextResponse, return it directly
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    if (!authResult.user) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const courseId = parseInt(params.courseId);
    const url = new URL(request.url);
    const moduleId = url.searchParams.get('moduleId');

    // Get all assigned questions for this course/module
    let query = db
      .select({
        questionId: qbankQuestions.id,
        question: qbankQuestions.question,
        questionType: qbankQuestions.questionType,
        options: qbankQuestions.options,
        correctAnswer: qbankQuestions.correctAnswer,
        explanation: qbankQuestions.explanation,
        difficulty: qbankQuestions.difficulty,
        points: qbankQuestions.points,
        subject: qbankQuestions.subject,
      })
      .from(courseQuestionAssignments)
      .innerJoin(qbankQuestions, eq(courseQuestionAssignments.questionId, qbankQuestions.id))
      .where(eq(courseQuestionAssignments.courseId, courseId));

    // Filter by module if specified
    if (moduleId) {
      query = query.where(eq(courseQuestionAssignments.moduleId, parseInt(moduleId)));
    }

    const questions = await query;

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

    return NextResponse.json({
      questions: questions.map(q => ({
        id: q.questionId,
        question: q.question,
        type: q.questionType,
        options: safeJsonParse(q.options, []),
        explanation: q.explanation,
        difficulty: q.difficulty,
        points: q.points,
        subject: q.subject,
      })),
      totalQuestions: questions.length,
    });
  } catch (error: any) {
    logger.error('Get student course qbank error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch questions', error: error.message },
      { status: 500 }
    );
  }
}

// POST - Submit Quiz Bank test answers
export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    // Type narrowing: if authResult is a NextResponse, return it directly
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    if (!authResult.user) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const courseId = parseInt(params.courseId);

    // Validate request body
    const bodyValidation = await extractAndValidate(request, submitQuizSchema.extend({
      moduleId: z.number().int().positive().optional(),
    }));
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const { answers, moduleId } = bodyValidation.data;

    // Get all assigned questions with correct answers
    const assignedQuestions = await db
      .select({
        questionId: qbankQuestions.id,
        correctAnswer: qbankQuestions.correctAnswer,
        points: qbankQuestions.points,
      })
      .from(courseQuestionAssignments)
      .innerJoin(qbankQuestions, eq(courseQuestionAssignments.questionId, qbankQuestions.id))
      .where(
        and(
          eq(courseQuestionAssignments.courseId, courseId),
          moduleId ? eq(courseQuestionAssignments.moduleId, moduleId) : undefined
        )
      );

    // Helper to safely parse JSON
    const safeJsonParse = (value: any) => {
      if (!value) return null;
      if (typeof value !== 'string') return value;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    };

    // Grade answers
    let correctCount = 0;
    let totalPoints = 0;
    let earnedPoints = 0;
    const results: any[] = [];

    assignedQuestions.forEach(q => {
      const studentAnswer = answers[q.questionId];
      const correctAnswer = safeJsonParse(q.correctAnswer);

      totalPoints += q.points;

      let isCorrect = false;
      if (Array.isArray(correctAnswer) && Array.isArray(studentAnswer)) {
        // SATA - check if arrays match
        isCorrect = correctAnswer.length === studentAnswer.length &&
          correctAnswer.every((a: any) => studentAnswer.includes(a));
      } else {
        // MCQ - direct comparison
        isCorrect = studentAnswer === correctAnswer;
      }

      if (isCorrect) {
        correctCount++;
        earnedPoints += q.points;
      }

      results.push({
        questionId: q.questionId,
        isCorrect,
        studentAnswer,
        correctAnswer,
      });
    });

    const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    return NextResponse.json({
      score: percentage,
      correctCount,
      totalQuestions: assignedQuestions.length,
      earnedPoints,
      totalPoints,
      results,
      passed: percentage >= 70,
    });
  } catch (error: any) {
    logger.error('Submit qbank test error:', error);
    return NextResponse.json(
      { message: 'Failed to submit test', error: error.message },
      { status: 500 }
    );
  }
}

