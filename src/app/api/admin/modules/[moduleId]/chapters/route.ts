import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { chapters } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { log } from '@/lib/logger-helper';
import { handleApiError } from '@/lib/api-error';
import { sanitizeString } from '@/lib/security';
import { extractAndValidate } from '@/lib/api-validation';
import { createChapterSchema } from '@/lib/validation-schemas-extended';

export const dynamic = 'force-dynamic';

// GET - Fetch all chapters for a module
export async function GET(
  request: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const db = await getDatabaseWithRetry();
    const sanitizedModuleId = sanitizeString(params.moduleId, 20);
    const moduleId = parseInt(sanitizedModuleId);

    if (isNaN(moduleId) || moduleId <= 0) {
      return NextResponse.json({ message: 'Invalid module ID' }, { status: 400 });
    }

    const moduleChapters = await db
      .select()
      .from(chapters)
      .where(eq(chapters.moduleId, moduleId))
      .orderBy(chapters.order);

    return NextResponse.json({ chapters: moduleChapters });
  } catch (error: any) {
    log.error('Get chapters error', error);
    return handleApiError(error, request.nextUrl.pathname);
  }
}

// POST - Create new chapter
export async function POST(
  request: NextRequest,
  { params }: { params: { moduleId: string } }
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

    // Validate request body
    const bodyValidation = await extractAndValidate(request, createChapterSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const body = bodyValidation.data;
    const {
      title,
      description,
      type,
      order,
      isPublished,
      prerequisiteChapterId,
      videoUrl,
      videoProvider,
      videoDuration,
      transcript,
      textbookContent,
      textbookFileUrl,
      readingTime,
      mcqData
    } = body;

    // Sanitize inputs
    const sanitizedTitle = sanitizeString(title, 255);
    const sanitizedDescription = description ? sanitizeString(description, 1000) : '';
    const sanitizedVideoUrl = videoUrl ? sanitizeString(videoUrl, 500) : null;
    const sanitizedTextbookFileUrl = textbookFileUrl ? sanitizeString(textbookFileUrl, 500) : null;

    const db = await getDatabaseWithRetry();
    const sanitizedModuleId = sanitizeString(params.moduleId, 20);
    const moduleId = parseInt(sanitizedModuleId);

    if (isNaN(moduleId) || moduleId <= 0) {
      return NextResponse.json({ message: 'Invalid module ID' }, { status: 400 });
    }

    // If order not provided, get max order + 1
    let chapterOrder = order;
    if (order === undefined || order === null) {
      const existingChapters = await db
        .select({ order: chapters.order })
        .from(chapters)
        .where(eq(chapters.moduleId, moduleId))
        .orderBy(desc(chapters.order))
        .limit(1);

      chapterOrder = existingChapters.length > 0 ? existingChapters[0].order + 1 : 0;
    }

    const result = await db.insert(chapters).values({
      moduleId,
      title: sanitizedTitle,
      description: sanitizedDescription,
      type,
      order: chapterOrder,
      isPublished: isPublished !== false,
      prerequisiteChapterId: prerequisiteChapterId || null,
      videoUrl: sanitizedVideoUrl,
      videoProvider: videoProvider || null,
      videoDuration: videoDuration || null,
      transcript: transcript || null,
      textbookContent: textbookContent || null,
      textbookFileUrl: sanitizedTextbookFileUrl,
      readingTime: readingTime || null,
      mcqData: mcqData || null,
    }).returning();

    log.info('Chapter created', { chapterId: result[0].id, moduleId });

    return NextResponse.json({ chapter: result[0] });
  } catch (error: any) {
    log.error('Create chapter error', error);
    return handleApiError(error, request.nextUrl.pathname);
  }
}

