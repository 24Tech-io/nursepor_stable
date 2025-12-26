import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { updateBlogSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { blogPosts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// PATCH - Update blog post
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('adminToken')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const blogId = parseInt(params.id);
    // Validate request body
    const bodyValidation = await extractAndValidate(request, updateBlogSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const updates = bodyValidation.data;

    const db = await getDatabaseWithRetry();

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

    logger.info(`✅ Blog ${blogId} updated`);

    return NextResponse.json({ message: 'Blog post updated successfully' });
  } catch (error: any) {
    logger.error('Update blog error:', error);
    return NextResponse.json(
      { message: 'Failed to update blog post', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete blog post
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('adminToken')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const blogId = parseInt(params.id);
    const db = await getDatabaseWithRetry();

    await db.delete(blogPosts).where(eq(blogPosts.id, blogId));

    logger.info(`✅ Blog ${blogId} deleted`);

    return NextResponse.json({ message: 'Blog post deleted successfully' });
  } catch (error: any) {
    logger.error('Delete blog error:', error);
    return NextResponse.json(
      { message: 'Failed to delete blog post', error: error.message },
      { status: 500 }
    );
  }
}

