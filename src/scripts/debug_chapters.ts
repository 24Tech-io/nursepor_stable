
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { getDatabaseWithRetry } from '@/lib/db';
import { chapters, modules, courses } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

async function main() {
    console.log('Fetching recent chapters...');

    try {
        const db = await getDatabaseWithRetry();

        if (!db) {
            console.error('Failed to connect to database');
            return;
        }

        // Fetch up to 20 recent chapters
        const recentChapters = await db.select({
            id: chapters.id,
            title: chapters.title,
            type: chapters.type,
            moduleId: chapters.moduleId,
            moduleTitle: modules.title,
            courseId: courses.id,
            courseTitle: courses.title,
            isPublished: chapters.isPublished,
            videoUrl: chapters.videoUrl,
            textbookContent: chapters.textbookContent,
            textbookFileUrl: chapters.textbookFileUrl,
        })
            .from(chapters)
            .leftJoin(modules, eq(chapters.moduleId, modules.id))
            .leftJoin(courses, eq(modules.courseId, courses.id))
            .orderBy(desc(chapters.id))
            .limit(20);

        console.log(JSON.stringify(recentChapters, null, 2));
    } catch (err) {
        console.error(err);
    }
}

main().catch(console.error).finally(() => process.exit());
