import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { qbankQuestions, questionBanks } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

// Force dynamic rendering - this route uses request.url
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // Parse query parameters for pagination
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        // Fetch real questions from database
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
                testType: qbankQuestions.testType,
                difficulty: qbankQuestions.difficulty,
                points: qbankQuestions.points,
                createdAt: qbankQuestions.createdAt,
            })
            .from(qbankQuestions)
            .orderBy(desc(qbankQuestions.createdAt))
            .limit(limit)
            .offset(offset);

        // Transform to frontend format
        const formattedQuestions = questions.map((q: any) => ({
            id: `Q-${q.id}`,
            stem: q.question.substring(0, 100) + '...',
            category: q.testType === 'ngn' ? 'ngn' : 'classic',
            type: q.questionType,
            label: getQuestionTypeLabel(q.questionType),
            fullQuestion: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            subject: q.subject,
            difficulty: q.difficulty,
        }));

        return NextResponse.json({
            questions: formattedQuestions,
            total: questions.length,
            limit,
            offset
        });
    } catch (error) {
        console.error('Get qbank error:', error);
        return NextResponse.json({
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        }, { status: 500 });
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
    };
    return labels[type] || type;
}
