import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { courseQuestionAssignments, qbankQuestions } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

// GET - Fetch all questions assigned to a course
export async function GET(request: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const courseId = parseInt(params.courseId);
    const db = getDatabase();

    // Get all question assignments for this course
    const assignments = await db
      .select({
        assignmentId: courseQuestionAssignments.id,
        questionId: courseQuestionAssignments.questionId,
        moduleId: courseQuestionAssignments.moduleId,
        isModuleSpecific: courseQuestionAssignments.isModuleSpecific,
        question: qbankQuestions.question,
        questionType: qbankQuestions.questionType,
        difficulty: qbankQuestions.difficulty,
        points: qbankQuestions.points,
      })
      .from(courseQuestionAssignments)
      .innerJoin(qbankQuestions, eq(courseQuestionAssignments.questionId, qbankQuestions.id))
      .where(eq(courseQuestionAssignments.courseId, courseId));

    return NextResponse.json({
      assignments: assignments.map((a) => ({
        id: a.assignmentId,
        questionId: a.questionId,
        moduleId: a.moduleId,
        isModuleSpecific: a.isModuleSpecific,
        question: a.question.substring(0, 100) + '...',
        questionType: a.questionType,
        difficulty: a.difficulty,
        points: a.points,
      })),
    });
  } catch (error: any) {
    console.error('Get course questions error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch course questions', error: error.message },
      { status: 500 }
    );
  }
}

// POST - Assign questions to course/module
export async function POST(request: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const token = request.cookies.get('adminToken')?.value;

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
    const token = request.cookies.get('adminToken')?.value;

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
