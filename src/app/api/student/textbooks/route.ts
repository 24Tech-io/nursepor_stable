import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, verifyAuth } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { textbooks, textbookPurchases, courses } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET - List available textbooks with purchase status
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request, { requiredRole: 'student' });
    if (!auth.isAuthorized) {
      // For textbooks, we might want to allow public viewing of catalog?
      // But preserving existing logic which restricted it to students.
      return auth.response;
    }
    const { user: decoded } = auth;

    const studentId = decoded.id;
    const db = await getDatabaseWithRetry();

    // Get all published textbooks
    const allTextbooks = await db
      .select({
        id: textbooks.id,
        title: textbooks.title,
        author: textbooks.author,
        description: textbooks.description,
        isbn: textbooks.isbn,
        price: textbooks.price,
        currency: textbooks.currency,
        thumbnail: textbooks.thumbnail,
        courseId: textbooks.courseId,
        courseTitle: courses.title,
        status: textbooks.status,
        totalPages: textbooks.totalPages,
        createdAt: textbooks.createdAt,
      })
      .from(textbooks)
      .leftJoin(courses, eq(textbooks.courseId, courses.id))
      .where(eq(textbooks.status, 'published'))
      .orderBy(desc(textbooks.createdAt));

    // Get student's purchases
    const purchases = await db
      .select()
      .from(textbookPurchases)
      .where(
        and(
          eq(textbookPurchases.studentId, studentId),
          eq(textbookPurchases.status, 'completed')
        )
      );

    const purchasedTextbookIds = new Set(purchases.map(p => p.textbookId));

    // Add purchase status to each textbook
    const textbooksWithStatus = allTextbooks.map(tb => ({
      ...tb,
      isPurchased: purchasedTextbookIds.has(tb.id),
      purchaseDate: purchases.find(p => p.textbookId === tb.id)?.purchasedAt || null,
    }));

    return NextResponse.json({ textbooks: textbooksWithStatus });
  } catch (error: any) {
    logger.error('Get textbooks error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch textbooks', error: error.message },
      { status: 500 }
    );
  }
}

