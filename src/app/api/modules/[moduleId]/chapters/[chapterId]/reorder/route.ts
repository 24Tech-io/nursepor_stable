import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chapters } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth';

// PATCH - Reorder chapter (move up or down)
export async function PATCH(
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
    const { direction } = body; // 'up' or 'down'

    const moduleId = parseInt(params.moduleId);
    const chapterId = parseInt(params.chapterId);

    // Get current chapter
    const [currentChapter] = await db
      .select()
      .from(chapters)
      .where(and(eq(chapters.id, chapterId), eq(chapters.moduleId, moduleId)));

    if (!currentChapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    // Get all chapters in this module
    const allChapters = await db
      .select()
      .from(chapters)
      .where(eq(chapters.moduleId, moduleId))
      .orderBy(chapters.order);

    const currentIndex = allChapters.findIndex((c) => c.id === chapterId);

    if (currentIndex === -1) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    // Calculate new position
    let swapIndex = -1;
    if (direction === 'up' && currentIndex > 0) {
      swapIndex = currentIndex - 1;
    } else if (direction === 'down' && currentIndex < allChapters.length - 1) {
      swapIndex = currentIndex + 1;
    }

    if (swapIndex === -1) {
      return NextResponse.json({ error: 'Cannot move in that direction' }, { status: 400 });
    }

    // Swap orders
    const chapterToSwap = allChapters[swapIndex];
    const tempOrder = currentChapter.order;

    await db
      .update(chapters)
      .set({ order: chapterToSwap.order })
      .where(eq(chapters.id, chapterId));

    await db
      .update(chapters)
      .set({ order: tempOrder })
      .where(eq(chapters.id, chapterToSwap.id));

    return NextResponse.json({ success: true, message: 'Chapter reordered' });
  } catch (error) {
    console.error('Error reordering chapter:', error);
    return NextResponse.json({ error: 'Failed to reorder chapter' }, { status: 500 });
  }
}

