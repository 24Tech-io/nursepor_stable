import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { chapters } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { parseVideoUrl } from '@/lib/video-utils';

// GET - Fetch all chapters for a module
export async function GET(request: NextRequest, { params }: { params: { moduleId: string } }) {
  try {
    const token = request.cookies.get('adminToken')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
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

// POST - Create new chapter
export async function POST(request: NextRequest, { params }: { params: { moduleId: string } }) {
  try {
    const token = request.cookies.get('adminToken')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
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
