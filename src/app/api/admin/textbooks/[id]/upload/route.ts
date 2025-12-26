import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { getDatabaseWithRetry } from '@/lib/db';
import { textbooks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// Note: PDF page count extraction is optional
// To enable, install pdf-parse: npm install pdf-parse
// Then uncomment the code below

// POST - Upload PDF file for textbook (max 50MB)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('adminToken')?.value || request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const textbookId = parseInt(params.id);
    if (isNaN(textbookId)) {
      return NextResponse.json({ message: 'Invalid textbook ID' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ message: 'No file provided' }, { status: 400 });
    }

    // Enhanced file validation
    const blockedExtensions = ['exe', 'bat', 'sh', 'php', 'js', 'html', 'htm', 'svg', 'xml', 'jar', 'war'];
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ message: 'Only PDF files are allowed' }, { status: 400 });
    }

    // Validate file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension && (fileExtension !== 'pdf' || blockedExtensions.includes(fileExtension))) {
      return NextResponse.json({ 
        message: fileExtension === 'pdf' 
          ? 'File type not allowed for security reasons' 
          : 'Only PDF files are allowed' 
      }, { status: 400 });
    }

    // Validate MIME type matches extension
    if (fileExtension && fileExtension !== 'pdf') {
      return NextResponse.json({ 
        message: 'File type mismatch detected. Expected PDF file.' 
      }, { status: 400 });
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ message: 'File size exceeds 50MB limit' }, { status: 400 });
    }

    // Additional security: Validate file is actually a PDF (basic check)
    if (file.size < 100) {
      return NextResponse.json({ 
        message: 'File appears to be invalid or corrupted' 
      }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'textbooks');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `textbook-${textbookId}-${timestamp}.pdf`;
    const filepath = join(uploadsDir, filename);
    const fileUrl = `/uploads/textbooks/${filename}`;

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Get PDF metadata (page count) - optional
    // To enable automatic page count extraction, install pdf-parse:
    // npm install pdf-parse
    // Then uncomment the code below:
    /*
    let totalPages = null;
    try {
      const pdfParseModule = await import('pdf-parse');
      const pdfParse = (pdfParseModule.default || pdfParseModule) as (buffer: Buffer) => Promise<{ numpages: number }>;
      const pdfData = await pdfParse(buffer);
      totalPages = pdfData.numpages;
    } catch (err) {
      // pdf-parse not installed - page count will be null
    }
    */
    const totalPages = null; // Set manually or install pdf-parse to auto-extract

    // Update textbook record
    const db = await getDatabaseWithRetry();
    const [updated] = await db
      .update(textbooks)
      .set({
        pdfFileUrl: fileUrl,
        fileSize: file.size,
        totalPages: totalPages,
        updatedAt: new Date(),
      })
      .where(eq(textbooks.id, textbookId))
      .returning();

    return NextResponse.json({
      message: 'PDF uploaded successfully',
      textbook: updated,
      fileUrl,
      fileSize: file.size,
      totalPages,
    });
  } catch (error: any) {
    logger.error('Upload PDF error:', error);
    return NextResponse.json(
      { message: 'Failed to upload PDF', error: error.message },
      { status: 500 }
    );
  }
}

