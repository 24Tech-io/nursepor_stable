import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { blogPosts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDatabase();
    const id = parseInt(params.id);
    
    const blog = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);

    if (!blog.length) {
      return NextResponse.json(
        { message: 'Blog not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      blog: {
        id: blog[0].id.toString(),
        title: blog[0].title,
        slug: blog[0].slug,
        content: blog[0].content,
        author: blog[0].author,
        cover: blog[0].cover,
        tags: JSON.parse(blog[0].tags || '[]'),
        status: blog[0].status,
        createdAt: blog[0].createdAt?.toISOString(),
        updatedAt: blog[0].updatedAt?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Get blog error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to get blog',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDatabase();
    const id = parseInt(params.id);
    const data = await request.json();

    const updatedBlog = await db
      .update(blogPosts)
      .set({
        title: data.title,
        slug: data.slug,
        content: data.content,
        author: data.author,
        cover: data.cover || null,
        tags: JSON.stringify(data.tags || []),
        status: data.status,
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, id))
      .returning();

    if (!updatedBlog.length) {
      return NextResponse.json(
        { message: 'Blog not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      blog: {
        id: updatedBlog[0].id.toString(),
        title: updatedBlog[0].title,
        slug: updatedBlog[0].slug,
        content: updatedBlog[0].content,
        author: updatedBlog[0].author,
        cover: updatedBlog[0].cover,
        tags: JSON.parse(updatedBlog[0].tags || '[]'),
        status: updatedBlog[0].status,
        createdAt: updatedBlog[0].createdAt?.toISOString(),
        updatedAt: updatedBlog[0].updatedAt?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Update blog error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to update blog',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDatabase();
    const id = parseInt(params.id);

    await db.delete(blogPosts).where(eq(blogPosts.id, id));

    return NextResponse.json({ message: 'Blog deleted successfully' });
  } catch (error: any) {
    console.error('Delete blog error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to delete blog',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

