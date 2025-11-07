import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { blogPosts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const db = getDatabase();
    const slug = params.slug;
    
    const blog = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug))
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
    console.error('Get blog by slug error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to get blog',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

