import { db } from '@/lib/db';
import { qbankQuestions, qbankEnrollments, qbankQuestionStatistics } from '@/lib/db/schema';
import { eq, and, inArray, notExists, exists, sql } from 'drizzle-orm';

export interface QBankFilterOptions {
    qbankId: number;
    studentId: number;
    subjects?: string[];
    systems?: string[];
    clientNeeds?: string[];
    topics?: string[];
    difficulty?: string;
    mode?: string;
    count: number;
}

export async function fetchFilteredQuestions(options: QBankFilterOptions, database = db) {
    const { qbankId, studentId, subjects, systems, clientNeeds, topics, difficulty, mode, count } = options;

    const conditions = [eq(qbankQuestions.questionBankId, qbankId)];

    if (subjects && subjects.length > 0) {
        conditions.push(inArray(qbankQuestions.subject, subjects));
    }

    if (systems && systems.length > 0) {
        conditions.push(inArray(qbankQuestions.lesson, systems));
    }

    if (clientNeeds && clientNeeds.length > 0) {
        conditions.push(inArray(qbankQuestions.clientNeedArea, clientNeeds));
    }

    if (topics && topics.length > 0) {
        conditions.push(inArray(qbankQuestions.subcategory, topics));
    }

    if (difficulty && difficulty !== 'mixed') {
        conditions.push(eq(qbankQuestions.difficulty, difficulty));
    }

    if (mode === 'unused') {
        conditions.push(
            notExists(
                database.select()
                    .from(qbankQuestionStatistics)
                    .where(
                        and(
                            eq(qbankQuestionStatistics.userId, studentId),
                            eq(qbankQuestionStatistics.questionId, qbankQuestions.id),
                            sql`${qbankQuestionStatistics.timesAttempted} > 0`
                        )
                    )
            )
        );
    } else if (mode === 'incorrect') {
        conditions.push(
            exists(
                database.select()
                    .from(qbankQuestionStatistics)
                    .where(
                        and(
                            eq(qbankQuestionStatistics.userId, studentId),
                            eq(qbankQuestionStatistics.questionId, qbankQuestions.id), // Fixed join condition
                            sql`${qbankQuestionStatistics.timesIncorrect} > 0` // Fixed column access
                        )
                    )
            )
        );
    }

    const allQuestions = await database
        .select() // Select all columns
        .from(qbankQuestions)
        .where(and(...conditions));

    // Shuffle and take count
    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, Math.min(count, allQuestions.length));

    return { questions: selectedQuestions, total: allQuestions.length };
}
