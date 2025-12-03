import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { blogPosts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth';

// GET - Fetch single blog post
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDatabase();
    const id = parseInt(params.id);

    const blog = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);

    if (blog.length === 0) {
      return NextResponse.json({ message: 'Blog post not found' }, { status: 404 });
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
    console.error('Get blog error:', error);
    return NextResponse.json(
      {
        message: 'Failed to get blog',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// PUT - Update blog post
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = getDatabase();
    const id = parseInt(params.id);
    const data = await request.json();

    // Check if blog exists
    const existing = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ message: 'Blog post not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.author !== undefined) updateData.author = data.author;
    if (data.cover !== undefined) updateData.cover = data.cover;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.tags !== undefined || data.excerpt !== undefined || data.featured !== undefined) {
      // Get existing tags and metadata
      const existingTags = JSON.parse(existing[0].tags || '{}');
      const existingTagsArray = existingTags.tags || existingTags || [];
      const existingMetadata = existingTags.metadata || {};

      // Update metadata
      const metadata = {
        excerpt: data.excerpt !== undefined ? data.excerpt : existingMetadata.excerpt || '',
        featured: data.featured !== undefined ? data.featured : existingMetadata.featured || false,
        seoTitle:
          data.seoTitle !== undefined
            ? data.seoTitle
            : existingMetadata.seoTitle || data.title || existing[0].title,
        seoDescription:
          data.seoDescription !== undefined
            ? data.seoDescription
            : existingMetadata.seoDescription || '',
        scheduledPublish:
          data.scheduledPublish !== undefined
            ? data.scheduledPublish
            : existingMetadata.scheduledPublish || null,
        readingTime:
          data.readingTime !== undefined ? data.readingTime : existingMetadata.readingTime || null,
        category: data.category !== undefined ? data.category : existingMetadata.category || '',
      };

      const enhancedTags = {
        tags: data.tags !== undefined ? data.tags : existingTagsArray,
        metadata: metadata,
      };

      updateData.tags = JSON.stringify(enhancedTags);
    }
    updateData.updatedAt = new Date();

    const updated = await db
      .update(blogPosts)
      .set(updateData)
      .where(eq(blogPosts.id, id))
      .returning();

    const parsedTags = JSON.parse(updated[0].tags || '{}');
    const tagsArray = parsedTags.tags || parsedTags || [];
    const metadataObj = parsedTags.metadata || {};

    return NextResponse.json({
      blog: {
        id: updated[0].id.toString(),
        title: updated[0].title,
        slug: updated[0].slug,
        content: updated[0].content,
        author: updated[0].author,
        cover: updated[0].cover,
        tags: Array.isArray(tagsArray) ? tagsArray : [],
        status: updated[0].status,
        excerpt: metadataObj.excerpt || '',
        featured: metadataObj.featured || false,
        seoTitle: metadataObj.seoTitle || updated[0].title,
        seoDescription: metadataObj.seoDescription || '',
        scheduledPublish: metadataObj.scheduledPublish || null,
        readingTime: metadataObj.readingTime || null,
        category: metadataObj.category || '',
        createdAt: updated[0].createdAt?.toISOString(),
        updatedAt: updated[0].updatedAt?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Update blog error:', error);
    return NextResponse.json(
      {
        message: 'Failed to update blog',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
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

    const db = getDatabase();
    const id = parseInt(params.id);

    await db.delete(blogPosts).where(eq(blogPosts.id, id));

    return NextResponse.json({ message: 'Blog post deleted successfully' });
  } catch (error: any) {
    console.error('Delete blog error:', error);
    return NextResponse.json(
      {
        message: 'Failed to delete blog',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
