
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { getDatabaseWithRetry } from '@/lib/db';
import { chapters } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
    console.log('Publishing all chapters...');

    try {
        const db = await getDatabaseWithRetry();

        if (!db) {
            console.error('Failed to connect to database');
            return;
        }

        // Update all chapters to isPublished = true
        const result = await db.update(chapters)
            .set({ isPublished: true })
            .returning({ id: chapters.id, title: chapters.title });

        console.log(`Published ${result.length} chapters:`);
        result.forEach(c => console.log(`- ${c.title} (${c.id})`));

    } catch (err) {
        console.error(err);
    }
}

main().catch(console.error).finally(() => process.exit());
