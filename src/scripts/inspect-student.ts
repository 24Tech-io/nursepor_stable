
import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
    try {
        const sql = postgres(DATABASE_URL, { ssl: 'require' });
        const email = 'adhithiyanmaliackal@gmail.com';

        console.log(`\n🔍 Inspecting state for: ${email}`);

        // 1. Get User IDs
        const users = await sql`SELECT id, name, email, role FROM users WHERE email = ${email}`;
        if (users.length === 0) {
            console.log('❌ User not found!');
            process.exit(0);
        }
        console.log(`✅ Found ${users.length} users with email ${email}:`);
        users.forEach(u => console.log(`   - ID: ${u.id}, Name: ${u.name}, Role: ${u.role}`));

        // Check requests for ALL found users
        for (const user of users) {
            console.log(`\n--- Checking for User ID ${user.id} (${user.role}) ---`);
            const requests = await sql`
        SELECT ar.id, ar.status, c.title as course_title, ar.course_id 
        FROM access_requests ar
        JOIN courses c ON ar.course_id = c.id
        WHERE ar.student_id = ${user.id}
      `;
            if (requests.length > 0) {
                requests.forEach(r => {
                    console.log(`   - Request #${r.id}: [${r.status.toUpperCase()}] for "${r.course_title}"`);
                });
            } else {
                console.log('   (No requests)');
            }

            const enrollments = await sql`
        SELECT e.id, e.status, c.title as course_title
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.user_id = ${user.id}
      `;
            if (enrollments.length > 0) {
                enrollments.forEach(e => {
                    console.log(`   - Enrollment #${e.id}: [${e.status.toUpperCase()}] for "${e.course_title}"`);
                });
            } else {
                console.log('   (No enrollments)');
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
