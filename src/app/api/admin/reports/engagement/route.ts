import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { videoProgress, quizzes, studentProgress } from '@/lib/db/schema';
import { sql, count, sum } from 'drizzle-orm';

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

    // Get total watch time from videoProgress
    const watchTimeResult = await db
      .select({
        totalWatchTime: sql<number>`coalesce(sum(${videoProgress.currentTime}), 0)`,
      })
      .from(videoProgress);

    const totalWatchTime = Number(watchTimeResult[0]?.totalWatchTime || 0);

    // Get video completion stats
    const videoStats = await db
      .select({
        totalVideos: count(),
        completedVideos: sql<number>`sum(case when ${videoProgress.completed} = true then 1 else 0 end)`,
      })
      .from(videoProgress);

    // Get quiz completion stats
    const quizStats = await db
      .select({
        totalQuizAttempts: count(),
      })
      .from(quizzes);

    // Get student progress stats
    const progressStats = await db
      .select({
        avgProgress: sql<number>`coalesce(avg(cast(${studentProgress.totalProgress} as float)), 0)`,
      })
      .from(studentProgress);

    return NextResponse.json({
      engagement: {
        totalWatchTimeSeconds: totalWatchTime,
        totalWatchTimeHours: (totalWatchTime / 3600).toFixed(2),
        videoStats: {
          total: videoStats[0]?.totalVideos || 0,
          completed: Number(videoStats[0]?.completedVideos || 0),
          completionRate: videoStats[0]?.totalVideos
            ? (
                (Number(videoStats[0]?.completedVideos || 0) / videoStats[0]?.totalVideos) *
                100
              ).toFixed(2)
            : '0',
        },
        quizAttempts: quizStats[0]?.totalQuizAttempts || 0,
        avgStudentProgress: Number(progressStats[0]?.avgProgress || 0).toFixed(2),
      },
    });
  } catch (error) {
    console.error('Get engagement report error:', error);
    return NextResponse.json(
      {
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
