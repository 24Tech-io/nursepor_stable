import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';
import { extractAndValidate, validateRouteParams } from '@/lib/api-validation';
import { createCourseQuestionSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// GET - Get questions for a course
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    // Validate route params
    const paramsValidation = validateRouteParams(
      z.object({ courseId: z.string().regex(/^\d+$/, 'Invalid course ID') }),
      params
    );
    if (!paramsValidation.success) {
      return paramsValidation.error;
    }
    const courseId = parseInt(params.courseId);

    const questions = await db.query.courseQuestions.findMany({
      where: eq(courseQuestions.courseId, courseId),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            profilePicture: true,
          },
        },
        answers: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                profilePicture: true,
                role: true,
              },
            },
          },
          orderBy: [desc(courseAnswers.upvotes)],
        },
      },
      orderBy: [desc(courseQuestions.upvotes)],
    });

    return NextResponse.json({ questions });
  } catch (error: any) {
    logger.error('Get questions error:', error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}

// POST - Create a question
export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    // Validate route params
    const paramsValidation = validateRouteParams(
      z.object({ courseId: z.string().regex(/^\d+$/, 'Invalid course ID') }),
      params
    );
    if (!paramsValidation.success) {
      return paramsValidation.error;
    }
    const courseId = parseInt(params.courseId);
    
    // Validate request body
    const bodyValidation = await extractAndValidate(request, createCourseQuestionSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const { question, chapterId } = bodyValidation.data;

    const [newQuestion] = await db.insert(courseQuestions).values({
      courseId,
      chapterId: chapterId || null,
      userId: user.id,
      question: question.trim(),
    }).returning();

    return NextResponse.json({ success: true, question: newQuestion });
  } catch (error: any) {
    logger.error('Create question error:', error);
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
  }
}

// POST - Assign questions to course/module
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

    const courseId = parseInt(params.courseId);
    const body = await request.json();
    const { questionIds, moduleId, isModuleSpecific } = body;

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ message: 'questionIds array is required' }, { status: 400 });
    }

    const db = getDatabase();

    // Insert assignments (ignore duplicates)
    const assignments = questionIds.map((questionId: number, index: number) => ({
      courseId,
      moduleId: moduleId || null,
      questionId,
      isModuleSpecific: isModuleSpecific || false,
      sortOrder: index,
    }));

    const inserted = await db
      .insert(courseQuestionAssignments)
      .values(assignments)
      .onConflictDoNothing()
      .returning();

    console.log(
      `✅ Assigned ${inserted.length} questions to course ${courseId}${moduleId ? ` / module ${moduleId}` : ''}`
    );

    return NextResponse.json(
      {
        message: `${inserted.length} questions assigned successfully`,
        assignments: inserted,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Assign questions error:', error);
    return NextResponse.json(
      { message: 'Failed to assign questions', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Remove question assignment
export async function DELETE(request: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const courseId = parseInt(params.courseId);
    const body = await request.json();
    const { questionIds, moduleId } = body;

    const db = getDatabase();

    if (questionIds && Array.isArray(questionIds)) {
      // Delete specific assignments
      await db
        .delete(courseQuestionAssignments)
        .where(
          and(
            eq(courseQuestionAssignments.courseId, courseId),
            inArray(courseQuestionAssignments.questionId, questionIds),
            moduleId ? eq(courseQuestionAssignments.moduleId, moduleId) : undefined
          )
        );
    } else {
      // Delete all for this course/module
      await db
        .delete(courseQuestionAssignments)
        .where(
          and(
            eq(courseQuestionAssignments.courseId, courseId),
            moduleId ? eq(courseQuestionAssignments.moduleId, moduleId) : undefined
          )
        );
    }

    return NextResponse.json({ message: 'Questions removed successfully' });
  } catch (error: any) {
    console.error('Remove questions error:', error);
    return NextResponse.json(
      { message: 'Failed to remove questions', error: error.message },
      { status: 500 }
    );
  }
}
