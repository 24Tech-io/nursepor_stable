import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { textbookProgressSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { textbooks, textbookPurchases, textbookReadingProgress } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET - Get reading progress
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'student') {
      return NextResponse.json({ message: 'Student access required' }, { status: 403 });
    }

    const textbookId = parseInt(params.id);
    if (isNaN(textbookId)) {
      return NextResponse.json({ message: 'Invalid textbook ID' }, { status: 400 });
    }

    const db = await getDatabaseWithRetry();

    // Verify purchase
    const [purchase] = await db
      .select()
      .from(textbookPurchases)
      .where(
        and(
          eq(textbookPurchases.studentId, decoded.id),
          eq(textbookPurchases.textbookId, textbookId),
          eq(textbookPurchases.status, 'completed')
        )
      )
      .limit(1);

    if (!purchase) {
      return NextResponse.json({ message: 'Textbook not purchased' }, { status: 403 });
    }

    // Get progress
    const [progress] = await db
      .select()
      .from(textbookReadingProgress)
      .where(
        and(
          eq(textbookReadingProgress.studentId, decoded.id),
          eq(textbookReadingProgress.textbookId, textbookId)
        )
      )
      .limit(1);

    return NextResponse.json({ progress: progress || null });
  } catch (error: any) {
    logger.error('Get progress error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch progress', error: error.message },
      { status: 500 }
    );
  }
}

// POST - Update reading progress
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'student') {
      return NextResponse.json({ message: 'Student access required' }, { status: 403 });
    }

    const textbookId = parseInt(params.id);
    if (isNaN(textbookId)) {
      return NextResponse.json({ message: 'Invalid textbook ID' }, { status: 400 });
    }

    // Validate request body
    const bodyValidation = await extractAndValidate(request, textbookProgressSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const { currentPage, totalPagesRead } = bodyValidation.data;

    const db = await getDatabaseWithRetry();

    // Verify purchase
    const [purchase] = await db
      .select()
      .from(textbookPurchases)
      .where(
        and(
          eq(textbookPurchases.studentId, decoded.id),
          eq(textbookPurchases.textbookId, textbookId),
          eq(textbookPurchases.status, 'completed')
        )
      )
      .limit(1);

    if (!purchase) {
      return NextResponse.json({ message: 'Textbook not purchased' }, { status: 403 });
    }

    // Get textbook to check total pages
    const [textbook] = await db
      .select()
      .from(textbooks)
      .where(eq(textbooks.id, textbookId))
      .limit(1);

    if (!textbook) {
      return NextResponse.json({ message: 'Textbook not found' }, { status: 404 });
    }

    // Check if completed
    const isCompleted = textbook.totalPages && currentPage >= textbook.totalPages;

    // Upsert progress
    const [progress] = await db
      .insert(textbookReadingProgress)
      .values({
        studentId: decoded.id,
        textbookId,
        currentPage,
        totalPagesRead: totalPagesRead || currentPage,
        lastAccessedAt: new Date(),
        completedAt: isCompleted ? new Date() : null,
      })
      .onConflictDoUpdate({
        target: [textbookReadingProgress.studentId, textbookReadingProgress.textbookId],
        set: {
          currentPage,
          totalPagesRead: totalPagesRead || currentPage,
          lastAccessedAt: new Date(),
          completedAt: isCompleted ? new Date() : null,
        },
      })
      .returning();

    return NextResponse.json({ progress });
  } catch (error: any) {
    logger.error('Update progress error:', error);
    return NextResponse.json(
      { message: 'Failed to update progress', error: error.message },
      { status: 500 }
    );
  }
}

