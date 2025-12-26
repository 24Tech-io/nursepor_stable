import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { createQBankTestSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { 
  questionBanks, 
  qbankTests,
  studentProgress
} from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

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

    const decoded = await verifyToken(token);

    if (!decoded || !decoded.id) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      );
    }

    const db = await getDatabaseWithRetry();
    const courseIdNum = parseInt(params.courseId);

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
        tests: [],
        pendingCount: 0,
        completedCount: 0,
      });
    }

    const qbankId = qbank[0].id;

    // Get all tests for this user and question bank
    const tests = await db
      .select()
      .from(qbankTests)
      .where(
        and(
          eq(qbankTests.questionBankId, qbankId),
          eq(qbankTests.userId, decoded.id)
        )
      )
      .orderBy(desc(qbankTests.createdAt));

    const pendingTests = tests.filter(t => t.status === 'pending' || t.status === 'in_progress');
    const completedTests = tests.filter(t => t.status === 'completed');

    return NextResponse.json({
      tests: tests.map(test => ({
        id: test.id,
        testId: test.testId,
        title: test.title,
        mode: test.mode,
        testType: test.testType,
        totalQuestions: test.totalQuestions,
        status: test.status,
        score: test.score,
        maxScore: test.maxScore,
        percentage: test.percentage,
        createdAt: test.createdAt,
        startedAt: test.startedAt,
        completedAt: test.completedAt,
      })),
      pendingCount: pendingTests.length,
      completedCount: completedTests.length,
    });
  } catch (error: any) {
    logger.error('Get tests error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
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

    const decoded = await verifyToken(token);

    if (!decoded || !decoded.id) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Validate request body
    const bodyValidation = await extractAndValidate(request, createQBankTestSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const body = bodyValidation.data;
    const db = await getDatabaseWithRetry();
    const courseIdNum = parseInt(params.courseId);

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
      return NextResponse.json(
        { message: 'Question bank not found' },
        { status: 404 }
      );
    }

    const qbankId = qbank[0].id;
    const testId = `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create test
    const [newTest] = await db
      .insert(qbankTests)
      .values({
        questionBankId: qbankId,
        userId: decoded.id,
        testId,
        title: body.title || null,
        mode: body.mode || 'tutorial',
        testType: body.testType || 'mixed',
        organization: body.organization || 'subject',
        questionIds: JSON.stringify(body.questionIds || []),
        totalQuestions: body.questionIds?.length || 0,
        timeLimit: body.timeLimit || null,
        status: 'pending',
      })
      .returning();

    return NextResponse.json({
      test: newTest,
      message: 'Test created successfully',
    });
  } catch (error: any) {
    logger.error('Create test error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

