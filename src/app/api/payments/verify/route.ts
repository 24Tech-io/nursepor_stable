import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseWithRetry } from '@/lib/db';
import { payments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';
import { enrollStudent } from '@/lib/data-manager/helpers/enrollment-helper';
import { withEnrollmentLock } from '@/lib/operation-lock';
import {
  createErrorResponse,
  createValidationError,
  createNotFoundError,
} from '@/lib/error-handler';
import { retryDatabase } from '@/lib/retry';

// Force dynamic rendering since we use searchParams
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return createValidationError('Session ID is required');
    }

    // Get database instance
    const db = await getDatabaseWithRetry();

    // Check payment status
    const payment: any = await retryDatabase(() =>
      db.select().from(payments).where(eq(payments.stripeSessionId, sessionId)).limit(1)
    );

    if (!payment.length) {
      return createNotFoundError('Payment not found');
    }

    const paymentData = payment[0];

    // If payment is still pending, check with Stripe
    if (paymentData.status === 'pending' && stripe) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status === 'paid') {
          // Update payment status
          await retryDatabase(() =>
            db
              .update(payments)
              .set({
                status: 'completed',
                stripePaymentIntentId: session.payment_intent as string,
                transactionId: session.id,
                updatedAt: new Date(),
              })
              .where(eq(payments.stripeSessionId, sessionId))
          );

          // Use DataManager with lock to ensure enrollment (atomic operation)
          await withEnrollmentLock(paymentData.userId, paymentData.courseId, async () => {
            const enrollmentResult = await enrollStudent({
              userId: paymentData.userId,
              courseId: paymentData.courseId,
              source: 'payment',
            });

            if (!enrollmentResult.success) {
              logger.error('Error enrolling student after payment verification:', enrollmentResult.error);
              // Don't throw - payment is recorded, enrollment can be retried
            }
          });

          return NextResponse.json({
            success: true,
            payment: {
              id: paymentData.id,
              status: 'completed',
              amount: paymentData.amount,
              courseId: paymentData.courseId,
            },
          });
        }
      } catch (stripeError: any) {
        logger.error('Error checking Stripe session:', stripeError);
        // Continue to return current payment status
      }
    }

    return NextResponse.json({
      success: paymentData.status === 'completed',
      payment: {
        id: paymentData.id,
        status: paymentData.status,
        amount: paymentData.amount,
        courseId: paymentData.courseId,
      },
    });
  } catch (error: any) {
    logger.error('Payment verification error:', error);
    return createErrorResponse(error, 'Failed to verify payment');
  }
}
