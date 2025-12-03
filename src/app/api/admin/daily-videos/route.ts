import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { dailyVideos, chapters } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// GET - Fetch all configured daily videos
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = getDatabase();

    const videos = await db
      .select({
        id: dailyVideos.id,
        chapterId: dailyVideos.chapterId,
        chapterTitle: chapters.title,
        title: dailyVideos.title,
        description: dailyVideos.description,
        day: dailyVideos.day,
        isActive: dailyVideos.isActive,
        createdAt: dailyVideos.createdAt,
      })
      .from(dailyVideos)
      .innerJoin(chapters, eq(dailyVideos.chapterId, chapters.id))
      .orderBy(dailyVideos.day);

    // Parse metadata from description
    const videosWithMetadata = videos.map((video: any) => {
      let parsedDesc = video.description;
      let metadataObj = {};

      try {
        parsedDesc = JSON.parse(video.description || '{}');
        metadataObj = parsedDesc.metadata || {};
      } catch (e) {
        // If not JSON, use as plain description
        parsedDesc = { description: video.description || '' };
      }

      return {
        ...video,
        description: parsedDesc.description || video.description || '',
        videoUrl: (metadataObj as any).videoUrl || null,
        videoProvider: (metadataObj as any).videoProvider || 'youtube',
        videoDuration: (metadataObj as any).videoDuration || null,
        thumbnail: (metadataObj as any).thumbnail || null,
        scheduledDate: (metadataObj as any).scheduledDate || null,
        priority: (metadataObj as any).priority || 0,
      };
    });

    return NextResponse.json({ dailyVideos: videosWithMetadata });
  } catch (error: any) {
    console.error('Get daily videos error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch daily videos', error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new daily video configuration
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const {
      chapterId,
      title,
      description,
      day,
      videoUrl,
      videoProvider,
      videoDuration,
      thumbnail,
      scheduledDate,
      priority,
      isActive,
    } = await request.json();

    if (!chapterId || !title || day === undefined) {
      return NextResponse.json(
        { message: 'Chapter ID, title, and day are required' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Store additional metadata in description (we'll enhance schema later)
    const metadata = {
      videoUrl: videoUrl || null,
      videoProvider: videoProvider || 'youtube',
      videoDuration: videoDuration || null,
      thumbnail: thumbnail || null,
      scheduledDate: scheduledDate || null,
      priority: priority || 0,
    };

    // Combine description with metadata
    const enhancedDescription = description
      ? {
          description: description,
          metadata: metadata,
        }
      : { metadata: metadata };

    const result = await db
      .insert(dailyVideos)
      .values({
        chapterId: parseInt(chapterId),
        title,
        description: JSON.stringify(enhancedDescription),
        day: parseInt(day),
        isActive: isActive !== undefined ? isActive : true,
      })
      .returning();

    console.log('✅ Daily video created:', result[0]);

    // Parse and return with metadata
    const parsedDesc = JSON.parse(result[0].description || '{}');
    const metadataObj = parsedDesc.metadata || {};

    return NextResponse.json({
      dailyVideo: {
        ...result[0],
        description: parsedDesc.description || result[0].description || '',
        videoUrl: (metadataObj as any).videoUrl || null,
        videoProvider: (metadataObj as any).videoProvider || 'youtube',
        videoDuration: (metadataObj as any).videoDuration || null,
        thumbnail: (metadataObj as any).thumbnail || null,
        scheduledDate: (metadataObj as any).scheduledDate || null,
        priority: (metadataObj as any).priority || 0,
      },
    });
  } catch (error: any) {
    console.error('Create daily video error:', error);
    return NextResponse.json(
      { message: 'Failed to create daily video', error: error.message },
      { status: 500 }
    );
  }
}
