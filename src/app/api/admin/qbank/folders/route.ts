import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { qbankCategories, qbankQuestions, courses, modules } from '@/lib/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

// GET - Get flexible folder hierarchy for admin (works for ANY course type!)
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = getDatabase();

    // Get all course folders
    const courseFolders = await db
      .select({
        id: qbankCategories.id,
        name: qbankCategories.name,
        courseId: qbankCategories.courseId,
        categoryType: qbankCategories.categoryType,
        icon: qbankCategories.icon,
        color: qbankCategories.color,
        sortOrder: qbankCategories.sortOrder,
        courseName: courses.title,
      })
      .from(qbankCategories)
      .leftJoin(courses, eq(qbankCategories.courseId, courses.id))
      .where(eq(qbankCategories.categoryType, 'course_folder'))
      .orderBy(qbankCategories.sortOrder);

    // Get all module folders
    const moduleFolders = await db
      .select({
        id: qbankCategories.id,
        name: qbankCategories.name,
        courseId: qbankCategories.courseId,
        moduleId: qbankCategories.moduleId,
        parentCategoryId: qbankCategories.parentCategoryId,
        categoryType: qbankCategories.categoryType,
        icon: qbankCategories.icon,
        color: qbankCategories.color,
        sortOrder: qbankCategories.sortOrder,
        moduleName: modules.title,
      })
      .from(qbankCategories)
      .leftJoin(modules, eq(qbankCategories.moduleId, modules.id))
      .where(eq(qbankCategories.categoryType, 'module_folder'))
      .orderBy(qbankCategories.sortOrder);

    // Get custom categories
    const customCategories = await db
      .select()
      .from(qbankCategories)
      .where(eq(qbankCategories.categoryType, 'custom_category'))
      .orderBy(qbankCategories.sortOrder);

    // Count questions per category
    const questionCounts = await db
      .select({
        categoryId: qbankQuestions.categoryId,
        count: sql<number>`count(*)`,
      })
      .from(qbankQuestions)
      .groupBy(qbankQuestions.categoryId);

    const countMap = new Map(
      questionCounts.map((c) => [c.categoryId, Number(c.count)])
    );

    // Build hierarchy
    const hierarchy = courseFolders.map((courseFolder) => ({
      id: courseFolder.id,
      name: courseFolder.name,
      courseName: courseFolder.courseName,
      courseId: courseFolder.courseId,
      type: 'course_folder',
      icon: courseFolder.icon || '📚',
      color: courseFolder.color || '#8B5CF6',
      questionCount: countMap.get(courseFolder.id) || 0,
      modules: moduleFolders
        .filter((m) => m.parentCategoryId === courseFolder.id)
        .map((module) => ({
          id: module.id,
          name: module.name,
          moduleName: module.moduleName,
          moduleId: module.moduleId,
          type: 'module_folder',
          icon: module.icon || '📂',
          color: module.color || '#6366F1',
          questionCount: countMap.get(module.id) || 0,
        })),
    }));

    // Add custom categories
    const customFolders = customCategories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      type: 'custom_category',
      icon: cat.icon || '📁',
      color: cat.color || '#8B5CF6',
      questionCount: countMap.get(cat.id) || 0,
    }));

    return NextResponse.json({
      hierarchy,
      customFolders,
      totalCourses: courseFolders.length,
      totalModules: moduleFolders.length,
      totalCustom: customCategories.length,
    });
  } catch (error: any) {
    console.error('Get folders error:', error);
    return NextResponse.json(
      { message: 'Failed to get folders', error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create custom folder (works for any purpose)
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, courseId, moduleId, parentCategoryId, icon, color } = body;

    if (!name) {
      return NextResponse.json({ message: 'Folder name is required' }, { status: 400 });
    }

    const db = getDatabase();

    // Create custom folder
    const [newFolder] = await db
      .insert(qbankCategories)
      .values({
        name,
        courseId: courseId || null,
        moduleId: moduleId || null,
        parentCategoryId: parentCategoryId || null,
        categoryType: 'custom_category',
        isAutoGenerated: false,
        icon: icon || '📁',
        color: color || '#8B5CF6',
      })
      .returning();

    return NextResponse.json({
      message: 'Folder created successfully',
      folder: newFolder,
    });
  } catch (error: any) {
    console.error('Create folder error:', error);
    return NextResponse.json(
      { message: 'Failed to create folder', error: error.message },
      { status: 500 }
    );
  }
}

