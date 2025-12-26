import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { dailyVideos } from '@/lib/db/schema';
import { desc, eq, and, gte, lte } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET - Fetch all daily videos
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value || request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = await getDatabaseWithRetry();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // Optional: filter by specific date

    let query = db.select().from(dailyVideos);

    if (date) {
      // Filter by specific date (start of day to end of day)
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query = query.where(
        and(
          gte(dailyVideos.scheduledDate, startDate),
          lte(dailyVideos.scheduledDate, endDate)
        )
      ) as any;
    }

    const videos = await query.orderBy(desc(dailyVideos.scheduledDate));

    return NextResponse.json({ videos });
  } catch (error: any) {
    logger.error('Error fetching daily videos:', error);
    return NextResponse.json(
      { message: 'Failed to fetch daily videos', error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new daily video
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value || request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, videoUrl, scheduledDate, isActive } = body;

    if (!title || !videoUrl || !scheduledDate) {
      return NextResponse.json(
        { message: 'Title, video URL, and scheduled date are required' },
        { status: 400 }
      );
    }

    // Validate date
    const scheduledDateObj = new Date(scheduledDate);
    if (isNaN(scheduledDateObj.getTime())) {
      return NextResponse.json(
        { message: 'Invalid scheduled date format' },
        { status: 400 }
      );
    }

    const db = await getDatabaseWithRetry();

    const [newVideo] = await db
      .insert(dailyVideos)
      .values({
        title,
        description: description || null,
        videoUrl,
        scheduledDate: scheduledDateObj,
        isActive: isActive !== undefined ? isActive : true,
        updatedAt: new Date(),
      })
      .returning();

    logger.info(`✅ Daily video created: ${newVideo.id} - ${newVideo.title}`);

    return NextResponse.json(
      { message: 'Daily video created successfully', video: newVideo },
      { status: 201 }
    );
  } catch (error: any) {
    logger.error('Error creating daily video:', error);
    return NextResponse.json(
      { message: 'Failed to create daily video', error: error.message },
      { status: 500 }
    );
  }
}


