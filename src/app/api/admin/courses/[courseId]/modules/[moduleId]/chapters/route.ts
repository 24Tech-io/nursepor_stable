import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { chapters } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      type,
      order,
      isPublished,
      prerequisiteChapterId,
      videoUrl,
      videoProvider,
      videoDuration,
      transcript,
      textbookContent,
      textbookFileUrl,
      readingTime,
      mcqData,
    } = body;

    if (!title || !type) {
      return NextResponse.json(
        { message: 'Chapter title and type are required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const moduleId = parseInt(params.moduleId);

    const [newChapter] = await db
      .insert(chapters)
      .values({
        moduleId,
        title,
        description: description || null,
        type,
        order: order || 1,
        isPublished: isPublished !== undefined ? isPublished : true,
        prerequisiteChapterId: prerequisiteChapterId ? parseInt(prerequisiteChapterId) : null,
        videoUrl: type === 'video' ? (videoUrl || null) : null,
        videoProvider: type === 'video' ? (videoProvider || null) : null,
        videoDuration: type === 'video' ? (videoDuration || null) : null,
        transcript: type === 'video' ? (transcript || null) : null,
        textbookContent: type === 'textbook' ? (textbookContent || null) : null,
        textbookFileUrl: type === 'textbook' ? (textbookFileUrl || null) : null,
        readingTime: type === 'textbook' ? (readingTime || null) : null,
        mcqData: type === 'mcq' ? (mcqData || null) : null,
      })
      .returning();

    return NextResponse.json({
      chapter: {
        id: newChapter.id.toString(),
        moduleId: newChapter.moduleId.toString(),
        title: newChapter.title,
        description: newChapter.description,
        type: newChapter.type,
        order: newChapter.order,
        isPublished: newChapter.isPublished,
        prerequisiteChapterId: newChapter.prerequisiteChapterId?.toString(),
        videoUrl: newChapter.videoUrl,
        videoProvider: newChapter.videoProvider,
        videoDuration: newChapter.videoDuration,
        transcript: newChapter.transcript,
        textbookContent: newChapter.textbookContent,
        textbookFileUrl: newChapter.textbookFileUrl,
        readingTime: newChapter.readingTime,
        mcqData: newChapter.mcqData,
        createdAt: newChapter.createdAt?.toISOString(),
        updatedAt: newChapter.updatedAt?.toISOString(),
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create chapter error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to create chapter',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      id,
      title,
      description,
      type,
      order,
      isPublished,
      prerequisiteChapterId,
      videoUrl,
      videoProvider,
      videoDuration,
      transcript,
      textbookContent,
      textbookFileUrl,
      readingTime,
      mcqData,
    } = body;

    if (!id) {
      return NextResponse.json(
        { message: 'Chapter ID is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    const [updatedChapter] = await db
      .update(chapters)
      .set({
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(type && { type }),
        ...(order !== undefined && { order }),
        ...(isPublished !== undefined && { isPublished }),
        ...(prerequisiteChapterId !== undefined && { 
          prerequisiteChapterId: prerequisiteChapterId ? parseInt(prerequisiteChapterId) : null 
        }),
        ...(videoUrl !== undefined && { videoUrl }),
        ...(videoProvider !== undefined && { videoProvider }),
        ...(videoDuration !== undefined && { videoDuration }),
        ...(transcript !== undefined && { transcript }),
        ...(textbookContent !== undefined && { textbookContent }),
        ...(textbookFileUrl !== undefined && { textbookFileUrl }),
        ...(readingTime !== undefined && { readingTime }),
        ...(mcqData !== undefined && { mcqData }),
        updatedAt: new Date(),
      })
      .where(eq(chapters.id, parseInt(id)))
      .returning();

    if (!updatedChapter) {
      return NextResponse.json(
        { message: 'Chapter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      chapter: {
        id: updatedChapter.id.toString(),
        moduleId: updatedChapter.moduleId.toString(),
        title: updatedChapter.title,
        description: updatedChapter.description,
        type: updatedChapter.type,
        order: updatedChapter.order,
        isPublished: updatedChapter.isPublished,
        prerequisiteChapterId: updatedChapter.prerequisiteChapterId?.toString(),
        videoUrl: updatedChapter.videoUrl,
        videoProvider: updatedChapter.videoProvider,
        videoDuration: updatedChapter.videoDuration,
        transcript: updatedChapter.transcript,
        textbookContent: updatedChapter.textbookContent,
        textbookFileUrl: updatedChapter.textbookFileUrl,
        readingTime: updatedChapter.readingTime,
        mcqData: updatedChapter.mcqData,
        createdAt: updatedChapter.createdAt?.toISOString(),
        updatedAt: updatedChapter.updatedAt?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Update chapter error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to update chapter',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string; moduleId: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { message: 'Chapter ID is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    await db
      .delete(chapters)
      .where(eq(chapters.id, parseInt(id)));

    return NextResponse.json({ message: 'Chapter deleted successfully' });
  } catch (error: any) {
    console.error('Delete chapter error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to delete chapter',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

