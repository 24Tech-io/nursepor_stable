import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chapters } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { securityLogger } from '@/lib/logger';
import { getClientIP } from '@/lib/security-middleware';

export async function PUT(
    request: NextRequest,
    { params }: { params: { moduleId: string } }
) {
    try {
        const { items } = await request.json(); // items: { id: number, order: number }[]
        const moduleId = parseInt(params.moduleId);
        const ip = getClientIP(request) || 'unknown';

        if (!Array.isArray(items)) {
            return NextResponse.json({ message: 'Invalid data' }, { status: 400 });
        }

        // Update order for each chapter
        await db.transaction(async (tx) => {
            for (const item of items) {
                await tx.update(chapters)
                    .set({ order: item.order })
                    .where(eq(chapters.id, item.id));
            }
        });

        securityLogger.info('Chapters Reordered', { moduleId, count: items.length });

        return NextResponse.json({ message: 'Chapters reordered successfully' });
    } catch (error) {
        console.error('Reorder chapters error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
