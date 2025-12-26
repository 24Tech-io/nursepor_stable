import { getDatabase } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Generate a 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Save OTP to database
export async function saveOTP(email: string, otp: string, role: string = 'student'): Promise<void> {
  const db = getDatabase();
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
  
  await db
    .update(users)
    .set({
      otpSecret: otp,
      otpExpiry: expiry,
    })
    .where(eq(users.email, email));
}

// Verify OTP from database
export async function verifyOTP(email: string, otp: string): Promise<boolean> {
  const db = getDatabase();
  
  const user = await db
    .select({
      otpSecret: users.otpSecret,
      otpExpiry: users.otpExpiry,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  
  if (!user.length || !user[0].otpSecret || !user[0].otpExpiry) {
    return false;
  }
  
  const now = new Date();
  const expiry = new Date(user[0].otpExpiry);
  
  if (now > expiry) {
    // OTP expired, clear it
    await db
      .update(users)
      .set({ otpSecret: null, otpExpiry: null })
      .where(eq(users.email, email));
    return false;
  }
  
  if (user[0].otpSecret !== otp) {
    return false;
  }
  
  // OTP is valid, clear it after use
  await db
    .update(users)
    .set({ otpSecret: null, otpExpiry: null })
    .where(eq(users.email, email));
  
  return true;
}

// Send OTP via email (placeholder - implement with your email service)
export async function sendOTPEmail(email: string, otp: string, name: string): Promise<void> {
  // In development, just log the OTP
  console.log(`📧 OTP for ${email}: ${otp}`);
  
  // TODO: Implement actual email sending
  // You can use nodemailer, sendgrid, etc.
  // Example with environment variables:
  // const transporter = nodemailer.createTransport({ ... });
  // await transporter.sendMail({
  //   from: process.env.EMAIL_FROM,
  //   to: email,
  //   subject: 'Your Login OTP - Nurse Pro Academy',
  //   html: `<p>Hello ${name},</p><p>Your OTP is: <strong>${otp}</strong></p><p>Valid for 10 minutes.</p>`
  // });
}

// Clear OTP from database
export async function clearOTP(email: string): Promise<void> {
  const db = getDatabase();
  
  await db
    .update(users)
    .set({ otpSecret: null, otpExpiry: null })
    .where(eq(users.email, email));
}









