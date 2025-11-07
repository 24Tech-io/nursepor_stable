import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getDatabase } from '@/lib/db';
import { payments, studentProgress } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

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

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        
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

        // Enroll user in course
        const payment = await db
          .select()
          .from(payments)
          .where(eq(payments.stripeSessionId, session.id))
          .limit(1);

        if (payment.length > 0) {
          const paymentData = payment[0];
          
          // Check if progress already exists
          const existingProgress = await db
            .select()
            .from(studentProgress)
            .where(
              and(
                eq(studentProgress.studentId, paymentData.userId),
                eq(studentProgress.courseId, paymentData.courseId)
              )
            )
            .limit(1);

          // Create student progress if it doesn't exist
          if (existingProgress.length === 0) {
            await db.insert(studentProgress).values({
              studentId: paymentData.userId,
              courseId: paymentData.courseId,
              completedChapters: '[]',
              watchedVideos: '[]',
              quizAttempts: '[]',
              totalProgress: 0,
            });
          }
        }

        console.log('Payment successful for session:', session.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as any;
        
        // Update payment status to failed
        await db
          .update(payments)
          .set({
            status: 'failed',
            updatedAt: new Date(),
          })
          .where(eq(payments.stripePaymentIntentId, paymentIntent.id));

        console.log('Payment failed for intent:', paymentIntent.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

