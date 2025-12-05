import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * File Upload API
 * Handles uploads for thumbnails, videos, documents, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('adminToken')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'thumbnail', 'video', 'document'

    if (!file) {
      return NextResponse.json({ message: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes: Record<string, string[]> = {
      thumbnail: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
      video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
      document: [
        'application/pdf',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
    };

    if (!allowedTypes[type] || !allowedTypes[type].includes(file.type)) {
      return NextResponse.json(
        { message: `Invalid file type for ${type}. Allowed: ${allowedTypes[type].join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size (10MB for images/documents, 500MB for videos)
    const maxSizes: Record<string, number> = {
      thumbnail: 10 * 1024 * 1024, // 10MB
      video: 500 * 1024 * 1024, // 500MB
      document: 50 * 1024 * 1024, // 50MB
    };

    if (file.size > maxSizes[type]) {
      return NextResponse.json(
        {
          message: `File too large. Max size for ${type}: ${Math.round(maxSizes[type] / 1024 / 1024)}MB`,
        },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', type);
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}-${randomStr}.${fileExtension}`;
    const filePath = join(uploadsDir, fileName);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return file URL
    const fileUrl = `/uploads/${type}/${fileName}`;

    console.log(`✅ File uploaded: ${fileUrl} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json(
      {
        message: 'Failed to upload file',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}



