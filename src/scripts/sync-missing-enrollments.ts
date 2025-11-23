
import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
    try {
        const sql = postgres(DATABASE_URL, { ssl: 'require' });

        console.log('\n🔍 Finding APPROVED requests missing enrollments...\n');

        // Find all approved requests
        const approvedRequests = await sql`
      SELECT ar.id, ar.student_id, ar.course_id, c.title as course_title, u.name as student_name
      FROM access_requests ar
      JOIN courses c ON ar.course_id = c.id
      JOIN users u ON ar.student_id = u.id
      WHERE ar.status = 'approved'
    `;

        console.log(`Found ${approvedRequests.length} approved requests.\n`);

        let syncedCount = 0;
        let alreadyExistsCount = 0;

        for (const request of approvedRequests) {
            // Check if enrollment already exists
            const existing = await sql`
        SELECT id FROM enrollments 
        WHERE user_id = ${request.student_id} AND course_id = ${request.course_id}
      `;

            if (existing.length > 0) {
                console.log(`✓ User ${request.student_name} (ID: ${request.student_id}) - "${request.course_title}": Already enrolled`);
                alreadyExistsCount++;
                continue;
            }

            // Create missing enrollment
            await sql`
        INSERT INTO enrollments (user_id, course_id, status, progress, enrolled_at)
        VALUES (${request.student_id}, ${request.course_id}, 'active', 0, NOW())
      `;

            console.log(`✅ Created enrollment for ${request.student_name} (ID: ${request.student_id}) - "${request.course_title}"`);
            syncedCount++;

            // Also check/create student_progress (legacy)
            const progressExists = await sql`
        SELECT id FROM student_progress 
        WHERE student_id = ${request.student_id} AND course_id = ${request.course_id}
      `;

            if (progressExists.length === 0) {
                await sql`
          INSERT INTO student_progress (student_id, course_id, total_progress, last_accessed)
          VALUES (${request.student_id}, ${request.course_id}, 0, NOW())
        `;
                console.log(`   + Created student_progress record`);
            }
        }

        console.log(`\n📊 Summary:`);
        console.log(`   - Synced: ${syncedCount}`);
        console.log(`   - Already enrolled: ${alreadyExistsCount}`);
        console.log(`   - Total approved requests: ${approvedRequests.length}\n`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
