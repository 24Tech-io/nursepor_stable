import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-helpers';
import { getDatabase } from '@/lib/db';
import {
  qbankCategories,
  qbankQuestions,
  courses,
  modules,
  studentProgress,
  qbankQuestionStatistics,
  courseQuestionAssignments,
} from '@/lib/db/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';

// GET - Get Q-Bank folders for student's enrolled courses (FLEXIBLE!)
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult.user;

    const db = getDatabase();

    // Get student's enrolled courses
    const enrolledCourses = await db
      .select({ courseId: studentProgress.courseId })
      .from(studentProgress)
      .where(eq(studentProgress.studentId, user.id));

    if (enrolledCourses.length === 0) {
      return NextResponse.json({
        folders: [],
        message: 'Not enrolled in any courses',
      });
    }

    const enrolledCourseIds = enrolledCourses.map((e) => e.courseId);

    // Get course folders for enrolled courses only
    const courseFolders = await db
      .select({
        id: qbankCategories.id,
        name: qbankCategories.name,
        courseId: qbankCategories.courseId,
        categoryType: qbankCategories.categoryType,
        icon: qbankCategories.icon,
        color: qbankCategories.color,
        courseName: courses.title,
        courseDescription: courses.description,
      })
      .from(qbankCategories)
      .innerJoin(courses, eq(qbankCategories.courseId, courses.id))
      .where(
        and(
          eq(qbankCategories.categoryType, 'course_folder'),
          inArray(qbankCategories.courseId, enrolledCourseIds)
        )
      )
      .orderBy(courses.id);

    // Get module folders for these courses
    const moduleFolders = await db
      .select({
        id: qbankCategories.id,
        name: qbankCategories.name,
        courseId: qbankCategories.courseId,
        moduleId: qbankCategories.moduleId,
        parentCategoryId: qbankCategories.parentCategoryId,
        categoryType: qbankCategories.categoryType,
        icon: qbankCategories.icon,
        sortOrder: qbankCategories.sortOrder,
        moduleName: modules.title,
        moduleOrder: modules.order,
      })
      .from(qbankCategories)
      .innerJoin(modules, eq(qbankCategories.moduleId, modules.id))
      .where(
        and(
          eq(qbankCategories.categoryType, 'module_folder'),
          inArray(qbankCategories.courseId, enrolledCourseIds)
        )
      )
      .orderBy(qbankCategories.sortOrder);

    // Count questions per module/course (considering assignments)
    const questionCountsPromises = enrolledCourseIds.map(async (courseId) => {
      // Get total course questions
      const courseCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(courseQuestionAssignments)
        .where(eq(courseQuestionAssignments.courseId, courseId));

      // Get per-module counts
      const moduleCountsData = await db
        .select({
          moduleId: courseQuestionAssignments.moduleId,
          count: sql<number>`count(*)`,
        })
        .from(courseQuestionAssignments)
        .where(
          and(
            eq(courseQuestionAssignments.courseId, courseId),
            sql`${courseQuestionAssignments.moduleId} IS NOT NULL`
          )
        )
        .groupBy(courseQuestionAssignments.moduleId);

      return {
        courseId,
        totalQuestions: Number(courseCount[0]?.count || 0),
        moduleQuestions: moduleCountsData.map((m) => ({
          moduleId: m.moduleId,
          count: Number(m.count),
        })),
      };
    });

    const questionCounts = await Promise.all(questionCountsPromises);
    const countsByCourse = new Map(questionCounts.map((c) => [c.courseId, c]));

    // Get student's statistics for these courses
    const userStats = await db
      .select({
        questionId: qbankQuestionStatistics.questionId,
        timesAttempted: qbankQuestionStatistics.timesAttempted,
        timesCorrect: qbankQuestionStatistics.timesCorrect,
        timesIncorrect: qbankQuestionStatistics.timesIncorrect,
      })
      .from(qbankQuestionStatistics)
      .where(eq(qbankQuestionStatistics.userId, user.id));

    // Build hierarchy with statistics
    const hierarchy = courseFolders.map((courseFolder) => {
      const courseStats = countsByCourse.get(courseFolder.courseId!);
      const moduleFoldersForCourse = moduleFolders.filter(
        (m) => m.parentCategoryId === courseFolder.id
      );

      // Calculate course-level stats
      const totalQuestions = courseStats?.totalQuestions || 0;
      const modulesData = moduleFoldersForCourse.map((module) => {
        const moduleCount =
          courseStats?.moduleQuestions.find((m) => m.moduleId === module.moduleId)?.count || 0;

        return {
          id: module.id,
          name: module.name,
          moduleId: module.moduleId,
          moduleName: module.moduleName,
          type: 'module_folder',
          icon: module.icon || '📂',
          color: '#6366F1',
          questionCount: moduleCount,
          order: module.sortOrder,
        };
      });

      return {
        id: courseFolder.id,
        name: courseFolder.name,
        courseName: courseFolder.courseName,
        courseDescription: courseFolder.courseDescription,
        courseId: courseFolder.courseId,
        type: 'course_folder',
        icon: courseFolder.icon || '📚',
        color: courseFolder.color || '#8B5CF6',
        questionCount: totalQuestions,
        modules: modulesData.sort((a, b) => (a.order || 0) - (b.order || 0)),
      };
    });

    return NextResponse.json({
      folders: hierarchy,
      summary: {
        totalCourses: courseFolders.length,
        totalModules: moduleFolders.length,
        totalQuestions: questionCounts.reduce((sum, c) => sum + c.totalQuestions, 0),
      },
    });
  } catch (error: any) {
    console.error('Get admin folders error:', error);
    return NextResponse.json(
      { message: 'Failed to get folders', error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create custom folder (flexible for any organization)
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('studentToken')?.value;

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

