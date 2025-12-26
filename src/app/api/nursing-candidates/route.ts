import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { getDatabaseWithRetry } from '@/lib/db';
import { nursingCandidateForms } from '@/lib/db/schema';
import { normalizeNursingCandidatePayload } from '@/lib/nursing-candidate';
import { sendNursingCandidateSubmissionEmail } from '@/lib/email';
import { getClientIP, rateLimit, validateBodySize } from '@/lib/security';
import { verifyToken } from '@/lib/auth';
import type { NursingCandidateFormPayload } from '@/types/nursing-candidate';

const MAX_BODY_SIZE = 80 * 1024; // 80 KB

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const limiter = rateLimit(`nursing-form:${clientIP}`, 5, 60 * 60 * 1000);
    if (!limiter.allowed) {
      return NextResponse.json(
        {
          message: 'Too many submissions from this device. Please try again later.',
          retryAfterSeconds: Math.ceil((limiter.resetTime - Date.now()) / 1000),
        },
        { status: 429 }
      );
    }

    const rawBody = await request.text();
    if (!validateBodySize(rawBody, MAX_BODY_SIZE)) {
      return NextResponse.json(
        { message: 'Submission too large. Please reduce attachment text.' },
        { status: 413 }
      );
    }

    let parsedBody: any;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
    }

    let normalized: NursingCandidateFormPayload;
    try {
      normalized = normalizeNursingCandidatePayload(parsedBody);
    } catch (error: any) {
      return NextResponse.json({ message: error?.message || 'Invalid data submitted' }, { status: 400 });
    }

    const referenceNumber = `NPA-${Date.now()}`;
    const db = await getDatabaseWithRetry();

    const [record] = await db
      .insert(nursingCandidateForms)
      .values({
        referenceNumber,
        personalDetails: normalized.personalDetails,
        educationDetails: normalized.educationDetails,
        registrationDetails: normalized.registrationDetails,
        employmentHistory: normalized.employmentHistory,
        canadaEmploymentHistory: normalized.canadaEmploymentHistory,
        nclexHistory: normalized.nclexHistory,
        targetCountry: normalized.targetCountry,
        documentChecklistAcknowledged: normalized.documentChecklistAcknowledged,
        disciplinaryAction: normalized.registrationDetails.hasDisciplinaryAction,
        documentEmailStatus: 'pending',
      })
      .returning();

    let emailStatus: 'sent' | 'skipped' | 'failed' = 'skipped';
    let emailError: string | null = null;

    try {
      const payloadWithRef: NursingCandidateFormPayload = {
        ...normalized,
        referenceNumber,
      };
      emailStatus = await sendNursingCandidateSubmissionEmail(payloadWithRef, referenceNumber);
    } catch (error: any) {
      emailStatus = 'failed';
      emailError = error?.message || 'Unknown email error';
    }

    await db
      .update(nursingCandidateForms)
      .set({
        documentEmailStatus: emailStatus,
        documentEmailError: emailError,
        updatedAt: new Date(),
      })
      .where(eq(nursingCandidateForms.id, record.id));

    return NextResponse.json(
      {
        message: 'Submission received successfully',
        referenceNumber,
        emailStatus,
      },
      { status: 201 }
    );
  } catch (error: any) {
    logger.error('Nursing candidate submission error:', error);
    return NextResponse.json(
      {
        message: 'Unable to submit your information right now. Please try again shortly.',
        error: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const db = await getDatabaseWithRetry();
    const submissions = await db
      .select()
      .from(nursingCandidateForms)
      .orderBy(desc(nursingCandidateForms.createdAt));

    return NextResponse.json({
      submissions: submissions.map((submission: any) => ({
        id: submission.id,
        referenceNumber: submission.referenceNumber,
        personalDetails: submission.personalDetails,
        educationDetails: submission.educationDetails,
        registrationDetails: submission.registrationDetails,
        employmentHistory: submission.employmentHistory,
        canadaEmploymentHistory: submission.canadaEmploymentHistory,
        nclexHistory: submission.nclexHistory,
        targetCountry: submission.targetCountry,
        disciplinaryAction: submission.disciplinaryAction,
        documentChecklistAcknowledged: submission.documentChecklistAcknowledged,
        documentEmailStatus: submission.documentEmailStatus,
        documentEmailError: submission.documentEmailError,
        createdAt: submission.createdAt?.toISOString?.() ?? submission.createdAt,
        updatedAt: submission.updatedAt?.toISOString?.() ?? submission.updatedAt,
      })),
    });
  } catch (error: any) {
    logger.error('Failed to fetch nursing candidate submissions:', error);
    return NextResponse.json(
      {
        message: 'Failed to fetch submissions',
        error: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

