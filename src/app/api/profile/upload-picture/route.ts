import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helpers';
import { getDatabaseWithRetry } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request: NextRequest) {
  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const user = authResult.user;

  // Get database instance
  const db = await getDatabaseWithRetry();

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Enhanced file validation
    const blockedExtensions = ['exe', 'bat', 'sh', 'php', 'js', 'html', 'htm', 'svg', 'xml', 'jar', 'war'];

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' },
        { status: 400 }
      );
    }

    // Validate file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension && blockedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { error: 'File type not allowed for security reasons' },
        { status: 400 }
      );
    }

    // Validate MIME type matches extension
    const expectedMimeTypes: Record<string, string[]> = {
      'jpg': ['image/jpeg', 'image/jpg'],
      'jpeg': ['image/jpeg', 'image/jpg'],
      'png': ['image/png'],
      'webp': ['image/webp'],
      'gif': ['image/gif'],
    };

    if (fileExtension && expectedMimeTypes[fileExtension]) {
      if (!expectedMimeTypes[fileExtension].includes(file.type)) {
        return NextResponse.json(
          { error: 'File type mismatch detected. MIME type does not match file extension.' },
          { status: 400 }
        );
      }
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
    }

    // Additional security: Validate file is actually an image
    if (file.size < 100) {
      return NextResponse.json(
        { error: 'File appears to be invalid or corrupted' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'profile-pictures');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename: userId_timestamp.extension
    const timestamp = Date.now();
    const filename = `${user.id}_${timestamp}.${fileExtension}`;
    const filepath = join(uploadsDir, filename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Generate public URL
    const publicUrl = `/uploads/profile-pictures/${filename}`;

    // Update user's profile picture in database
    await db
      .update(users)
      .set({
        profilePicture: publicUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    logger.info(`✅ Profile picture uploaded for user ${user.id}: ${publicUrl}`);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      message: 'Profile picture uploaded successfully',
    });
  } catch (error: any) {
    logger.error('Profile picture upload error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload profile picture',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
