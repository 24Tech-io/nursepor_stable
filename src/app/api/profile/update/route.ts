import { logger } from '@/lib/logger';
import { extractAndValidate, validateQueryParams, validateRouteParams } from '@/lib/api-validation';
import { updateProfileSchema } from '@/lib/validation-schemas-extended';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabaseWithRetry } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);

    if (!decoded || !decoded.id) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get database instance
    const db = await getDatabaseWithRetry();

    // Validate request body
    const bodyValidation = await extractAndValidate(request, updateProfileSchema);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }
    const body = bodyValidation.data;
    const { name, phone, bio } = body;

    // Update user in database
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      updateData.name = name.trim();
    }
    if (phone !== undefined) {
      updateData.phone = phone && phone.trim() ? phone.trim() : null;
    }
    if (bio !== undefined) {
      updateData.bio = bio && bio.trim() ? bio.trim() : null;
    }

    const updatedUser = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, decoded.id))
      .returning();

    if (!updatedUser.length) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    logger.info('✅ Profile updated for user:', decoded.id);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser[0].id,
        name: updatedUser[0].name,
        email: updatedUser[0].email,
        phone: updatedUser[0].phone || null,
        bio: updatedUser[0].bio || null,
        profilePicture: updatedUser[0].profilePicture || null,
        role: updatedUser[0].role,
      },
    });
  } catch (error: any) {
    logger.error('Update profile error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to update profile',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

