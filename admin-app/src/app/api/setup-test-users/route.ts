import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { users } from '@/lib/db/schema';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const db = getDatabase();

    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    const studentPassword = await bcrypt.hash('student123', 10);

    const results = [];

    // Create admin user
    try {
      await db.insert(users).values({
        name: 'Admin User',
        email: 'admin@test.com',
        password: adminPassword,
        phone: '+1234567890',
        role: 'admin',
        isActive: true,
        faceIdEnrolled: false,
        fingerprintEnrolled: false,
        twoFactorEnabled: false,
      });
      results.push('✅ Admin user created: admin@test.com / admin123');
    } catch (e: any) {
      if (e.message && e.message.includes('UNIQUE')) {
        results.push('⚠️  Admin user already exists');
      } else {
        throw e;
      }
    }

    // Create student user
    try {
      await db.insert(users).values({
        name: 'Test Student',
        email: 'student@test.com',
        password: studentPassword,
        phone: '+1234567891',
        role: 'student',
        isActive: true,
        faceIdEnrolled: false,
        fingerprintEnrolled: false,
        twoFactorEnabled: false,
      });
      results.push('✅ Student user created: student@test.com / student123');
    } catch (e: any) {
      if (e.message && e.message.includes('UNIQUE')) {
        results.push('⚠️  Student user already exists');
      } else {
        throw e;
      }
    }

    return NextResponse.json({
      message: 'Test users setup complete',
      results,
      credentials: {
        admin: { email: 'admin@test.com', password: 'admin123' },
        student: { email: 'student@test.com', password: 'student123' },
      },
    });
  } catch (error: any) {
    console.error('Error creating test users:', error);
    return NextResponse.json(
      { message: 'Failed to create test users', error: error.message },
      { status: 500 }
    );
  }
}
