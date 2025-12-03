import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getDatabase } from '@/lib/db';
import { payments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { enrollStudent } from '@/lib/data-manager/helpers/enrollment-helper';
import { executeWithIdempotency, checkIdempotency } from '@/lib/idempotency';
import { withEnrollmentLock } from '@/lib/operation-lock';
import { createErrorResponse, createValidationError } from '@/lib/error-handler';
import { retryDatabase } from '@/lib/retry';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 500 }
    );
  }

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    // Get database instance
    const db = getDatabase();

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
              console.warn(`⚠️ Payment not found for session: ${session.id}`);
              return { processed: false, reason: 'Payment not found' };
            }

            const paymentData = payment[0];

            // Skip if already processed
            if (paymentData.status === 'completed') {
              console.log(`ℹ️ Payment ${paymentData.id} already completed, skipping`);
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

            // Use DataManager with lock for enrollment (atomic operation)
            await withEnrollmentLock(paymentData.userId, paymentData.courseId, async () => {
              const enrollmentResult = await enrollStudent({
                userId: paymentData.userId,
                courseId: paymentData.courseId,
                source: 'payment',
              });

              if (!enrollmentResult.success) {
                console.error('❌ Error enrolling student after payment:', enrollmentResult.error);
                // Don't throw - payment is recorded, enrollment can be retried
              } else {
                console.log(`✅ Student ${paymentData.userId} enrolled in course ${paymentData.courseId} after payment`);
              }
            });

            return {
              processed: true,
              paymentId: paymentData.id,
              userId: paymentData.userId,
              courseId: paymentData.courseId,
            };
          },
          48 // 48 hour TTL for webhook idempotency
        );

        if (wasDuplicate) {
          console.log(`ℹ️ Webhook event ${event.id} already processed, returning cached result`);
        } else {
          console.log(`✅ Payment webhook processed for session: ${session.id}`);
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

            console.log('Payment failed for intent:', paymentIntent.id);
            return { processed: true };
          },
          24 // 24 hour TTL
        );

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return createErrorResponse(error, 'Webhook handler failed');
  }
}

