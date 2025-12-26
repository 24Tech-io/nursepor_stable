import { logger } from '@/lib/logger';
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
        const token = request.cookies.get('admin_token')?.value || request.cookies.get('adminToken')?.value || request.cookies.get('token')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
        }

        const decoded = await verifyToken(token);
        if (!decoded || decoded.role !== 'admin') {
            return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const fileType = formData.get('type') as string || 'image'; // 'image' or 'video'

        if (!file) {
            return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
        }

        // Enhanced file validation
        const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'];
        const allowedDocumentTypes = [
            'application/pdf',
            'application/msword', // .doc
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/vnd.ms-powerpoint', // .ppt
            'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
            'text/plain' // .txt
        ];
        const blockedExtensions = ['exe', 'bat', 'sh', 'php', 'js', 'html', 'htm', 'svg', 'xml', 'jar', 'war'];

        // Validate file type based on upload type
        if (fileType === 'video') {
            if (!allowedVideoTypes.includes(file.type)) {
                return NextResponse.json({
                    message: 'Invalid file type. Only MP4, WebM, OGG, MOV, and AVI videos are allowed'
                }, { status: 400 });
            }
        } else if (fileType === 'document') {
            if (!allowedDocumentTypes.includes(file.type)) {
                return NextResponse.json({
                    message: 'Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, and TXT documents are allowed'
                }, { status: 400 });
            }
        } else {
            if (!allowedImageTypes.includes(file.type)) {
                return NextResponse.json({
                    message: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed'
                }, { status: 400 });
            }
        }

        // Validate file extension
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        if (fileExtension && blockedExtensions.includes(fileExtension)) {
            return NextResponse.json({
                message: 'File type not allowed for security reasons'
            }, { status: 400 });
        }

        // Validate MIME type matches extension
        const expectedImageMimeTypes: Record<string, string[]> = {
            'jpg': ['image/jpeg', 'image/jpg'],
            'jpeg': ['image/jpeg', 'image/jpg'],
            'png': ['image/png'],
            'webp': ['image/webp'],
        };

        const expectedVideoMimeTypes: Record<string, string[]> = {
            'mp4': ['video/mp4'],
            'webm': ['video/webm'],
            'ogg': ['video/ogg'],
            'mov': ['video/quicktime'],
            'avi': ['video/x-msvideo'],
        };

        const expectedDocumentMimeTypes: Record<string, string[]> = {
            'pdf': ['application/pdf'],
            'doc': ['application/msword'],
            'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            'ppt': ['application/vnd.ms-powerpoint'],
            'pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
            'txt': ['text/plain'],
        };

        if (fileType === 'video') {
            if (fileExtension && expectedVideoMimeTypes[fileExtension]) {
                if (!expectedVideoMimeTypes[fileExtension].includes(file.type)) {
                    return NextResponse.json({
                        message: 'File type mismatch detected. MIME type does not match file extension.'
                    }, { status: 400 });
                }
            }
        } else if (fileType === 'document') {
            if (fileExtension && expectedDocumentMimeTypes[fileExtension]) {
                if (!expectedDocumentMimeTypes[fileExtension].includes(file.type)) {
                    return NextResponse.json({
                        message: 'File type mismatch detected. MIME type does not match file extension.'
                    }, { status: 400 });
                }
            }
        } else {
            if (fileExtension && expectedImageMimeTypes[fileExtension]) {
                if (!expectedImageMimeTypes[fileExtension].includes(file.type)) {
                    return NextResponse.json({
                        message: 'File type mismatch detected. MIME type does not match file extension.'
                    }, { status: 400 });
                }
            }
        }

        // Validate file size (max 5MB for images, 500MB for videos, 50MB for documents)
        const maxImageSize = 5 * 1024 * 1024; // 5MB
        const maxVideoSize = 500 * 1024 * 1024; // 500MB
        const maxDocumentSize = 50 * 1024 * 1024; // 50MB
        const maxSize = fileType === 'video' ? maxVideoSize :
            fileType === 'document' ? maxDocumentSize :
                maxImageSize;

        if (file.size > maxSize) {
            const sizeLimit = fileType === 'video' ? '500MB' :
                fileType === 'document' ? '50MB' : '5MB';
            return NextResponse.json({
                message: `File too large. Maximum size is ${sizeLimit}`
            }, { status: 400 });
        }

        // Additional security: Validate file is actually valid (basic check)
        if (file.size < 100) { // Too small to be a valid file
            return NextResponse.json({
                message: 'File appears to be invalid or corrupted'
            }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generate unique filename
        const timestamp = Date.now();
        const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${timestamp}-${originalName}`;

        // Save to public/uploads directory
        const publicPath = join(process.cwd(), 'public', 'uploads');
        const filePath = join(publicPath, filename);

        await writeFile(filePath, buffer);

        // Return public URL
        const url = `/uploads/${filename}`;

        return NextResponse.json({
            message: 'File uploaded successfully',
            url,
            filename
        });
    } catch (error) {
        logger.error('Upload error:', error);
        return NextResponse.json({
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        }, { status: 500 });
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

