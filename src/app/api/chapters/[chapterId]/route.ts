import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chapters } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logger, securityLogger } from '@/lib/logger';
import { verifyToken } from '@/lib/auth';
import { parseVideoUrl } from '@/lib/video-utils';

// PATCH - Update chapter
export async function PATCH(
  request: NextRequest,
  { params }: { params: { chapterId: string } }
) {
  try {
    const token = request.cookies.get('token')?.value || request.cookies.get('adminToken')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const chapterId = parseInt(params.chapterId);
    if (isNaN(chapterId)) {
      return NextResponse.json({ message: 'Invalid chapter ID' }, { status: 400 });
    }

    const updates = await request.json();

    // Convert video URL to embed format if provided (hides branding)
    if (updates.videoUrl && updates.type === 'video') {
      const parsed = parseVideoUrl(updates.videoUrl);
      updates.videoUrl = parsed.embedUrl; // Use embed URL with privacy settings
      if (!updates.videoProvider) {
        updates.videoProvider = parsed.provider; // Auto-detect provider
      }
    }

    await db
      .update(chapters)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(chapters.id, chapterId));

    logger.info(`✅ Chapter ${chapterId} updated by ${decoded.email}`);

    return NextResponse.json({ message: 'Chapter updated successfully' });
  } catch (error: any) {
    logger.error('Update chapter error:', error);
    return NextResponse.json(
      { message: 'Failed to update chapter', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete chapter
export async function DELETE(
  request: NextRequest,
  { params }: { params: { chapterId: string } }
) {
  try {
    const token = request.cookies.get('token')?.value || request.cookies.get('adminToken')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const chapterId = parseInt(params.chapterId);
    if (isNaN(chapterId)) {
      return NextResponse.json({ message: 'Invalid chapter ID' }, { status: 400 });
    }

    const deletedChapter = await db.delete(chapters)
      .where(eq(chapters.id, chapterId))
      .returning();

    if (!deletedChapter.length) {
      return NextResponse.json({ message: 'Chapter not found' }, { status: 404 });
    }

    securityLogger.info('Chapter Deleted', { chapterId, requestedBy: decoded.email });

    return NextResponse.json({ message: 'Chapter deleted successfully' });
  } catch (error: any) {
    logger.error('Delete chapter error:', error);
    return NextResponse.json(
      { message: 'Failed to delete chapter', error: error.message },
      { status: 500 }
    );
  }
}
