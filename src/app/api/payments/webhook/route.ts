import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getDatabase } from '@/lib/db';
import { payments, studentProgress, enrollments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { enrollStudent } from '@/lib/data-manager/helpers/enrollment-helper';

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
        
        // Update payment status and get payment data in one transaction
        const payment = await db
          .select()
          .from(payments)
          .where(eq(payments.stripeSessionId, session.id))
          .limit(1);

        if (payment.length > 0) {
          const paymentData = payment[0];
          
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

          // Use DataManager for enrollment (with validation, transaction, dual-table sync, and events)
          const enrollmentResult = await enrollStudent({
            userId: paymentData.userId,
            courseId: paymentData.courseId,
            source: 'payment',
          });

          if (!enrollmentResult.success) {
            console.error('❌ Error enrolling student after payment:', enrollmentResult.error);
            // Don't fail webhook - payment is recorded, enrollment can be retried
          } else {
            console.log(`✅ Student ${paymentData.userId} enrolled in course ${paymentData.courseId} after payment`);
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

