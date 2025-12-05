import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { modules, chapters, studentProgress, enrollments, courseQuestionAssignments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// GET - Fetch course modules with chapters for student
export async function GET(request: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const token = request.cookies.get('studentToken')?.value;
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
    let access = await db
      .select()
      .from(studentProgress)
      .where(
        and(eq(studentProgress.studentId, decoded.id), eq(studentProgress.courseId, courseId))
      );

    // ✅ FIX: Auto-enroll student if course has assigned questions
    if (access.length === 0) {
      const hasQuestions = await db
        .select()
        .from(courseQuestionAssignments)
        .where(eq(courseQuestionAssignments.courseId, courseId))
        .limit(1);

      if (hasQuestions.length > 0) {
        console.log(`📚 Auto-enrolling student ${decoded.id} in course ${courseId} (has ${hasQuestions.length} assigned questions)`);
        
        try {
          // Create studentProgress
          await db.insert(studentProgress).values({
            studentId: decoded.id,
            courseId,
            completedChapters: '[]',
            watchedVideos: '[]',
            quizAttempts: '[]',
            totalProgress: 0,
            lastAccessed: new Date(),
          });

          // Create enrollment record
          await db.insert(enrollments).values({
            userId: decoded.id,
            courseId,
            status: 'active',
            progress: 0,
            enrolledAt: new Date(),
          });

          // Refetch access
          access = await db
            .select()
            .from(studentProgress)
            .where(
              and(eq(studentProgress.studentId, decoded.id), eq(studentProgress.courseId, courseId))
            );
          
          console.log(`✅ Student ${decoded.id} auto-enrolled in course ${courseId}`);
        } catch (enrollError: any) {
          console.error('Auto-enrollment error:', enrollError);
          // Continue even if enrollment fails (might be duplicate)
        }
      }

      // Final check after auto-enrollment attempt
      if (access.length === 0) {
        return NextResponse.json(
          { message: 'You do not have access to this course' },
          { status: 403 }
        );
      }
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
    console.error('Get student modules error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch modules', error: error.message },
      { status: 500 }
    );
  }
}
