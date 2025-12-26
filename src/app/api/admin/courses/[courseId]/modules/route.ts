import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { chapters, modules } from '@/lib/db/schema';
import { eq, desc, inArray, asc } from 'drizzle-orm';

// GET - Fetch all modules for a course
export async function GET(request: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const token =
      request.cookies.get('adminToken')?.value ||
      request.cookies.get('admin_token')?.value ||
      request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const includeChapters = searchParams.get('includeChapters') === 'true';

    const db = await getDatabaseWithRetry();
    const courseId = parseInt(params.courseId);

    const courseModules = await db
      .select()
      .from(modules)
      .where(eq(modules.courseId, courseId))
      .orderBy(modules.order);

    if (!includeChapters) {
      return NextResponse.json({ modules: courseModules });
    }

    const moduleIds = courseModules.map((m: any) => m.id).filter((id: any) => typeof id === 'number');
    if (moduleIds.length === 0) {
      return NextResponse.json({
        modules: courseModules.map((m: any) => ({ ...m, items: [] })),
      });
    }

    const moduleChapters = await db
      .select()
      .from(chapters)
      .where(inArray(chapters.moduleId, moduleIds))
      .orderBy(asc(chapters.moduleId), asc(chapters.order));

    const chaptersByModuleId = new Map<number, any[]>();
    for (const c of moduleChapters) {
      const mid = (c as any).moduleId as number;
      const existing = chaptersByModuleId.get(mid);
      if (existing) {
        existing.push(c);
      } else {
        chaptersByModuleId.set(mid, [c]);
      }
    }

    return NextResponse.json({
      modules: courseModules.map((m: any) => ({
        ...m,
        items: chaptersByModuleId.get(m.id) || [],
      })),
    });
  } catch (error: any) {
    logger.error('Get modules error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch modules', error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new module
export async function POST(request: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const token =
      request.cookies.get('adminToken')?.value ||
      request.cookies.get('admin_token')?.value ||
      request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const { title, description, order, duration, isPublished } = await request.json();

    if (!title) {
      return NextResponse.json({ message: 'Title is required' }, { status: 400 });
    }

    const db = await getDatabaseWithRetry();
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

    logger.info('✅ Module created:', result[0]);

    return NextResponse.json({ module: result[0] });
  } catch (error: any) {
    logger.error('Create module error:', error);
    return NextResponse.json(
      { message: 'Failed to create module', error: error.message },
      { status: 500 }
    );
  }
}
