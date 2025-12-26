/**
 * Certificate Generation API
 * Generate completion certificates for courses
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { certificates, studentProgress } from '@/lib/db/schema';
import { verifyToken } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { extractAndValidate } from '@/lib/api-validation';
import { generateCertificateSchema } from '@/lib/validation-schemas-extended';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Validate request body
    const bodyValidation = await extractAndValidate(request, generateCertificateSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const { courseId } = bodyValidation.data;

    // Check if course is completed
    const progress = await db.query.studentProgress.findFirst({
      where: and(eq(studentProgress.studentId, user.id), eq(studentProgress.courseId, courseId)),
    });

    if (!progress || progress.completionPercentage < 100) {
      return NextResponse.json(
        { error: 'Course not completed. Complete all modules to get certificate.' },
        { status: 400 }
      );
    }

    // Check if certificate already exists
    const existing = await db.query.certificates.findFirst({
      where: and(eq(certificates.userId, user.id), eq(certificates.courseId, courseId)),
    });

    if (existing) {
      return NextResponse.json({
        certificate: existing,
        message: 'Certificate already generated',
      });
    }

    // Generate certificate number
    const certificateNumber = `NPA-${Date.now()}-${user.id}-${courseId}`;

    // Create certificate
    const [certificate] = await db
      .insert(certificates)
      .values({
        userId: user.id,
        courseId,
        certificateNumber,
        completedAt: progress.completedAt || new Date(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      certificate,
      message: 'Certificate generated successfully!',
    });
  } catch (error: any) {
    logger.error('Generate certificate error:', error);
    return NextResponse.json(
      { error: 'Failed to generate certificate' },
      { status: 500 }
    );
  }
}
