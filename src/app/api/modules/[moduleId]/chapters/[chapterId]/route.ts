import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chapters } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth';

// PUT - Update chapter
export async function PUT(
  request: NextRequest,
  { params }: { params: { moduleId: string; chapterId: string } }
) {
  try {
    const auth = await verifyAuth(request, { requiredRole: 'admin' });
    if (!auth.isAuthorized) {
      return auth.response;
    }
    const user = auth.user;

    const body = await request.json();
    const { title, description, videoUrl, videoProvider, textbookContent, textbookFileUrl, readingTime, videoDuration, order } = body;

    const updated = await db
      .update(chapters)
      .set({
        title,
        description,
        videoUrl,
        videoProvider,
        textbookContent,
        textbookFileUrl,
        readingTime,
        videoDuration,
        order,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(chapters.id, parseInt(params.chapterId)),
          eq(chapters.moduleId, parseInt(params.moduleId))
        )
      )
      .returning();

    return NextResponse.json({ success: true, chapter: updated[0] });
  } catch (error) {
    console.error('Error updating chapter:', error);
    return NextResponse.json({ error: 'Failed to update chapter' }, { status: 500 });
  }
}

// DELETE - Delete chapter
export async function DELETE(
  request: NextRequest,
  { params }: { params: { moduleId: string; chapterId: string } }
) {
  try {
    const auth = await verifyAuth(request, { requiredRole: 'admin' });
    if (!auth.isAuthorized) {
      return auth.response;
    }
    const user = auth.user;

    await db
      .delete(chapters)
      .where(
        and(
          eq(chapters.id, parseInt(params.chapterId)),
          eq(chapters.moduleId, parseInt(params.moduleId))
        )
      );

    return NextResponse.json({ success: true, message: 'Chapter deleted' });
  } catch (error) {
    console.error('Error deleting chapter:', error);
    return NextResponse.json({ error: 'Failed to delete chapter' }, { status: 500 });
  }
}

