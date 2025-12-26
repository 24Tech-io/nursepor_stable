import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseWithRetry } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { z } from 'zod';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export async function POST(request: NextRequest) {
    try {
        const { email, otp, role, password } = await request.json();

        if (!email || !otp) {
            return NextResponse.json(
                { message: 'Email and OTP are required' },
                { status: 400 }
            );
        }

        const db = await getDatabaseWithRetry();
        const normalizedEmail = email.toLowerCase().trim();

        // Find user - filter by role if specified
        const whereConditions = role
            ? and(eq(users.email, normalizedEmail), eq(users.role, role), eq(users.isActive, true))
            : and(eq(users.email, normalizedEmail), eq(users.isActive, true));
        
        const userResult = await db
            .select()
            .from(users)
            .where(whereConditions)
            .limit(1);

        if (!userResult.length) {
            if (role) {
                return NextResponse.json(
                    { message: `No ${role} account found with this email. Please check your credentials or register a ${role} account.` },
                    { status: 404 }
                );
            }
            return NextResponse.json(
                { message: 'User not found' },
                { status: 404 }
            );
        }

        const user = userResult[0];

        // Check if user has 2FA enabled - they need to provide password too
        if (user.twoFactorEnabled && !password) {
            return NextResponse.json(
                { 
                    message: 'Two-Factor Authentication is enabled. Password is required for OTP login.',
                    requires2FAPassword: true
                },
                { status: 400 }
            );
        }

        // If 2FA is enabled, verify password
        if (user.twoFactorEnabled && password) {
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return NextResponse.json(
                    { message: 'Invalid password' },
                    { status: 401 }
                );
            }
        }

        // Verify OTP
        if (!user.otpSecret || !user.otpExpiry) {
            return NextResponse.json(
                { message: 'No OTP found. Please request a new one.' },
                { status: 400 }
            );
        }

        if (user.otpExpiry < new Date()) {
            return NextResponse.json(
                { message: 'This OTP has expired. Please request a new one.' },
                { status: 400 }
            );
        }

        if (user.otpSecret !== otp) {
            return NextResponse.json(
                { message: 'Invalid OTP. Please check and try again.' },
                { status: 400 }
            );
        }

        // Clear OTP after successful verification
        await db
            .update(users)
            .set({ 
                otpSecret: null, 
                otpExpiry: null 
            })
            .where(eq(users.id, user.id));

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
                twoFactorEnabled: user.twoFactorEnabled || false,
            },
            redirectUrl: user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard',
        });

        // Use student_token for students for consistency
        const cookieName = user.role === 'admin' ? 'adminToken' : 'student_token';
        response.cookies.set(cookieName, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        return response;
    } catch (error: any) {
        logger.error('Verify OTP error:', error);
        return NextResponse.json(
            { message: 'Failed to verify OTP', error: error.message },
            { status: 500 }
        );
    }
}
