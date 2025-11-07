import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { blogPosts } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    const status = request.nextUrl.searchParams.get('status');
    
    let query = db.select().from(blogPosts);
    
    if (status) {
      query = query.where(eq(blogPosts.status, status)) as any;
    }
    
    const allBlogs = await query.orderBy(desc(blogPosts.createdAt));

    return NextResponse.json({
      blogs: allBlogs.map((blog: any) => ({
        id: blog.id.toString(),
        title: blog.title,
        slug: blog.slug,
        content: blog.content,
        author: blog.author,
        cover: blog.cover,
        tags: JSON.parse(blog.tags || '[]'),
        status: blog.status,
        createdAt: blog.createdAt?.toISOString(),
        updatedAt: blog.updatedAt?.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('Get blogs error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to get blogs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDatabase();
    const data = await request.json();

    if (!data.title || !data.slug || !data.content || !data.author) {
      return NextResponse.json(
        { message: 'Title, slug, content, and author are required' },
        { status: 400 }
      );
    }

    const newBlog = await db.insert(blogPosts).values({
      title: data.title,
      slug: data.slug,
      content: data.content,
      author: data.author,
      cover: data.cover || null,
      tags: JSON.stringify(data.tags || []),
      status: data.status || 'draft',
    }).returning();

    return NextResponse.json({
      blog: {
        id: newBlog[0].id.toString(),
        title: newBlog[0].title,
        slug: newBlog[0].slug,
        content: newBlog[0].content,
        author: newBlog[0].author,
        cover: newBlog[0].cover,
        tags: JSON.parse(newBlog[0].tags || '[]'),
        status: newBlog[0].status,
        createdAt: newBlog[0].createdAt?.toISOString(),
        updatedAt: newBlog[0].updatedAt?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Create blog error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to create blog',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

