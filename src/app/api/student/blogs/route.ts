import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { blogPosts } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// Prevent static generation - this route requires database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Fetch published blog posts (public access for students)
export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();

    // Fetch only published blogs for students
    const blogs = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.status, 'published'))
      .orderBy(desc(blogPosts.createdAt));

    console.log(`📚 Fetched ${blogs.length} published blogs for student`);

    return NextResponse.json({ blogs });
  } catch (error: any) {
    console.error('Get student blogs error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch blogs', error: error.message, blogs: [] },
      { status: 500 }
    );
  }
}

