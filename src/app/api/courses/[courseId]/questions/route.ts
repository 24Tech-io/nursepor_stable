/**
 * Course Q&A API
 * Questions and answers for courses
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { courseQuestions, courseAnswers } from '@/lib/db/schema';
import { verifyToken } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';

// GET - Get questions for a course
export async function GET(request: NextRequest, { params }: { params: { courseId: string } }) {
  try {
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
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}

// POST - Create a question
export async function POST(request: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const courseId = parseInt(params.courseId);
    const { question, chapterId } = await request.json();

    if (!question || question.trim().length < 10) {
      return NextResponse.json(
        { error: 'Question must be at least 10 characters' },
        { status: 400 }
      );
    }

    const [newQuestion] = await db
      .insert(courseQuestions)
      .values({
        courseId,
        chapterId: chapterId || null,
        userId: user.id,
        question: question.trim(),
      })
      .returning();

    return NextResponse.json({ success: true, question: newQuestion });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
  }
}
