import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { textbooks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { log } from '@/lib/logger-helper';
import { handleApiError } from '@/lib/api-error';
import { sanitizeString } from '@/lib/security';
import { extractAndValidate } from '@/lib/api-validation';
import { updateTextbookSchema } from '@/lib/validation-schemas-extended';

export const dynamic = 'force-dynamic';

// GET - Get textbook by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('adminToken')?.value || request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const sanitizedId = sanitizeString(params.id, 20);
    const textbookId = parseInt(sanitizedId);
    if (isNaN(textbookId) || textbookId <= 0) {
      return NextResponse.json({ message: 'Invalid textbook ID' }, { status: 400 });
    }

    const db = await getDatabaseWithRetry();
    const [textbook] = await db
      .select()
      .from(textbooks)
      .where(eq(textbooks.id, textbookId))
      .limit(1);

    if (!textbook) {
      return NextResponse.json({ message: 'Textbook not found' }, { status: 404 });
    }

    return NextResponse.json({ textbook });
  } catch (error: any) {
    log.error('Get textbook error', error);
    return handleApiError(error, request.nextUrl.pathname);
  }
}

// PUT - Update textbook
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('adminToken')?.value || request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const sanitizedId = sanitizeString(params.id, 20);
    const textbookId = parseInt(sanitizedId);
    if (isNaN(textbookId) || textbookId <= 0) {
      return NextResponse.json({ message: 'Invalid textbook ID' }, { status: 400 });
    }

    // Validate request body
    const bodyValidation = await extractAndValidate(request, updateTextbookSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const body = bodyValidation.data;
    const { title, author, description, isbn, price, currency, pdfFileUrl, thumbnail, courseId, status, totalPages, fileSize } = body;

    const db = await getDatabaseWithRetry();

    // Check if textbook exists
    const [existing] = await db
      .select()
      .from(textbooks)
      .where(eq(textbooks.id, textbookId))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ message: 'Textbook not found' }, { status: 404 });
    }

    // Sanitize and build update object
    const updateData: any = { updatedAt: new Date() };
    if (title !== undefined) updateData.title = sanitizeString(title, 255);
    if (author !== undefined) updateData.author = author ? sanitizeString(author, 255) : null;
    if (description !== undefined) updateData.description = description ? sanitizeString(description, 2000) : null;
    if (isbn !== undefined) updateData.isbn = isbn ? sanitizeString(isbn, 20) : null;
    if (price !== undefined) updateData.price = price;
    if (currency !== undefined) updateData.currency = currency;
    if (pdfFileUrl !== undefined) updateData.pdfFileUrl = sanitizeString(pdfFileUrl, 500);
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail ? sanitizeString(thumbnail, 500) : null;
    if (courseId !== undefined) updateData.courseId = courseId ? parseInt(String(courseId)) : null;
    if (status !== undefined) updateData.status = status;
    if (totalPages !== undefined) updateData.totalPages = totalPages;
    if (fileSize !== undefined) updateData.fileSize = fileSize;

    // Update textbook
    const [updated] = await db
      .update(textbooks)
      .set(updateData)
      .where(eq(textbooks.id, textbookId))
      .returning();

    log.info('Textbook updated', { textbookId });

    return NextResponse.json({ textbook: updated });
  } catch (error: any) {
    log.error('Update textbook error', error);
    return handleApiError(error, request.nextUrl.pathname);
  }
}

// DELETE - Delete textbook
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('adminToken')?.value || request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const sanitizedId = sanitizeString(params.id, 20);
    const textbookId = parseInt(sanitizedId);
    if (isNaN(textbookId) || textbookId <= 0) {
      return NextResponse.json({ message: 'Invalid textbook ID' }, { status: 400 });
    }

    const db = await getDatabaseWithRetry();

    // Check if textbook exists
    const [existing] = await db
      .select()
      .from(textbooks)
      .where(eq(textbooks.id, textbookId))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ message: 'Textbook not found' }, { status: 404 });
    }

    // Delete textbook (cascade will handle related records)
    await db.delete(textbooks).where(eq(textbooks.id, textbookId));

    log.info('Textbook deleted', { textbookId });

    return NextResponse.json({ message: 'Textbook deleted successfully' });
  } catch (error: any) {
    log.error('Delete textbook error', error);
    return handleApiError(error, request.nextUrl.pathname);
  }
}

