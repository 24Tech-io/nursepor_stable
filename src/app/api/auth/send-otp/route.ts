import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseWithRetry } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { z } from 'zod';

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { message: 'Email is required' },
                { status: 400 }
            );
        }

        const db = await getDatabaseWithRetry();
        const normalizedEmail = email.toLowerCase().trim();

        // Check if user exists
        const userResult = await db
            .select()
            .from(users)
            .where(eq(users.email, normalizedEmail))
            .limit(1);

        if (!userResult.length) {
            return NextResponse.json(
                { message: 'No account found with this email' },
                { status: 404 }
            );
        }

        const user = userResult[0];

        // Rate limiting: Check if OTP was recently sent (within 2 minutes)
        if (user.otpExpiry && user.otpExpiry > new Date(Date.now() - 2 * 60 * 1000)) {
            return NextResponse.json(
                { message: 'OTP was recently sent. Please wait before requesting again.' },
                { status: 429 }
            );
        }

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP in user record
        await db.update(users)
            .set({
                otpSecret: otp,
                otpExpiry: expiresAt,
            })
            .where(eq(users.id, user.id));

        // Log OTP for development (in production, send via email)
        if (process.env.NODE_ENV === 'development') {
            logger.info(`🔐 OTP for ${email}: ${otp} (expires in 10 minutes)`);
        }

        // Note: Email sending should be implemented in production
        // await sendEmail({
        //   to: email,
        //   subject: 'Your Login OTP - NursePro Academy',
        //   html: `
        //     <h2>Your Login OTP</h2>
        //     <p>Your one-time password is: <strong>${otp}</strong></p>
        //     <p>This code will expire in 10 minutes.</p>
        //     <p>If you didn't request this code, please ignore this email.</p>
        //   `
        // });

        return NextResponse.json({
            message: 'OTP sent successfully. Please check your email.',
            // Tell client if 2FA is enabled (password will be required)
            requires2FAPassword: user.twoFactorEnabled || false,
            // In development, include OTP in response for testing
            ...(process.env.NODE_ENV === 'development' && { otp, expiresAt }),
        });
    } catch (error: any) {
        logger.error('Send OTP error:', error);
        return NextResponse.json(
            { message: 'Failed to send OTP', error: error.message },
            { status: 500 }
        );
    }

    const db = getDatabase();
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!userResult.length) {
      return NextResponse.json({ message: 'No account found with this email' }, { status: 404 });
    }

    const user = userResult[0];

    // Rate limiting: Check if OTP was recently sent (within 2 minutes)
    if (user.otpExpiry && user.otpExpiry > new Date(Date.now() - 2 * 60 * 1000)) {
      return NextResponse.json(
        { message: 'OTP was recently sent. Please wait before requesting again.' },
        { status: 429 }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in user record
    await db
      .update(users)
      .set({
        otpSecret: otp,
        otpExpiry: expiresAt,
      })
      .where(eq(users.id, user.id));

    // Log OTP for development (in production, send via email)
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 OTP for ${email}: ${otp} (expires in 10 minutes)`);
    }

    // TODO: Send email with OTP in production
    // await sendEmail({
    //   to: email,
    //   subject: 'Your Login OTP - NursePro Academy',
    //   html: `
    //     <h2>Your Login OTP</h2>
    //     <p>Your one-time password is: <strong>${otp}</strong></p>
    //     <p>This code will expire in 10 minutes.</p>
    //     <p>If you didn't request this code, please ignore this email.</p>
    //   `
    // });

    return NextResponse.json({
      message: 'OTP sent successfully. Please check your email.',
      // In development, include OTP in response for testing
      ...(process.env.NODE_ENV === 'development' && { otp, expiresAt }),
    });
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { message: 'Failed to send OTP', error: error.message },
      { status: 500 }
    );
  }
}
