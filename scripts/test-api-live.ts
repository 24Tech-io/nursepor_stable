
import 'dotenv/config';
import { generateToken } from '../src/lib/auth';
import { getDatabase } from '../src/lib/db/index';
import { users } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

async function test() {
    try {
        const db = getDatabase();
        console.log('Fetching student...');
        const student = await db.select().from(users).where(eq(users.email, 'student@test.com')).limit(1);

        if (!student || student.length === 0) { console.error('Student not found'); process.exit(1); }

        const userObj = {
            id: student[0].id,
            name: student[0].name,
            email: student[0].email,
            role: student[0].role,
            isActive: student[0].isActive,
            phone: student[0].phone,
            bio: student[0].bio,
            fingerprintEnrolled: false,
            twoFactorEnabled: false,
            joinedDate: student[0].createdAt
        };

        console.log('User found:', { id: userObj.id, email: userObj.email, role: userObj.role });

        const token = generateToken(userObj);
        console.log('Generated Token of length:', token.length);

        console.log('Hitting http://localhost:3003/api/student/requests...');
        const res = await fetch('http://localhost:3003/api/student/requests', {
            headers: {
                'Cookie': `student_token=${token}`
            }
        });

        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Body Preview:', text.slice(0, 500));

        if (res.status === 200) {
            console.log('✅ API Success!');
        } else {
            console.log('❌ API Failed!');
        }

    } catch (e) {
        console.error('Test script error:', e);
    }
    process.exit(0);
}

test();
