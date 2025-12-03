import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { modules, chapters, studentProgress } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// GET - Fetch course modules with chapters for student
export async function GET(request: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'student') {
      return NextResponse.json({ message: 'Student access required' }, { status: 403 });
    }

    const db = getDatabase();
    const courseId = parseInt(params.courseId);

    // Check if student has access to this course
    const access = await db
      .select()
      .from(studentProgress)
      .where(
        and(eq(studentProgress.studentId, decoded.id), eq(studentProgress.courseId, courseId))
      );

    if (access.length === 0) {
      return NextResponse.json(
        { message: 'You do not have access to this course' },
        { status: 403 }
      );
    }

    // Fetch modules with only published chapters
    const courseModules = await db
      .select()
      .from(modules)
      .where(and(eq(modules.courseId, courseId), eq(modules.isPublished, true)))
      .orderBy(modules.order);

    // For each module, fetch its chapters
    const modulesWithChapters = await Promise.all(
      courseModules.map(async (module) => {
        const moduleChapters = await db
          .select()
          .from(chapters)
          .where(and(eq(chapters.moduleId, module.id), eq(chapters.isPublished, true)))
          .orderBy(chapters.order);

        return {
          ...module,
          chapters: moduleChapters,
        };
      })
    );

    return NextResponse.json({ modules: modulesWithChapters });
  } catch (error: any) {
    console.error('Get student modules error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch modules', error: error.message },
      { status: 500 }
    );
  }
}
