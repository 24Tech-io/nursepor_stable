import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { blogPosts } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// GET - Fetch all blog posts
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = await getDatabaseWithRetry();

    const blogs = await db
      .select()
      .from(blogPosts)
      .orderBy(desc(blogPosts.createdAt));

    return NextResponse.json({ blogs });
  } catch (error: any) {
    logger.error('Get blogs error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch blogs', error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new blog post
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const { title, slug, content, author, cover, tags, status } = await request.json();

    if (!title || !slug || !content || !author) {
      return NextResponse.json(
        { message: 'Title, slug, content, and author are required' },
        { status: 400 }
      );
    }

    const db = await getDatabaseWithRetry();

    const result = await db.insert(blogPosts).values({
      title,
      slug,
      content,
      author,
      cover: cover || null,
      tags: JSON.stringify(tags || []),
      status: status || 'draft',
    }).returning();

    logger.info('✅ Blog post created:', result[0]);

    return NextResponse.json({ blog: result[0] });
  } catch (error: any) {
    logger.error('Create blog error:', error);
    return NextResponse.json(
      { message: 'Failed to create blog post', error: error.message },
      { status: 500 }
    );
  }
}

