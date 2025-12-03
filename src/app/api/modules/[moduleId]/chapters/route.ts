import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chapters, modules } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { securityLogger } from '@/lib/logger';

export async function GET(
    request: Request,
    { params }: { params: { moduleId: string } }
) {
    try {
        const moduleId = parseInt(params.moduleId);
        const moduleChapters = await db.query.chapters.findMany({
            where: eq(chapters.moduleId, moduleId),
            orderBy: [asc(chapters.order)],
        });

        return NextResponse.json({ chapters: moduleChapters });
    } catch (error) {
        console.error('Get chapters error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: { moduleId: string } }
) {
    try {
        const body = await request.json();
        const moduleId = parseInt(params.moduleId);

        // Get current chapter count for ordering
        const existingChapters = await db.select().from(chapters).where(eq(chapters.moduleId, moduleId));
        const order = existingChapters.length;

        const newChapter = await db.insert(chapters).values({
            moduleId,
            title: body.title,
            type: body.type,
            order: body.order || order,
            videoUrl: body.videoUrl,
            videoProvider: body.videoProvider,
            videoDuration: body.videoDuration,
            textbookContent: body.textbookContent,
            readingTime: body.readingTime,
            mcqData: body.mcqData,
        }).returning();

        securityLogger.info('Chapter Created', { chapterId: newChapter[0].id, moduleId });

        return NextResponse.json({
            message: 'Chapter created successfully',
            chapter: newChapter[0]
        });

    } catch (error) {
        console.error('Create chapter error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
