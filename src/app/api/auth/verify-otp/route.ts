import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { users, otpCodes } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export async function POST(request: NextRequest) {
    try {
        const { email, otp, role } = await request.json();

        if (!email || !otp) {
            return NextResponse.json(
                { message: 'Email and OTP are required' },
                { status: 400 }
            );
        }

        const db = getDatabase();
        const normalizedEmail = email.toLowerCase().trim();

        // Find valid OTP
        const validOTPs = await db
            .select()
            .from(otpCodes)
            .where(
                and(
                    eq(otpCodes.email, normalizedEmail),
                    eq(otpCodes.code, otp),
                    eq(otpCodes.used, false),
                    gt(otpCodes.expiresAt, new Date())
                )
            )
            .limit(1);

        if (!validOTPs.length) {
            // Check if OTP exists but is expired or used
            const anyOTP = await db
                .select()
                .from(otpCodes)
                .where(
                    and(
                        eq(otpCodes.email, normalizedEmail),
                        eq(otpCodes.code, otp)
                    )
                )
                .limit(1);

            if (anyOTP.length) {
                const otpRecord = anyOTP[0];
                if (otpRecord.used) {
                    return NextResponse.json(
                        { message: 'This OTP has already been used' },
                        { status: 400 }
                    );
                }
                if (otpRecord.expiresAt < new Date()) {
                    return NextResponse.json(
                        { message: 'This OTP has expired. Please request a new one.' },
                        { status: 400 }
                    );
                }
            }

            // Increment attempts
            return NextResponse.json(
                { message: 'Invalid OTP. Please check and try again.' },
                { status: 400 }
            );
        }

        const otpRecord = validOTPs[0];

        // Check attempts limit
        if (otpRecord.attempts >= 5) {
            return NextResponse.json(
                { message: 'Too many failed attempts. Please request a new OTP.' },
                { status: 429 }
            );
        }

        // Find user
        const userResult = await db
            .select()
            .from(users)
            .where(eq(users.email, normalizedEmail))
            .limit(1);

        if (!userResult.length) {
            return NextResponse.json(
                { message: 'User not found' },
                { status: 404 }
            );
        }

        const user = userResult[0];

        // Check role if specified
        if (role && user.role !== role) {
            return NextResponse.json(
                { message: `This account is not a ${role} account` },
                { status: 403 }
            );
        }

        // Mark OTP as used
        await db
            .update(otpCodes)
            .set({ used: true })
            .where(eq(otpCodes.id, otpRecord.id));

        // Update last login
        await db
            .update(users)
            .set({ lastLogin: new Date() })
            .where(eq(users.id, user.id));

        // Generate JWT token
        const token = await new SignJWT({
            userId: user.id,
            email: user.email,
            role: user.role,
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('7d')
            .sign(JWT_SECRET);

        // Set cookie
        const response = NextResponse.json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });

        const cookieName = user.role === 'admin' ? 'adminToken' : 'token';
        response.cookies.set(cookieName, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        return response;
    } catch (error: any) {
        console.error('Verify OTP error:', error);
        return NextResponse.json(
            { message: 'Failed to verify OTP', error: error.message },
            { status: 500 }
        );
    }
}
