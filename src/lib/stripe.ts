import Stripe from 'stripe';

// Initialize Stripe only if secret key is provided
let stripe: Stripe | null = null;

if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia' as any,
    typescript: true,
  });
  // Only log in development mode to avoid build warnings
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Stripe payment configured');
  }
} else {
  // Only warn in development mode to avoid build warnings
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ Stripe not configured - payment features will be disabled');
    console.warn('   To enable payments, add STRIPE_SECRET_KEY to .env.local');
  }
}

export { stripe };

// Helper function to convert INR to paise (Stripe's smallest currency unit)
export function convertToStripeAmount(amount: number, currency: string = 'INR'): number {
  // For INR, amount is in rupees, convert to paise (multiply by 100)
  if (currency === 'INR') {
    return Math.round(amount * 100);
  }
  // For other currencies, adjust as needed
  return Math.round(amount * 100);
}

// Helper function to convert from paise to INR
export function convertFromStripeAmount(amount: number, currency: string = 'INR'): number {
  if (currency === 'INR') {
    return amount / 100;
  }
  return amount / 100;
}
