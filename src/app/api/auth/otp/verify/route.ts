import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/auth';
import { securityLogger } from '@/lib/logger';
import { cookies } from 'next/headers';
import { getClientIP } from '@/lib/security-middleware';

export async function POST(request: Request) {
    try {
        const { email, otp, role } = await request.json();
        const ip = getClientIP(request);

        if (!email || !otp) {
            return NextResponse.json({ message: 'Email and OTP are required' }, { status: 400 });
        }

        // Find user
        const user = await db.query.users.findFirst({
            where: eq(users.email, email),
        });

        if (!user) {
            securityLogger.logFailedAuth(ip, email, 'User not found during OTP login');
            return NextResponse.json({ message: 'Invalid OTP' }, { status: 400 });
        }

        // Check if OTP exists and is not expired
        if (!user.otpSecret || !user.otpExpiry) {
            securityLogger.logFailedAuth(ip, email, 'No OTP requested');
            return NextResponse.json({ message: 'No OTP requested' }, { status: 400 });
        }

        if (new Date() > user.otpExpiry) {
            securityLogger.logFailedAuth(ip, email, 'OTP expired');
            return NextResponse.json({ message: 'OTP expired' }, { status: 400 });
        }

        // Verify OTP
        const isValid = await bcrypt.compare(otp, user.otpSecret);

        if (!isValid) {
            securityLogger.logFailedAuth(ip, email, 'Invalid OTP');
            return NextResponse.json({ message: 'Invalid OTP' }, { status: 400 });
        }

        // Clear OTP
        await db.update(users)
            .set({
                otpSecret: null,
                otpExpiry: null,
            })
            .where(eq(users.id, user.id));

        // Check role if specified
        if (role && user.role !== role) {
            securityLogger.logUnauthorizedAccess(ip, '/api/auth/otp/verify', user.id.toString());
            return NextResponse.json({ message: 'Unauthorized role' }, { status: 403 });
        }

        // Generate Token
        const token = generateToken({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            phone: user.phone,
            bio: user.bio,
            faceIdEnrolled: user.faceIdEnrolled || false,
            fingerprintEnrolled: user.fingerprintEnrolled || false,
            twoFactorEnabled: user.twoFactorEnabled || false,
            joinedDate: user.joinedDate,
        });

        // Set Cookie
        cookies().set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        securityLogger.logSuccessfulAuth(ip, email);

        return NextResponse.json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });

    } catch (error) {
        console.error('Verify OTP error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
