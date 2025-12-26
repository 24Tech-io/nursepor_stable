import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { qbankTestAttempts, qbankQuestions } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string; attemptId: string } }
) {
    try {
        const token = request.cookies.get('student_token')?.value || request.cookies.get('token')?.value;
        if (!token) {
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
        }

        const decoded = await verifyToken(token);
        if (!decoded) {
            return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
        }

        const studentId = decoded.id;
        const qbankId = parseInt(params.id);
        const attemptId = parseInt(params.attemptId);

        if (isNaN(qbankId) || isNaN(attemptId)) {
            return NextResponse.json({ message: 'Invalid IDs' }, { status: 400 });
        }

        const db = await getDatabaseWithRetry();

        // Fetch the attempt
        const attempts = await db
            .select()
            .from(qbankTestAttempts)
            .where(
                and(
                    eq(qbankTestAttempts.id, attemptId),
                    eq(qbankTestAttempts.studentId, studentId),
                    eq(qbankTestAttempts.qbankId, qbankId)
                )
            )
            .limit(1);

        if (attempts.length === 0) {
            return NextResponse.json({ message: 'Test session not found' }, { status: 404 });
        }

        const attempt = attempts[0];

        // Parse questionsData to get IDs
        let questionIds: number[] = [];
        if (attempt.questionsData) {
            try {
                const parsed = JSON.parse(attempt.questionsData);
                if (Array.isArray(parsed)) {
                    questionIds = parsed.map((item: any) => item.id);
                }
            } catch (e) {
                console.error("Error parsing questionsData", e);
            }
        }

        if (questionIds.length === 0) {
            return NextResponse.json({ message: 'Test data corrupted (no questions found)' }, { status: 500 });
        }

        // Fetch the actual questions content
        const questions = await db
            .select()
            .from(qbankQuestions)
            .where(inArray(qbankQuestions.id, questionIds));

        // Sort questions to match the order in questionsData (Shuffle order preservation)
        const questionsMap = new Map(questions.map(q => [q.id, q]));
        const orderedQuestions = questionIds.map(id => questionsMap.get(id)).filter(Boolean);

        // Format for frontend
        const safeJsonParse = (value: any, fallback: any = null) => {
            if (!value) return fallback;
            if (typeof value !== 'string') return value;
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        };

        const formattedQuestions = orderedQuestions.map((q: any) => {
            const options = safeJsonParse(q.options, []);
            const formattedOptions = Array.isArray(options)
                ? options.map((opt: any, idx: number) => ({
                    id: opt.id || idx.toString(),
                    text: opt.text || opt || '',
                }))
                : [];

            return {
                id: q.id,
                question: q.question,
                questionType: q.questionType,
                options: formattedOptions,
                // Only send correct answer if tutorial mode? OR send it and hide in frontend.
                // Archer sends it but hides it.
                correctAnswer: safeJsonParse(q.correctAnswer, null),
                explanation: q.explanation,
                difficulty: q.difficulty,
                subject: q.subject,
            };
        });

        return NextResponse.json({
            attempt: {
                id: attempt.id,
                mode: attempt.testMode,
                timeLimit: attempt.timeLimitMinutes,
                startedAt: attempt.startedAt,
                isCompleted: attempt.isCompleted,
                timeSpent: attempt.timeSpentSeconds
            },
            questions: formattedQuestions
        });

    } catch (error: any) {
        console.error('Error fetching test session:', error);
        return NextResponse.json(
            { message: 'Failed to fetch test session', error: error.message },
            { status: 500 }
        );
    }
}
