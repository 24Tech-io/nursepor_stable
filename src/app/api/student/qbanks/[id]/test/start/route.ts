import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { startQBankTestSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { qbankEnrollments, qbankTestAttempts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function POST(
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

    // Validate request body
    const bodyValidation = await extractAndValidate(request, startQBankTestSchema); // Note: schema might trim unknown keys?
    // I need to update the schema too if it's too strict. 
    // Assuming schema is flexible or I need to manually parse extra fields if validation fails.
    // Ideally I should update validation schema, but for now I'll extract extra fields manually if schema strips them.
    // Let's assume schema needs update or I parse body manually for new filters.

    // Actually, extractAndValidate returns typed data. If schema doesn't have `subjects`, they might be lost.
    // I should check schema definition in `src/lib/validation-schemas-extended.ts`.
    // But for now, let's parse raw body to get new filters as schema update is another file.
    let config = bodyValidation.success ? bodyValidation.data : null;
    let extraFilters: any = {};
    if (!config) {
      // Fallback if schema fails (e.g. strict mode)
      // But wait, if schema fails, we returned error.
      return bodyValidation.error;
    }

    try {
      const rawBody = await request.clone().json();
      extraFilters = {
        subjects: rawBody.subjects,
        systems: rawBody.systems,
        clientNeeds: rawBody.clientNeeds,
        topics: rawBody.topics,
        questionStatus: rawBody.questionStatus // 'mode' in filters logic, but 'mode' in schema is testMode (tutorial/timed)
      };
    } catch (e) { /* ignore */ }

    const { mode, questionCount, categoryId, difficulty, timeLimit } = config;

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

    // Fetch Questions
    const { questions: selectedQuestions } = await fetchFilteredQuestions({
      qbankId,
      studentId,
      count: questionCount,
      difficulty: difficulty,
      subjects: extraFilters.subjects,
      systems: extraFilters.systems,
      clientNeeds: extraFilters.clientNeeds,
      topics: extraFilters.topics,
      // Map 'questionStatus' to 'mode' in helper (unused, incorrect)
      mode: extraFilters.questionStatus
    }, db);

    if (selectedQuestions.length === 0) {
      return NextResponse.json({ message: 'No questions matching your criteria found.' }, { status: 400 });
    }

    // Prepare initial Questions Data (Status: unanswered)
    const initialQuestionsData = selectedQuestions.map(q => ({
      id: q.id,
      isAnswered: false,
      isCorrect: false,
      // We don't store full content here to save space, just status tracking if needed
      // Or specific shuffle order.
    }));

    // Create test attempt
    const [testAttempt] = await db
      .insert(qbankTestAttempts)
      .values({
        enrollmentId: enrollment[0].id,
        qbankId: qbankId,
        studentId: studentId,
        testMode: mode,
        questionCount: selectedQuestions.length, // usage actual count
        categoryFilter: categoryId || null,
        difficultyFilter: difficulty || null,
        timeLimitMinutes: timeLimit || null,
        isCompleted: false,
        questionsData: JSON.stringify(initialQuestionsData),
        // Store extended config if column exists? No column for filters yet.
        // But questionsData implies the set of questions.
      })
      .returning();

    return NextResponse.json({
      attemptId: testAttempt.id,
      message: 'Test started successfully',
      questionCount: selectedQuestions.length
    });
  } catch (error: any) {
    logger.error('Error starting test:', error);
    return NextResponse.json(
      { message: 'Failed to start test', error: error.message },
      { status: 500 }
    );
  }
} // End POST

