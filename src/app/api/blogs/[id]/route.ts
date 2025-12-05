import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { blogPosts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// PATCH - Update blog post
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const blogId = parseInt(params.id);
    const updates = await request.json();

    const db = getDatabase();

    // If tags is an array, stringify it
    if (updates.tags && Array.isArray(updates.tags)) {
      updates.tags = JSON.stringify(updates.tags);
    }

    await db
      .update(blogPosts)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, blogId));

    console.log(`✅ Blog ${blogId} updated`);

    return NextResponse.json({ message: 'Blog post updated successfully' });
  } catch (error: any) {
    console.error('Update blog error:', error);
    return NextResponse.json(
      { message: 'Failed to update blog post', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete blog post
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const blogId = parseInt(params.id);
    const db = getDatabase();

    await db.delete(blogPosts).where(eq(blogPosts.id, blogId));

    console.log(`✅ Blog ${blogId} deleted`);

    return NextResponse.json({ message: 'Blog post deleted successfully' });
  } catch (error: any) {
    console.error('Delete blog error:', error);
    return NextResponse.json(
      { message: 'Failed to delete blog post', error: error.message },
      { status: 500 }
    );
  }
}
