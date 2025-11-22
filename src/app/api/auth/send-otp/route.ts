import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { users, otpCodes } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';

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

        const db = getDatabase();
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

        // Rate limiting: Check recent OTP requests (max 3 per 15 minutes)
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        const recentOTPs = await db
            .select()
            .from(otpCodes)
            .where(
                and(
                    eq(otpCodes.email, normalizedEmail),
                    gt(otpCodes.createdAt, fifteenMinutesAgo)
                )
            );

        if (recentOTPs.length >= 3) {
            return NextResponse.json(
                { message: 'Too many OTP requests. Please try again in 15 minutes.' },
                { status: 429 }
            );
        }

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP in database
        await db.insert(otpCodes).values({
            email: normalizedEmail,
            code: otp,
            expiresAt,
            used: false,
            attempts: 0,
        });

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
