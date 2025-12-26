import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { textbooks, courses } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { log } from '@/lib/logger-helper';
import { handleApiError } from '@/lib/api-error';
import { sanitizeString } from '@/lib/security';
import { extractAndValidate } from '@/lib/api-validation';
import { createTextbookSchema } from '@/lib/validation-schemas-extended';

export const dynamic = 'force-dynamic';

// GET - List all textbooks
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value || request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = await getDatabaseWithRetry();
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status');
    const courseId = url.searchParams.get('courseId');

    let query = db
      .select({
        id: textbooks.id,
        title: textbooks.title,
        author: textbooks.author,
        description: textbooks.description,
        isbn: textbooks.isbn,
        price: textbooks.price,
        currency: textbooks.currency,
        pdfFileUrl: textbooks.pdfFileUrl,
        thumbnail: textbooks.thumbnail,
        courseId: textbooks.courseId,
        courseTitle: courses.title,
        status: textbooks.status,
        totalPages: textbooks.totalPages,
        fileSize: textbooks.fileSize,
        createdAt: textbooks.createdAt,
        updatedAt: textbooks.updatedAt,
      })
      .from(textbooks)
      .leftJoin(courses, eq(textbooks.courseId, courses.id))
      .orderBy(desc(textbooks.createdAt));

    const conditions = [];
    if (statusFilter) {
      conditions.push(eq(textbooks.status, statusFilter));
    }
    if (courseId) {
      conditions.push(eq(textbooks.courseId, parseInt(courseId)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const allTextbooks = await query;
    return NextResponse.json({ textbooks: allTextbooks });
  } catch (error: any) {
    log.error('Get textbooks error', error);
    return handleApiError(error, request.nextUrl.pathname);
  }
}

// POST - Create new textbook
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value || request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    // Validate request body
    const bodyValidation = await extractAndValidate(request, createTextbookSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const body = bodyValidation.data;
    const { title, author, description, isbn, price, currency, pdfFileUrl, thumbnail, courseId, status, totalPages, fileSize } = body;

    // Sanitize inputs
    const sanitizedTitle = sanitizeString(title, 255);
    const sanitizedAuthor = author ? sanitizeString(author, 255) : null;
    const sanitizedDescription = description ? sanitizeString(description, 2000) : null;
    const sanitizedIsbn = isbn ? sanitizeString(isbn, 20) : null;
    const sanitizedPdfFileUrl = sanitizeString(pdfFileUrl, 500);
    const sanitizedThumbnail = thumbnail ? sanitizeString(thumbnail, 500) : null;

    const db = await getDatabaseWithRetry();
    
    const [newTextbook] = await db
      .insert(textbooks)
      .values({
        title: sanitizedTitle,
        author: sanitizedAuthor,
        description: sanitizedDescription,
        isbn: sanitizedIsbn,
        price: price || 0,
        currency: currency || 'USD',
        pdfFileUrl: sanitizedPdfFileUrl,
        thumbnail: sanitizedThumbnail,
        courseId: courseId ? parseInt(String(courseId)) : null,
        status: status || 'draft',
        totalPages: totalPages || null,
        fileSize: fileSize || null,
      })
      .returning();

    log.info('Textbook created', { textbookId: newTextbook.id, title: sanitizedTitle });

    return NextResponse.json({ textbook: newTextbook }, { status: 201 });
  } catch (error: any) {
    log.error('Create textbook error', error);
    return handleApiError(error, request.nextUrl.pathname);
  }
}

