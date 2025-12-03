import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dailyVideos, chapters } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { securityLogger } from '@/lib/logger';

export async function GET(request: Request) {
    try {
        const allVideos = await db.select({
            id: dailyVideos.id,
            title: dailyVideos.title,
            description: dailyVideos.description,
            day: dailyVideos.day,
            isActive: dailyVideos.isActive,
            chapterId: dailyVideos.chapterId,
            chapterTitle: chapters.title,
        })
            .from(dailyVideos)
            .leftJoin(chapters, eq(dailyVideos.chapterId, chapters.id))
            .orderBy(dailyVideos.day);

        return NextResponse.json({ dailyVideos: allVideos });
    } catch (error) {
        console.error('Get daily videos error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const newVideo = await db.insert(dailyVideos).values({
            chapterId: parseInt(body.chapterId),
            title: body.title,
            description: body.description,
            day: body.day,
            isActive: true,
        }).returning();

        securityLogger.info('Daily Video Created', { videoId: newVideo[0].id });

        return NextResponse.json({
            message: 'Daily video created successfully',
            dailyVideo: newVideo[0]
        });

    } catch (error) {
        console.error('Create daily video error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
