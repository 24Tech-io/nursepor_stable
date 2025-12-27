
import 'dotenv/config';
import { getDatabase } from '../src/lib/db/index';
import { accessRequests } from '../src/lib/db/schema';
import { eq, and } from 'drizzle-orm';

async function repro() {
    console.log('🧪 Starting Reproduction...');
    try {
        const db = getDatabase();

        console.log('🔍 Running suspect query...');
        // Query that caused crash: select course_id from access_requests where student_id = 16 and status = 'pending'
        const results = await db
            .select({ courseId: accessRequests.courseId })
            .from(accessRequests)
            .where(
                and(
                    eq(accessRequests.studentId, 16),
                    eq(accessRequests.status, 'pending')
                )
            );

        console.log('✅ Query Success!');
        console.log('Results:', results);

    } catch (error: any) {
        console.error('❌ CRASH REPRODUCED:', error);
    }
    process.exit(0);
}

repro();
