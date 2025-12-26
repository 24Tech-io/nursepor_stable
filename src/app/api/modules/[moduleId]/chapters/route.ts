import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { createChapterSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';
import { NextResponse, NextRequest } from 'next/server';
import { getDatabaseWithRetry } from '@/lib/db';
import { chapters, modules } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { securityLogger } from '@/lib/logger';
import { verifyToken } from '@/lib/auth';

export async function GET(
    request: NextRequest,
    { params }: { params: { moduleId: string } }
) {
    try {
        const moduleId = parseInt(params.moduleId);
        
        if (isNaN(moduleId) || moduleId <= 0) {
            return NextResponse.json({ message: 'Invalid module ID' }, { status: 400 });
        }

        const db = await getDatabaseWithRetry();
        const moduleChapters = await db
            .select()
            .from(chapters)
            .where(eq(chapters.moduleId, moduleId))
            .orderBy(asc(chapters.order));

        return NextResponse.json({ chapters: moduleChapters });
    } catch (error: any) {
        // Enhanced error logging to diagnose database issues
        logger.error('Get chapters error:', {
            message: error?.message,
            code: error?.code,
            detail: error?.detail,
            hint: error?.hint,
            stack: error?.stack
        });
        
        // Check for specific database errors
        if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
            return NextResponse.json(
                { 
                    message: 'Database table or column does not exist. Please run: npx drizzle-kit push',
                    error: error?.message,
                    code: error?.code,
                    hint: error?.hint
                },
                { status: 500 }
            );
        }
        
        if (error?.code === '42703' || error?.message?.includes('column')) {
            return NextResponse.json(
                { 
                    message: 'Database schema mismatch. Please run: npx drizzle-kit push',
                    error: error?.message,
                    hint: error?.hint
                },
                { status: 500 }
            );
        }
        
        return NextResponse.json(
            { 
                message: 'Internal server error',
                error: error?.message || 'Unknown error',
                code: error?.code,
                details: process.env.NODE_ENV === 'development' ? {
                    stack: error?.stack,
                    detail: error?.detail,
                    hint: error?.hint
                } : undefined
            },
            { status: 500 }
        );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const db = getDatabase();
    const moduleId = parseInt(params.moduleId);

    const moduleChapters = await db
      .select()
      .from(chapters)
      .where(eq(chapters.moduleId, moduleId))
      .orderBy(chapters.order);

    return NextResponse.json({ chapters: moduleChapters });
  } catch (error: any) {
    console.error('Get chapters error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch chapters', error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { moduleId: string } }
) {
    try {
        // Check authentication
        const token = request.cookies.get('admin_token')?.value || request.cookies.get('adminToken')?.value || request.cookies.get('token')?.value;
        
        if (!token) {
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
        }

        const decoded = await verifyToken(token);
        if (!decoded || decoded.role !== 'admin') {
            return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
        }

        const moduleId = parseInt(params.moduleId);
        
        if (isNaN(moduleId) || moduleId <= 0) {
            return NextResponse.json({ message: 'Invalid module ID' }, { status: 400 });
        }

        // Validate request body
        const bodyValidation = await extractAndValidate(request, createChapterSchema);
        if (!bodyValidation.success) {
            logger.error('Validation error:', bodyValidation.error);
            return bodyValidation.error;
        }
        const body = bodyValidation.data;

        const db = await getDatabaseWithRetry();

        // Get current chapter count for ordering
        const existingChapters = await db.select().from(chapters).where(eq(chapters.moduleId, moduleId));
        const order = body.order !== undefined ? body.order : existingChapters.length;

        // Handle videoUrl - convert empty string to null
        const videoUrl = body.videoUrl && body.videoUrl.trim() !== '' ? body.videoUrl.trim() : null;

        const newChapter = await db.insert(chapters).values({
            moduleId,
            title: body.title.trim(),
            description: body.description?.trim() || null,
            type: body.type,
            order: order,
            videoUrl: videoUrl,
            videoProvider: body.videoProvider || null,
            videoDuration: body.videoDuration || null,
            textbookContent: body.textbookContent || null,
            textbookFileUrl: body.textbookFileUrl || body.documentUrl || null,
            readingTime: body.readingTime || null,
            mcqData: body.mcqData || null,
            isPublished: body.isPublished !== undefined ? body.isPublished : false,
            prerequisiteChapterId: body.prerequisiteChapterId || null,
        }).returning();

        securityLogger.info('Chapter Created', { chapterId: newChapter[0].id, moduleId });

        return NextResponse.json({
            message: 'Chapter created successfully',
            chapter: newChapter[0]
        });

    } catch (error: any) {
        // Enhanced error logging to diagnose database issues
        logger.error('Create chapter error:', {
            message: error?.message,
            code: error?.code,
            detail: error?.detail,
            hint: error?.hint,
            stack: error?.stack
        });
        
        // Check for specific database errors
        if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
            return NextResponse.json(
                {
                    message: 'Database table or column does not exist. Please run: npx drizzle-kit push',
                    error: error?.message,
                    code: error?.code,
                    hint: error?.hint
                },
                { status: 500 }
            );
        }
        
        if (error?.code === '42703' || error?.message?.includes('column')) {
            return NextResponse.json(
                {
                    message: 'Database schema mismatch. Please run: npx drizzle-kit push',
                    error: error?.message,
                    hint: error?.hint
                },
                { status: 500 }
            );
        }
        
        return NextResponse.json(
            {
                message: 'Internal server error',
                error: error?.message || 'Unknown error',
                code: error?.code,
                details: process.env.NODE_ENV === 'development' ? {
                    stack: error?.stack,
                    detail: error?.detail,
                    hint: error?.hint
                } : undefined
            },
            { status: 500 }
        );
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
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
      mcqData,
      documentUrl,
      documentType,
    } = body;

    if (!title || !type) {
      return NextResponse.json({ message: 'Title and type are required' }, { status: 400 });
    }

    const db = getDatabase();
    const moduleId = parseInt(params.moduleId);

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

    // Convert video URL to embed format if provided (hides branding)
    let finalVideoUrl = videoUrl || null;
    let finalVideoProvider = videoProvider || null;

    if (finalVideoUrl && type === 'video') {
      const parsed = parseVideoUrl(finalVideoUrl);
      finalVideoUrl = parsed.embedUrl; // Use embed URL with privacy settings
      finalVideoProvider = parsed.provider; // Auto-detect provider
    }

    // Prepare chapter data
    const chapterData: any = {
      moduleId,
      title,
      description: description || '',
      type,
      order: chapterOrder,
      isPublished: isPublished !== false,
      prerequisiteChapterId: prerequisiteChapterId || null,
      videoUrl: finalVideoUrl,
      videoProvider: finalVideoProvider,
      videoDuration: videoDuration || null,
      transcript: transcript || null,
      textbookContent: textbookContent || null,
      // Use textbookFileUrl for documents, or use documentUrl if provided
      textbookFileUrl: documentUrl || textbookFileUrl || null,
      readingTime: readingTime || null,
      mcqData: mcqData || null,
    };

    const result = await db.insert(chapters).values(chapterData).returning();

    console.log('✅ Chapter created:', result[0]);

    return NextResponse.json({ chapter: result[0] });
  } catch (error: any) {
    console.error('Create chapter error:', error);
    return NextResponse.json(
      { message: 'Failed to create chapter', error: error.message },
      { status: 500 }
    );
  }
}
