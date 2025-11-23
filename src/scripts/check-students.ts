import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_pt4xwuEAB7Ml@ep-wild-frost-a4nflquy-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
    try {
        const sql = postgres(DATABASE_URL, { ssl: 'require' });

        console.log('\n🔍 Checking Student Accounts:\n');

        // Check for student accounts
        const students = await sql`
      SELECT id, name, email, role, is_active, password IS NOT NULL as has_password
      FROM users
      WHERE role = 'student'
      ORDER BY id
    `;

        console.log(`Found ${students.length} student accounts:\n`);
        students.forEach(s => {
            console.log(`ID: ${s.id}`);
            console.log(`  Name: ${s.name}`);
            console.log(`  Email: ${s.email}`);
            console.log(`  Active: ${s.is_active}`);
            console.log(`  Has Password: ${s.has_password}`);
            console.log('');
        });

        // Check specific emails
        const testEmails = ['adhithiyanmaliackal@gmail.com', 'student@lms.com'];
        console.log('Checking specific test emails:\n');

        for (const email of testEmails) {
            const users = await sql`
        SELECT id, name, email, role, is_active
        FROM users
        WHERE email = ${email}
      `;

            if (users.length > 0) {
                console.log(`✅ ${email}:`);
                users.forEach(u => {
                    console.log(`   Role: ${u.role}, Active: ${u.is_active}`);
                });
            } else {
                console.log(`❌ ${email}: NOT FOUND`);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
