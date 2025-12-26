/**
 * Course Q&A API
 * Questions and answers for courses
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { courseQuestions, courseAnswers } from '@/lib/db/schema';
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
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

