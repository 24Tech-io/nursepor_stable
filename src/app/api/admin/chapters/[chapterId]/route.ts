import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { chapters } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { log } from '@/lib/logger-helper';
import { handleApiError } from '@/lib/api-error';
import { sanitizeString } from '@/lib/security';
import { extractAndValidate } from '@/lib/api-validation';
import { updateChapterSchema } from '@/lib/validation-schemas-extended';

export const dynamic = 'force-dynamic';

// PATCH - Update chapter
export async function PATCH(
  request: NextRequest,
  { params }: { params: { chapterId: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const sanitizedChapterId = sanitizeString(params.chapterId, 20);
    const chapterId = parseInt(sanitizedChapterId);

    if (isNaN(chapterId) || chapterId <= 0) {
      return NextResponse.json({ message: 'Invalid chapter ID' }, { status: 400 });
    }

    // Validate request body
    const bodyValidation = await extractAndValidate(request, updateChapterSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const updates = bodyValidation.data;
    const db = await getDatabaseWithRetry();

    // Sanitize update fields
    const sanitizedUpdates: any = { updatedAt: new Date() };
    if (updates.title !== undefined) sanitizedUpdates.title = sanitizeString(updates.title, 255);
    if (updates.content !== undefined) sanitizedUpdates.content = updates.content ? sanitizeString(updates.content, 10000) : '';
    if (updates.videoUrl !== undefined) sanitizedUpdates.videoUrl = updates.videoUrl ? sanitizeString(updates.videoUrl, 500) : null;
    if (updates.order !== undefined) sanitizedUpdates.order = updates.order;
    if (updates.isPublished !== undefined) sanitizedUpdates.isPublished = updates.isPublished;

    await db
      .update(chapters)
      .set(sanitizedUpdates)
      .where(eq(chapters.id, chapterId));

    log.info('Chapter updated', { chapterId });

    return NextResponse.json({ message: 'Chapter updated successfully' });
  } catch (error: any) {
    log.error('Update chapter error', error);
    return handleApiError(error, request.nextUrl.pathname);
  }
}

// DELETE - Delete chapter
export async function DELETE(
  request: NextRequest,
  { params }: { params: { chapterId: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const sanitizedChapterId = sanitizeString(params.chapterId, 20);
    const chapterId = parseInt(sanitizedChapterId);

    if (isNaN(chapterId) || chapterId <= 0) {
      return NextResponse.json({ message: 'Invalid chapter ID' }, { status: 400 });
    }

    const db = await getDatabaseWithRetry();

    await db.delete(chapters).where(eq(chapters.id, chapterId));

    log.info('Chapter deleted', { chapterId });

    return NextResponse.json({ message: 'Chapter deleted successfully' });
  } catch (error: any) {
    log.error('Delete chapter error', error);
    return handleApiError(error, request.nextUrl.pathname);
  }
}

