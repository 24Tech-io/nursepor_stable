import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { modules } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// GET - Fetch all modules for a course
export async function GET(request: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const db = getDatabase();
    const courseId = parseInt(params.courseId);

    const courseModules = await db
      .select()
      .from(modules)
      .where(eq(modules.courseId, courseId))
      .orderBy(modules.order);

    return NextResponse.json({ modules: courseModules });
  } catch (error: any) {
    console.error('Get modules error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch modules', error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new module
export async function POST(request: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const { title, description, order, duration, isPublished } = await request.json();

    if (!title) {
      return NextResponse.json({ message: 'Title is required' }, { status: 400 });
    }

    const db = getDatabase();
    const courseId = parseInt(params.courseId);

    // If order not provided, get max order + 1
    let moduleOrder = order;
    if (order === undefined || order === null) {
      const existingModules = await db
        .select({ order: modules.order })
        .from(modules)
        .where(eq(modules.courseId, courseId))
        .orderBy(desc(modules.order))
        .limit(1);

      moduleOrder = existingModules.length > 0 ? existingModules[0].order + 1 : 0;
    }

    const result = await db
      .insert(modules)
      .values({
        courseId,
        title,
        description: description || '',
        order: moduleOrder,
        duration: duration || 0,
        isPublished: isPublished !== false,
      })
      .returning();

    console.log('✅ Module created:', result[0]);

    return NextResponse.json({ module: result[0] });
  } catch (error: any) {
    console.error('Create module error:', error);
    return NextResponse.json(
      { message: 'Failed to create module', error: error.message },
      { status: 500 }
    );
  }
}
