import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { dailyVideos, chapters } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// GET - Fetch all configured daily videos
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;
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

    return NextResponse.json({ dailyVideos: videos });
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
    const token = request.cookies.get('adminToken')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const { chapterId, title, description, day } = await request.json();

    if (!chapterId || !title || day === undefined) {
      return NextResponse.json(
        { message: 'Chapter ID, title, and day are required' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    const result = await db.insert(dailyVideos).values({
      chapterId: parseInt(chapterId),
      title,
      description: description || '',
      day: parseInt(day),
      isActive: true,
    }).returning();

    console.log('✅ Daily video created:', result[0]);

    return NextResponse.json({ dailyVideo: result[0] });
  } catch (error: any) {
    console.error('Create daily video error:', error);
    return NextResponse.json(
      { message: 'Failed to create daily video', error: error.message },
      { status: 500 }
    );
  }
}

