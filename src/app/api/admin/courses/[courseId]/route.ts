import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { courses, modules, chapters } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    const db = getDatabase();
    const courseId = parseInt(params.courseId);

    // Get course
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!course) {
      return NextResponse.json(
        { message: 'Course not found' },
        { status: 404 }
      );
    }

    // Get modules
    const courseModules = await db
      .select()
      .from(modules)
      .where(eq(modules.courseId, courseId))
      .orderBy(asc(modules.order));

    // Get chapters for each module
    const modulesWithChapters = await Promise.all(
      courseModules.map(async (module: typeof courseModules[0]) => {
        const moduleChapters = await db
          .select()
          .from(chapters)
          .where(eq(chapters.moduleId, module.id))
          .orderBy(asc(chapters.order));

        return {
          id: module.id.toString(),
          courseId: module.courseId.toString(),
          title: module.title,
          description: module.description,
          order: module.order,
          isPublished: module.isPublished,
          duration: module.duration,
          chapters: moduleChapters.map((chapter: typeof moduleChapters[0]) => ({
            id: chapter.id.toString(),
            moduleId: chapter.moduleId.toString(),
            title: chapter.title,
            description: chapter.description,
            type: chapter.type,
            order: chapter.order,
            isPublished: chapter.isPublished,
            prerequisiteChapterId: chapter.prerequisiteChapterId?.toString(),
            videoUrl: chapter.videoUrl,
            videoProvider: chapter.videoProvider,
            videoDuration: chapter.videoDuration,
            transcript: chapter.transcript,
            textbookContent: chapter.textbookContent,
            textbookFileUrl: chapter.textbookFileUrl,
            readingTime: chapter.readingTime,
            mcqData: chapter.mcqData,
            createdAt: chapter.createdAt?.toISOString(),
            updatedAt: chapter.updatedAt?.toISOString(),
          })),
          createdAt: module.createdAt?.toISOString(),
          updatedAt: module.updatedAt?.toISOString(),
        };
      })
    );

    return NextResponse.json({
      course: {
        id: course.id.toString(),
        title: course.title,
        description: course.description,
        instructor: course.instructor,
        thumbnail: course.thumbnail,
        pricing: course.pricing || 0,
        status: course.status,
        isRequestable: course.isRequestable,
        isDefaultUnlocked: course.isDefaultUnlocked,
        modules: modulesWithChapters,
        createdAt: course.createdAt?.toISOString(),
        updatedAt: course.updatedAt?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Get course detail error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to get course',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

