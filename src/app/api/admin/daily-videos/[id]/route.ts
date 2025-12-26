import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { dailyVideos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET - Fetch a specific daily video
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const videoId = parseInt(params.id);

    if (isNaN(videoId)) {
      return NextResponse.json({ message: 'Invalid video ID' }, { status: 400 });
    }

    const [video] = await db
      .select()
      .from(dailyVideos)
      .where(eq(dailyVideos.id, videoId))
      .limit(1);

    if (!video) {
      return NextResponse.json({ message: 'Daily video not found' }, { status: 404 });
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

// PUT - Update a daily video
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const videoId = parseInt(params.id);

    if (isNaN(videoId)) {
      return NextResponse.json({ message: 'Invalid video ID' }, { status: 400 });
    }

    const body = await request.json();
    const { title, description, videoUrl, scheduledDate, isActive } = body;

    // Check if video exists
    const [existingVideo] = await db
      .select()
      .from(dailyVideos)
      .where(eq(dailyVideos.id, videoId))
      .limit(1);

    if (!existingVideo) {
      return NextResponse.json({ message: 'Daily video not found' }, { status: 404 });
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (videoUrl !== undefined) updateData.videoUrl = videoUrl;
    if (scheduledDate !== undefined) {
      const scheduledDateObj = new Date(scheduledDate);
      if (isNaN(scheduledDateObj.getTime())) {
        return NextResponse.json(
          { message: 'Invalid scheduled date format' },
          { status: 400 }
        );
      }
      updateData.scheduledDate = scheduledDateObj;
    }
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updatedVideo] = await db
      .update(dailyVideos)
      .set(updateData)
      .where(eq(dailyVideos.id, videoId))
      .returning();

    logger.info(`✅ Daily video updated: ${updatedVideo.id} - ${updatedVideo.title}`);

    return NextResponse.json({
      message: 'Daily video updated successfully',
      video: updatedVideo,
    });
  } catch (error: any) {
    logger.error('Error updating daily video:', error);
    return NextResponse.json(
      { message: 'Failed to update daily video', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a daily video
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const videoId = parseInt(params.id);

    if (isNaN(videoId)) {
      return NextResponse.json({ message: 'Invalid video ID' }, { status: 400 });
    }

    // Check if video exists
    const [existingVideo] = await db
      .select()
      .from(dailyVideos)
      .where(eq(dailyVideos.id, videoId))
      .limit(1);

    if (!existingVideo) {
      return NextResponse.json({ message: 'Daily video not found' }, { status: 404 });
    }

    await db.delete(dailyVideos).where(eq(dailyVideos.id, videoId));

    logger.info(`✅ Daily video deleted: ${videoId} - ${existingVideo.title}`);

    return NextResponse.json({ message: 'Daily video deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting daily video:', error);
    return NextResponse.json(
      { message: 'Failed to delete daily video', error: error.message },
      { status: 500 }
    );
  }
}


