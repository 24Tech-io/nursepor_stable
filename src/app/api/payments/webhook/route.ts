import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getDatabaseWithRetry } from '@/lib/db';
import { payments, textbookPurchases } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { enrollStudent } from '@/lib/data-manager/helpers/enrollment-helper';
import { executeWithIdempotency, checkIdempotency } from '@/lib/idempotency';
import { withEnrollmentLock } from '@/lib/operation-lock';
import { createErrorResponse, createValidationError } from '@/lib/error-handler';
import { retryDatabase } from '@/lib/retry';
import { log } from '@/lib/logger-helper';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
  }

  if (!webhookSecret) {
    log.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    log.error('Webhook signature verification failed', { error: err.message });
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    // Get database instance
    const db = await getDatabaseWithRetry();

    // Handle the event with idempotency
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;

        // Use idempotency to prevent duplicate processing
        const idempotencyParams = {
          eventId: event.id,
          sessionId: session.id,
          type: 'checkout.session.completed',
        };

        const { result, wasDuplicate } = await executeWithIdempotency(
          'payment_webhook',
          idempotencyParams,
          async () => {
            // Update payment status and get payment data
            const payment = await db
              .select()
              .from(payments)
              .where(eq(payments.stripeSessionId, session.id))
              .limit(1);

            if (payment.length === 0) {
              log.warn('Payment not found for session', { sessionId: session.id });
              return { processed: false, reason: 'Payment not found' };
            }

            const paymentData = payment[0];

            // Skip if already processed
            if (paymentData.status === 'completed') {
              log.debug('Payment already completed, skipping', { paymentId: paymentData.id });
              return { processed: false, reason: 'Already completed' };
            }

            // Update payment status
            await db
              .update(payments)
              .set({
                status: 'completed',
                stripePaymentIntentId: session.payment_intent,
                transactionId: session.id,
                updatedAt: new Date(),
              })
              .where(eq(payments.stripeSessionId, session.id));

            // Handle based on item type
            const itemType = paymentData.itemType || session.metadata?.itemType || 'course';
            
            if (itemType === 'textbook') {
              // Handle textbook purchase
              const textbookId = paymentData.textbookId || parseInt(session.metadata?.textbookId || '0');
              
              if (!textbookId) {
                log.error('Textbook ID not found in payment metadata', { paymentId: paymentData.id });
                return { processed: false, reason: 'Textbook ID missing' };
              }

              // Check if purchase already exists
              const existingPurchase = await db
                .select()
                .from(textbookPurchases)
                .where(
                  and(
                    eq(textbookPurchases.studentId, paymentData.userId),
                    eq(textbookPurchases.textbookId, textbookId)
                  )
                )
                .limit(1);

              if (existingPurchase.length === 0) {
                // Create textbook purchase record
                await db.insert(textbookPurchases).values({
                  studentId: paymentData.userId,
                  textbookId,
                  paymentId: paymentData.id,
                  amount: paymentData.amount,
                  currency: paymentData.currency,
                  status: 'completed',
                });

                log.info('Textbook purchase created', { studentId: paymentData.userId, textbookId });
              } else {
                log.debug('Textbook purchase already exists', { studentId: paymentData.userId, textbookId });
              }
            } else {
              // Handle course enrollment (existing logic)
              if (!paymentData.courseId) {
                log.error('Course ID not found in payment data', { paymentId: paymentData.id });
                return { processed: false, reason: 'Course ID missing' };
              }

              // Use DataManager with lock for enrollment (atomic operation)
              await withEnrollmentLock(paymentData.userId, paymentData.courseId, async () => {
                const enrollmentResult = await enrollStudent({
                  userId: paymentData.userId,
                  courseId: paymentData.courseId,
                  source: 'payment',
                });

                if (!enrollmentResult.success) {
                  log.error('Error enrolling student after payment', { error: enrollmentResult.error, userId: paymentData.userId, courseId: paymentData.courseId });
                  // Don't throw - payment is recorded, enrollment can be retried
                } else {
                  log.info('Student enrolled in course after payment', { userId: paymentData.userId, courseId: paymentData.courseId });
                }
              });
            }

            return {
              processed: true,
              paymentId: paymentData.id,
              userId: paymentData.userId,
              courseId: paymentData.courseId,
              itemType,
            };
          },
          48 // 48 hour TTL for webhook idempotency
        );

        if (wasDuplicate) {
          log.debug('Webhook event already processed, returning cached result', { eventId: event.id });
        } else {
          log.info('Payment webhook processed', { sessionId: session.id });
        }

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as any;

        // Use idempotency for failed payments too
        const idempotencyParams = {
          eventId: event.id,
          paymentIntentId: paymentIntent.id,
          type: 'payment_intent.payment_failed',
        };

        await executeWithIdempotency(
          'payment_webhook',
          idempotencyParams,
          async () => {
            // Update payment status to failed
            await db
              .update(payments)
              .set({
                status: 'failed',
                updatedAt: new Date(),
              })
              .where(eq(payments.stripePaymentIntentId, paymentIntent.id));

            log.info('Payment failed for intent', { paymentIntentId: paymentIntent.id });
            return { processed: true };
          },
          24 // 24 hour TTL
        );

        break;
      }

      default:
        log.debug('Unhandled event type', { eventType: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    log.error('Webhook handler error', error);
    return createErrorResponse(error, 'Webhook handler failed');
  }
}
