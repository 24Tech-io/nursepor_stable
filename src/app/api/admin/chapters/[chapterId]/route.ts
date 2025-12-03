import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { chapters } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// PATCH - Update chapter
export async function PATCH(request: NextRequest, { params }: { params: { chapterId: string } }) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const chapterId = parseInt(params.chapterId);
    const updates = await request.json();

    const db = getDatabase();

    await db
      .update(chapters)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(chapters.id, chapterId));

    console.log(`✅ Chapter ${chapterId} updated`);

    return NextResponse.json({ message: 'Chapter updated successfully' });
  } catch (error: any) {
    console.error('Update chapter error:', error);
    return NextResponse.json(
      { message: 'Failed to update chapter', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete chapter
export async function DELETE(request: NextRequest, { params }: { params: { chapterId: string } }) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const chapterId = parseInt(params.chapterId);
    const db = getDatabase();

    await db.delete(chapters).where(eq(chapters.id, chapterId));

    console.log(`✅ Chapter ${chapterId} deleted`);

    return NextResponse.json({ message: 'Chapter deleted successfully' });
  } catch (error: any) {
    console.error('Delete chapter error:', error);
    return NextResponse.json(
      { message: 'Failed to delete chapter', error: error.message },
      { status: 500 }
    );
  }
}
