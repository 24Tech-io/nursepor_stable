import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { textbooks, textbookPurchases, courses } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET - List available textbooks with purchase status
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('student_token')?.value || request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'student') {
      return NextResponse.json({ message: 'Student access required' }, { status: 403 });
    }

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

