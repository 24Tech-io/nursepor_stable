import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseWithRetry } from '@/lib/db';
import { blogPosts } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { createBlogSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';

// GET - Fetch all blog posts
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabaseWithRetry();
    const status = request.nextUrl.searchParams.get('status');
    
    let query = db.select().from(blogPosts);
    
    if (status) {
      query = query.where(eq(blogPosts.status, status)) as any;
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = getDatabase();

    const blogs = await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));

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
    const db = await getDatabaseWithRetry();
    // Validate request body
    const bodyValidation = await extractAndValidate(request, createBlogSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const data = bodyValidation.data;

    const db = getDatabase();

    const result = await db
      .insert(blogPosts)
      .values({
        title,
        slug,
        content,
        author,
        cover: cover || null,
        tags: JSON.stringify(tags || []),
        status: status || 'draft',
      })
      .returning();

    console.log('✅ Blog post created:', result[0]);

    return NextResponse.json({ blog: result[0] });
  } catch (error: any) {
    logger.error('Create blog error:', error);
    return NextResponse.json(
      { message: 'Failed to create blog post', error: error.message },
      { status: 500 }
    );
  }
}
