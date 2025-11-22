import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { securityLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { phone, email } = body;

        // Accept either phone or email
        if (!phone && !email) {
            return NextResponse.json({ message: 'Phone number or email is required' }, { status: 400 });
        }

        // Find user by phone or email
        const [user] = await db.select().from(users).where(
            phone ? eq(users.phone, phone) : eq(users.email, email)
        );

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP in database with expiry (10 minutes)
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        await db.update(users)
            .set({
                otpSecret: otp,
                otpExpiry,
            })
            .where(eq(users.id, user.id));

        securityLogger.logSecurityEvent('OTP Generated', { userId: user.id, method: phone ? 'phone' : 'email' });

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`📱 OTP for ${phone || email}: ${otp}`);
        }

        return NextResponse.json({
            message: 'OTP sent successfully',
            // In development, return OTP for testing
            ...(process.env.NODE_ENV === 'development' && { otp })
        });
    } catch (error) {
        console.error('Send OTP error:', error);
        securityLogger.logSecurityEvent('OTP Send Error', { error: String(error) });
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
