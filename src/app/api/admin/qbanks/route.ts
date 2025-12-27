import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { questionBanks, qbankQuestions } from '@/lib/db/schema';
import { eq, desc, sql, count } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { createQBankSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// GET - List all Q-Banks
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const auth = await verifyAuth(request, { requiredRole: 'admin' });
    if (!auth.isAuthorized) {
      return auth.response;
    }
    const { user: decoded } = auth;

    // Get all Q-Banks with question counts
    const qbanks = await db
      .select({
        id: questionBanks.id,
        name: questionBanks.name,
        description: questionBanks.description,
        courseId: questionBanks.courseId,
        status: questionBanks.status,
        isActive: questionBanks.isActive,
        createdAt: questionBanks.createdAt,
        updatedAt: questionBanks.updatedAt,
        questionCount: count(qbankQuestions.id),
      })
      .from(questionBanks)
      .leftJoin(qbankQuestions, eq(questionBanks.id, qbankQuestions.questionBankId))
      .groupBy(questionBanks.id)
      .orderBy(desc(questionBanks.createdAt));

    return NextResponse.json({ qbanks });
  } catch (error: any) {
    logger.error('Get Q-Banks error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch Q-Banks', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

// POST - Create new Q-Bank
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const auth = await verifyAuth(request, { requiredRole: 'admin' });
    if (!auth.isAuthorized) {
      return auth.response;
    }
    const { user: decoded } = auth;

    // Validate request body
    const bodyValidation = await extractAndValidate(request, createQBankSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const body = bodyValidation.data;
    const { title: name, description, courseId } = body;

    // Create new Q-Bank - default to 'published' so it's immediately visible to students
    // Admin can change to 'draft' if they want to work on it before publishing
    const [newQBank] = await db
      .insert(questionBanks)
      .values({
        name: name,
        description: description || null,
        courseId: courseId ? parseInt(String(courseId)) : null,
        status: 'published', // Default to published like courses
        isActive: true,
      })
      .returning();

    return NextResponse.json({ qbank: newQBank }, { status: 201 });
  } catch (error: any) {
    logger.error('Create Q-Bank error:', error);
    return NextResponse.json(
      { message: 'Failed to create Q-Bank', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
