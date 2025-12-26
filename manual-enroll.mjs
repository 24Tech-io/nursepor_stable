import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function enrollUser() {
    try {
        console.log('🔓 Enrolling Student 11 in Q-Bank 4...\n');

        const result = await sql`
            INSERT INTO qbank_enrollments (student_id, qbank_id)
            VALUES (11, 4)
            RETURNING *;
        `;

        console.log('✅ Enrollment successful:', result);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

enrollUser();
