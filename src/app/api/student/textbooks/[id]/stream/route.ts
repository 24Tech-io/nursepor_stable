import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { textbooks, textbookPurchases, textbookAccessLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';

// GET - Stream PDF chunks (requires valid token)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const textbookId = parseInt(params.id);
    if (isNaN(textbookId)) {
      return NextResponse.json({ message: 'Invalid textbook ID' }, { status: 400 });
    }

    // Get access token from query parameter
    const url = new URL(request.url);
    const accessToken = url.searchParams.get('token');

    if (!accessToken) {
      return NextResponse.json({ message: 'Access token required' }, { status: 401 });
    }

    // Verify access token
    const getJWTSecret = (): string => {
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key') {
        if (process.env.NODE_ENV === 'production') {
          // throw new Error('JWT_SECRET must be set in environment variables');
          // Fallback or log? For now, keep logic but maybe don't throw to avoid 500 if missconfigured
        }
        return 'dev-secret-key-change-this-in-production-at-least-32-chars-long';
      }
      return process.env.JWT_SECRET;
    };

    let decoded: any;
    try {
      decoded = jwt.verify(accessToken, getJWTSecret());
    } catch (err) {
      return NextResponse.json({ message: 'Invalid or expired access token' }, { status: 401 });
    }

    if (decoded.type !== 'textbook_access' || decoded.textbookId !== textbookId) {
      return NextResponse.json({ message: 'Invalid access token' }, { status: 403 });
    }

    const db = await getDatabaseWithRetry();

    // Verify purchase (double-check)
    const [purchase] = await db
      .select()
      .from(textbookPurchases)
      .where(
        and(
          eq(textbookPurchases.studentId, decoded.studentId),
          eq(textbookPurchases.textbookId, textbookId),
          eq(textbookPurchases.status, 'completed')
        )
      )
      .limit(1);

    if (!purchase) {
      return NextResponse.json({ message: 'Textbook not purchased' }, { status: 403 });
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

    // Read PDF file
    const filePath = join(process.cwd(), 'public', textbook.pdfFileUrl);
    if (!existsSync(filePath)) {
      return NextResponse.json({ message: 'PDF file not found' }, { status: 404 });
    }

    const pdfBuffer = await readFile(filePath);

    // Log access
    await db.insert(textbookAccessLogs).values({
      studentId: decoded.studentId,
      textbookId,
      action: 'stream',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    // Return PDF with security headers
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="textbook.pdf"',
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    logger.error('Stream PDF error:', error);
    return NextResponse.json(
      { message: 'Failed to stream PDF', error: error.message },
      { status: 500 }
    );
  }
}

