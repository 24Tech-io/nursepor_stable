# Stripe Payment Setup Guide

This guide will help you configure Stripe payments for your Nurse Pro Academy.

## Step 1: Create a Stripe Account

1. Go to [Stripe](https://stripe.com/)
2. Sign up for a free account
3. Complete the account setup process
4. You'll get access to your Stripe Dashboard

## Step 2: Get Your Stripe API Keys

1. Go to your [Stripe Dashboard](https://dashboard.stripe.com/)
2. Click on "Developers" → "API keys"
3. You'll see two keys:
   - **Publishable key** (starts with `pk_test_` for test mode)
   - **Secret key** (starts with `sk_test_` for test mode)

**Important:** 
- Use test keys for development
- Use live keys for production (after testing)

## Step 3: Set Up Webhook

1. In Stripe Dashboard, go to "Developers" → "Webhooks"
2. Click "Add endpoint"
3. Enter your webhook URL:
   ```
   http://localhost:3000/api/payments/webhook
   ```
   (For production, use your actual domain)
4. Select events to listen to:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
5. Copy the **Webhook signing secret** (starts with `whsec_`)

## Step 4: Add Environment Variables

Add these to your `.env.local` file:

```env
# Stripe Keys (REQUIRED)
STRIPE_SECRET_KEY="sk_test_your_secret_key_here"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your_publishable_key_here"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret_here"
```

## Step 5: Run Database Migration

The payment tables need to be created in your database:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

This will create the `payments` table in your Neon database.

## Step 6: Test the Payment Flow

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Go to a course with pricing (e.g., `/student/courses`)
3. Click "Buy Now" on a locked course
4. You'll be redirected to Stripe Checkout
5. Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC
   - Any ZIP code

## Step 7: Test Webhook Locally (Optional)

For local webhook testing, use Stripe CLI:

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:3000/api/payments/webhook`
4. Copy the webhook secret from the CLI output to `.env.local`

## Payment Flow

1. **User clicks "Buy Now"** → Creates Stripe Checkout Session
2. **User completes payment** → Stripe redirects to success page
3. **Webhook receives event** → Updates payment status and enrolls user
4. **User gains access** → Course is unlocked automatically

## Features

✅ Secure payment processing with Stripe
✅ Automatic course enrollment after payment
✅ Payment history tracking
✅ Support for INR (Indian Rupees)
✅ Webhook-based payment verification
✅ Prevents duplicate purchases

## Troubleshooting

### Payment button not showing
- Check if course has pricing set
- Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set

### Webhook not working
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Check webhook URL in Stripe Dashboard
- For local testing, use Stripe CLI

### Payment succeeds but course not unlocked
- Check webhook logs in Stripe Dashboard
- Verify database migration ran successfully
- Check server logs for errors

## Production Checklist

- [ ] Switch to live Stripe keys
- [ ] Update webhook URL to production domain
- [ ] Test payment flow end-to-end
- [ ] Set up proper error monitoring
- [ ] Configure refund policies
- [ ] Set up email notifications for payments

## Support

For Stripe-specific issues, check:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com/)

