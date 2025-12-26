import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { dailyVideos } from '@/lib/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET - Get daily video for a specific date or today's video
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'student') {
      return NextResponse.json({ message: 'Student access required' }, { status: 403 });
    }

    const db = await getDatabaseWithRetry();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // Optional: specific date (YYYY-MM-DD format)
    const past = searchParams.get('past') === 'true'; // Get all past videos

    if (past) {
      // Get all past videos (scheduled date < today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const pastVideos = await db
        .select()
        .from(dailyVideos)
        .where(
          and(
            eq(dailyVideos.isActive, true),
            lte(dailyVideos.scheduledDate, today)
          )
        )
        .orderBy(desc(dailyVideos.scheduledDate));

      return NextResponse.json({ videos: pastVideos });
    }

    // Get video for specific date or today
    let targetDate: Date;
    if (date) {
      targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) {
        return NextResponse.json(
          { message: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        );
      }
    } else {
      targetDate = new Date(); // Today
    }

    // Set to start of day
    targetDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    const [video] = await db
      .select()
      .from(dailyVideos)
      .where(
        and(
          eq(dailyVideos.isActive, true),
          gte(dailyVideos.scheduledDate, targetDate),
          lte(dailyVideos.scheduledDate, endDate)
        )
      )
      .limit(1);

    if (!video) {
      return NextResponse.json(
        { message: 'No daily video found for this date', video: null },
        { status: 200 }
      );
    }

    return NextResponse.json({ video });
  } catch (error: any) {
    logger.error('Error fetching daily video:', error);
    return NextResponse.json(
      { message: 'Failed to fetch daily video', error: error.message },
      { status: 500 }
    );
  }
}


