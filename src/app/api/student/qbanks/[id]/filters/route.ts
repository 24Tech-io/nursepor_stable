
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { qbankQuestions, quizQbankQuestions } from '@/lib/db/schema';
import { eq, and, isNotNull, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
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

        const qbankId = parseInt(params.id);
        if (isNaN(qbankId)) {
            return NextResponse.json({ message: 'Invalid Q-Bank ID' }, { status: 400 });
        }

        const db = await getDatabaseWithRetry();

        // Fetch distinct Subjects
        const subjects = await db
            .selectDistinct({ value: qbankQuestions.subject })
            .from(qbankQuestions)
            .where(
                and(
                    eq(qbankQuestions.questionBankId, qbankId),
                    isNotNull(qbankQuestions.subject)
                )
            )
            .orderBy(qbankQuestions.subject);

        // Fetch distinct Systems (Lessons)
        const systems = await db
            .selectDistinct({ value: qbankQuestions.lesson })
            .from(qbankQuestions)
            .where(
                and(
                    eq(qbankQuestions.questionBankId, qbankId),
                    isNotNull(qbankQuestions.lesson)
                )
            )
            .orderBy(qbankQuestions.lesson);

        // Fetch distinct Client Needs
        const clientNeeds = await db
            .selectDistinct({ value: qbankQuestions.clientNeedArea })
            .from(qbankQuestions)
            .where(
                and(
                    eq(qbankQuestions.questionBankId, qbankId),
                    isNotNull(qbankQuestions.clientNeedArea)
                )
            )
            .orderBy(qbankQuestions.clientNeedArea);

        // Fetch distinct Topics (Subcategories)
        const topics = await db
            .selectDistinct({ value: qbankQuestions.subcategory })
            .from(qbankQuestions)
            .where(
                and(
                    eq(qbankQuestions.questionBankId, qbankId),
                    isNotNull(qbankQuestions.subcategory)
                )
            )
            .orderBy(qbankQuestions.subcategory);

        return NextResponse.json({
            subjects: subjects.map(s => s.value).filter(Boolean),
            systems: systems.map(s => s.value).filter(Boolean),
            clientNeeds: clientNeeds.map(s => s.value).filter(Boolean),
            topics: topics.map(s => s.value).filter(Boolean),
        });

    } catch (error: any) {
        console.error('Error fetching Q-Bank filters:', error);
        return NextResponse.json(
            { message: 'Failed to fetch filters', error: error.message },
            { status: 500 }
        );
    }
}
