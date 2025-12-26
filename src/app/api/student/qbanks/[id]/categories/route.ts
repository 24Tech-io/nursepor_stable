import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseWithRetry } from '@/lib/db';
import { qbankQuestions, qbankCategories, qbankEnrollments } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * GET /api/student/qbanks/[id]/categories
 * Get all categories for a Q-Bank with question counts and progress
 */
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

        // Verify enrollment
        const enrollment = await db.query.qbankEnrollments.findFirst({
            where: and(
                eq(qbankEnrollments.studentId, decoded.id),
                eq(qbankEnrollments.qbankId, qbankId)
            )
        });

        if (!enrollment) {
            return NextResponse.json({ message: 'Not enrolled in this Q-Bank' }, { status: 403 });
        }

        // Get all categories that have questions in this Q-Bank
        const categoriesWithCounts = await db
            .select({
                id: qbankCategories.id,
                name: qbankCategories.name,
                description: qbankCategories.description,
                color: qbankCategories.color,
                icon: qbankCategories.icon,
                questionCount: sql<number>`cast(count(distinct ${qbankQuestions.id}) as int)`,
            })
            .from(qbankQuestions)
            .innerJoin(qbankCategories, eq(qbankQuestions.categoryId, qbankCategories.id))
            .where(eq(qbankQuestions.questionBankId, qbankId))
            .groupBy(qbankCategories.id, qbankCategories.name, qbankCategories.description, qbankCategories.color, qbankCategories.icon)
            .orderBy(qbankCategories.name);

        return NextResponse.json({
            categories: categoriesWithCounts,
            total: categoriesWithCounts.length
        });

    } catch (error: any) {
        logger.error('Get Q-Bank categories error:', error);
        return NextResponse.json(
            { message: 'Internal server error', error: error?.message },
            { status: 500 }
        );
    }
}
