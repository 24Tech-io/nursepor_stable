import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { createCourseSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseWithRetry } from '@/lib/db';
import { courses } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth-helpers';
import { securityLogger } from '@/lib/logger';
import { getClientIP } from '@/lib/security-middleware';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const db = await getDatabaseWithRetry();
        const allCourses = await db.select().from(courses).orderBy(desc(courses.createdAt));

        return NextResponse.json({ courses: allCourses });
    } catch (error) {
        logger.error('Get courses error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const adminResult = await requireAdmin(request);
        if (adminResult instanceof NextResponse) {
            return adminResult;
        }
        const adminUser = adminResult.user;

        // Validate request body
        const bodyValidation = await extractAndValidate(request, createCourseSchema);
        if (!bodyValidation.success) {
            return bodyValidation.error;
        }
        const body = bodyValidation.data;
        const ip = getClientIP(request);
        const db = await getDatabaseWithRetry();

        // Create course
        const newCourse = await db.insert(courses).values({
            title: body.title,
            description: body.description || '',
            instructor: body.instructor || 'Nurse Pro Academy',
            pricing: body.pricing || 0,
            status: body.status || 'draft',
            isDefaultUnlocked: body.isDefaultUnlocked || false,
            isRequestable: body.isRequestable !== false,
            thumbnail: body.thumbnail || null,
        }).returning();

        securityLogger.info('Course Created', { courseId: newCourse[0].id, title: body.title, userId: (adminUser as any).id, ip });

        return NextResponse.json({
            message: 'Course created successfully',
            course: newCourse[0]
        });

    } catch (error) {
        logger.error('Create course error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
