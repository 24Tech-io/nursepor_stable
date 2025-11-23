import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { dailyVideos, chapters, videoProgress } from '@/lib/db/schema';
import { eq, and, gte } from 'drizzle-orm';

// GET - Fetch today's daily video
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
    }

    // Get today's day number (1-365)
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - startOfYear.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

    // Find daily video for today
    const todayVideo = await db
      .select({
        id: dailyVideos.id,
        title: dailyVideos.title,
        description: dailyVideos.description,
        day: dailyVideos.day,
        chapterId: dailyVideos.chapterId,
        chapterTitle: chapters.title,
        chapterVideoUrl: chapters.videoUrl,
        chapterVideoProvider: chapters.videoProvider,
        chapterVideoDuration: chapters.videoDuration
      })
      .from(dailyVideos)
      .innerJoin(chapters, eq(dailyVideos.chapterId, chapters.id))
      .where(
        and(
          eq(dailyVideos.day, dayOfYear),
          eq(dailyVideos.isActive, true)
        )
      )
      .limit(1);

    if (todayVideo.length === 0) {
      return NextResponse.json({
        message: 'No daily video available for today',
        video: null
      });
    }

    const videoData = todayVideo[0];
    
    // Parse metadata from description (stored as JSON)
    let videoUrl = videoData.chapterVideoUrl;
    let videoProvider = videoData.chapterVideoProvider || 'youtube';
    let videoDuration = videoData.chapterVideoDuration;
    let description = videoData.description || '';
    
    try {
      const parsedDesc = JSON.parse(videoData.description || '{}');
      if (parsedDesc.metadata) {
        videoUrl = parsedDesc.metadata.videoUrl || videoUrl;
        videoProvider = parsedDesc.metadata.videoProvider || videoProvider;
        videoDuration = parsedDesc.metadata.videoDuration || videoDuration;
      }
      if (parsedDesc.description) {
        description = parsedDesc.description;
      }
    } catch (e) {
      // If not JSON, use description as-is
    }

    const video = {
      ...videoData,
      videoUrl,
      videoProvider,
      videoDuration,
      description
    };

    // Check if user has watched it
    const progress = await db
      .select()
      .from(videoProgress)
      .where(
        and(
          eq(videoProgress.userId, decoded.id),
          eq(videoProgress.chapterId, video.chapterId)
        )
      )
      .limit(1);

    // Calculate available until (end of day)
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    return NextResponse.json({
      video: {
        ...video,
        completed: progress.length > 0 ? progress[0].completed : false,
        watchedPercentage: progress.length > 0 ? progress[0].watchedPercentage : 0,
        availableUntil: endOfDay.toISOString(),
        hoursRemaining: Math.ceil((endOfDay.getTime() - today.getTime()) / (1000 * 60 * 60))
      }
    });
  } catch (error) {
    console.error('Get daily video error:', error);
    return NextResponse.json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}

// POST - Mark daily video as complete
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 403 });
    }

    const { chapterId } = await request.json();

    if (!chapterId) {
      return NextResponse.json({ message: 'Chapter ID required' }, { status: 400 });
    }

    // Update or create video progress
    const existing = await db
      .select()
      .from(videoProgress)
      .where(
        and(
          eq(videoProgress.userId, decoded.id),
          eq(videoProgress.chapterId, parseInt(chapterId))
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(videoProgress)
        .set({
          completed: true,
          watchedPercentage: 100,
          lastWatchedAt: new Date()
        })
        .where(eq(videoProgress.id, existing[0].id));
    } else {
      await db.insert(videoProgress).values({
        userId: decoded.id,
        chapterId: parseInt(chapterId),
        currentTime: 0,
        duration: 0,
        watchedPercentage: 100,
        completed: true
      });
    }

    return NextResponse.json({
      message: 'Daily video marked as complete',
      completed: true
    });
  } catch (error) {
    console.error('Mark daily video complete error:', error);
    return NextResponse.json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}
