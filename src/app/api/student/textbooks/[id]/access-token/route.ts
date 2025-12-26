import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { textbooks, textbookPurchases, textbookAccessLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

function getJWTSecret(): string {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in environment variables');
    }
    return 'dev-secret-key-change-this-in-production-at-least-32-chars-long';
  }
  return process.env.JWT_SECRET;
}

// POST - Generate time-limited access token (5 min expiry)
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
      // Log access denied
      await db.insert(textbookAccessLogs).values({
        studentId: decoded.id,
        textbookId,
        action: 'access_denied',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      });

      return NextResponse.json({ message: 'Textbook not purchased' }, { status: 403 });
    }

    // Check if expired
    if (purchase.expiresAt && new Date(purchase.expiresAt) < new Date()) {
      await db.insert(textbookAccessLogs).values({
        studentId: decoded.id,
        textbookId,
        action: 'access_denied',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      });

      return NextResponse.json({ message: 'Purchase has expired' }, { status: 403 });
    }

    // Get textbook
    const [textbook] = await db
      .select()
      .from(textbooks)
      .where(eq(textbooks.id, textbookId))
      .limit(1);

    if (!textbook) {
      return NextResponse.json({ message: 'Textbook not found' }, { status: 404 });
    }

    // Generate access token (5 minutes expiry)
    const accessToken = jwt.sign(
      {
        studentId: decoded.id,
        textbookId,
        type: 'textbook_access',
      },
      getJWTSecret(),
      { expiresIn: '5m' }
    );

    // Log access
    await db.insert(textbookAccessLogs).values({
      studentId: decoded.id,
      textbookId,
      action: 'view',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      accessToken,
      expiresIn: 300, // 5 minutes in seconds
      textbook: {
        id: textbook.id,
        title: textbook.title,
        pdfFileUrl: textbook.pdfFileUrl,
        totalPages: textbook.totalPages,
      },
    });
  } catch (error: any) {
    logger.error('Generate access token error:', error);
    return NextResponse.json(
      { message: 'Failed to generate access token', error: error.message },
      { status: 500 }
    );
  }
}

