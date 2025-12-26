import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseWithRetry } from '@/lib/db';
import { blogPosts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { updateBlogSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';

// GET - Fetch single blog post
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabaseWithRetry();
    const id = parseInt(params.id);

    const blog = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);

    if (blog.length === 0) {
      return NextResponse.json(
        { message: 'Blog post not found' },
        { status: 404 }
      );
    }

    const parsedTags = JSON.parse(blog[0].tags || '{}');
    const tagsArray = parsedTags.tags || parsedTags || [];
    const metadataObj = parsedTags.metadata || {};

    return NextResponse.json({
      blog: {
        id: blog[0].id.toString(),
        title: blog[0].title,
        slug: blog[0].slug,
        content: blog[0].content,
        author: blog[0].author,
        cover: blog[0].cover,
        tags: Array.isArray(tagsArray) ? tagsArray : [],
        status: blog[0].status,
        excerpt: metadataObj.excerpt || '',
        featured: metadataObj.featured || false,
        seoTitle: metadataObj.seoTitle || blog[0].title,
        seoDescription: metadataObj.seoDescription || '',
        scheduledPublish: metadataObj.scheduledPublish || null,
        readingTime: metadataObj.readingTime || null,
        category: metadataObj.category || '',
        createdAt: blog[0].createdAt?.toISOString(),
        updatedAt: blog[0].updatedAt?.toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('Get blog error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to get blog',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// PUT - Update blog post
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = await getDatabaseWithRetry();
    const id = parseInt(params.id);
    // Validate request body
    const bodyValidation = await extractAndValidate(request, updateBlogSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const data = bodyValidation.data;

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
    logger.error('Update blog error:', error);
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

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = await getDatabaseWithRetry();
    const id = parseInt(params.id);

    await db.delete(blogPosts).where(eq(blogPosts.id, blogId));

    console.log(`✅ Blog ${blogId} deleted`);

    return NextResponse.json({ message: 'Blog post deleted successfully' });
  } catch (error: any) {
    logger.error('Delete blog error:', error);
    return NextResponse.json(
      { message: 'Failed to delete blog post', error: error.message },
      { status: 500 }
    );
  }
}
