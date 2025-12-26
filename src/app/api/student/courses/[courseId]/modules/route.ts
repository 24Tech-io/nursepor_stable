import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { modules, chapters, enrollments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// GET - Fetch course modules with chapters for student
export async function GET(request: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const token = request.cookies.get('student_token')?.value || request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    let decoded: any = null;
    try {
      decoded = await verifyToken(token);
    } catch {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }
    if (!decoded || decoded.role !== 'student') {
      return NextResponse.json({ message: 'Student access required' }, { status: 403 });
    }

    const db = await getDatabaseWithRetry();
    const courseId = parseInt(params.courseId);

    if (isNaN(courseId)) {
      return NextResponse.json({ message: 'Invalid course ID' }, { status: 400 });
    }

    // Check if student has access to this course via enrollments
    const access = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, decoded.id),
          eq(enrollments.courseId, courseId),
          eq(enrollments.status, 'active')
        )
      );

    // ✅ FIX: Auto-enroll student if course has assigned questions
    if (access.length === 0) {
      logger.warn(`Student ${decoded.id} tried to access course ${courseId} without enrollment`);
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

    // ✅ FIX: If no modules but has questions, create virtual Q-Bank module
    if (modulesWithChapters.length === 0) {
      const assignedQuestions = await db
        .select()
        .from(courseQuestionAssignments)
        .where(eq(courseQuestionAssignments.courseId, courseId));

      if (assignedQuestions.length > 0) {
        console.log(`📚 Creating virtual Q-Bank module for course ${courseId} with ${assignedQuestions.length} questions`);
        
        return NextResponse.json({
          modules: [
            {
              id: 999999,
              courseId,
              title: 'Practice Questions',
              description: `Access ${assignedQuestions.length} Q-Bank practice questions`,
              order: 0,
              isPublished: true,
              duration: 60,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              chapters: [
                {
                  id: 999999,
                  moduleId: 999999,
                  title: 'Q-Bank Practice',
                  description: 'Test your knowledge with practice questions',
                  type: 'qbank',
                  order: 0,
                  isPublished: true,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ],
            },
          ],
        });
      }
    }

    return NextResponse.json({ modules: modulesWithChapters });
  } catch (error: any) {
    logger.error('Get student modules error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch modules', error: error.message },
      { status: 500 }
    );
  }
}
