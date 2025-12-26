/**
 * Video Progress Tracking API
 * Track user's video watching progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { videoProgress } from '@/lib/db/schema';
import { verifyToken } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { extractAndValidate } from '@/lib/api-validation';
import { videoProgressLegacySchema } from '@/lib/validation-schemas-extended';
import { logger } from '@/lib/logger';

// POST - Update video progress
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Validate request body
    const bodyValidation = await extractAndValidate(request, videoProgressLegacySchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const { chapterId, currentTime, duration } = bodyValidation.data;
    
    const watchedPercentage = (currentTime / duration) * 100;
    const completed = watchedPercentage >= 90; // 90% watched = completed

    // Check if progress exists
    const existing = await db.query.videoProgress.findFirst({
      where: and(eq(videoProgress.userId, user.id), eq(videoProgress.chapterId, chapterId)),
    });

    if (existing) {
      // Update existing progress
      await db
        .update(videoProgress)
        .set({
          currentTime,
          duration,
          watchedPercentage,
          completed,
          lastWatchedAt: new Date(),
        })
        .where(eq(videoProgress.id, existing.id));
    } else {
      // Create new progress entry
      await db.insert(videoProgress).values({
        userId: user.id,
        chapterId,
        currentTime,
        duration,
        watchedPercentage,
        completed,
      });
    }

    return NextResponse.json({ success: true, completed });
  } catch (error: any) {
    logger.error('Update video progress error:', error);
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}

// GET - Get video progress
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapterId');

    if (chapterId) {
      // Get progress for specific chapter
      const progress = await db.query.videoProgress.findFirst({
        where: and(
          eq(videoProgress.userId, user.id),
          eq(videoProgress.chapterId, parseInt(chapterId))
        ),
      });

      return NextResponse.json({ progress });
    }

    // Get all progress for user
    const allProgress = await db.query.videoProgress.findMany({
      where: eq(videoProgress.userId, user.id),
    });

    return NextResponse.json({ progress: allProgress });
  } catch (error: any) {
    logger.error('Get video progress error:', error);
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
  }
}
