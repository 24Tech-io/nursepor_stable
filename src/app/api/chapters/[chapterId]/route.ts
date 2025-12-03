import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chapters } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { securityLogger } from '@/lib/logger';

export async function DELETE(request: Request, { params }: { params: { chapterId: string } }) {
  try {
    const chapterId = parseInt(params.chapterId);

    const deletedChapter = await db.delete(chapters).where(eq(chapters.id, chapterId)).returning();

    if (!deletedChapter.length) {
      return NextResponse.json({ message: 'Chapter not found' }, { status: 404 });
    }

    securityLogger.info('Chapter Deleted', { chapterId });

    return NextResponse.json({ message: 'Chapter deleted successfully' });
  } catch (error) {
    console.error('Delete chapter error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
