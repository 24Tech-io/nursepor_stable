
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });
import { generateToken } from '../src/lib/auth';
import { getDatabase } from '../src/lib/db/index';
import { users } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

async function checkStudentAPIs() {
    try {
        const db = getDatabase();
        console.log('🔍 Fetching student user...');
        const studentResult = await db.select().from(users).where(eq(users.email, 'student@test.com')).limit(1);

        if (!studentResult || studentResult.length === 0) {
            console.error('❌ Student not found');
            process.exit(1);
        }

        const student = studentResult[0];
        console.log('✅ Student found:', { id: student.id, email: student.email, role: student.role, name: student.name });

        const userObj = {
            id: student.id,
            name: student.name,
            email: student.email,
            role: student.role,
            isActive: student.isActive,
            phone: student.phone,
            bio: student.bio,
            fingerprintEnrolled: false,
            twoFactorEnabled: false,
            joinedDate: student.createdAt
        };

        const token = generateToken(userObj);
        console.log('🔐 Token generated');

        const baseUrl = 'http://localhost:3000';
        const endpoints = [
            '/api/student/courses',
            '/api/student/stats',
            '/api/student/qbanks',
            '/api/student/requests',
            '/api/student/enrolled-courses',
        ];

        console.log('\n📡 Testing student API endpoints...\n');

        for (const endpoint of endpoints) {
            try {
                console.log(`Testing ${endpoint}...`);
                const res = await fetch(`${baseUrl}${endpoint}`, {
                    headers: {
                        'Cookie': `student_token=${token}`
                    }
                });

                const text = await res.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch {
                    data = text;
                }

                console.log(`  Status: ${res.status}`);
                if (res.status === 200) {
                    if (typeof data === 'object') {
                        const keys = Object.keys(data);
                        console.log(`  Response keys: ${keys.join(', ')}`);
                        if (data.courses) console.log(`    courses count: ${data.courses.length}`);
                        if (data.stats) console.log(`    stats:`, JSON.stringify(data.stats).slice(0, 150));
                        if (data.enrolled) console.log(`    enrolled qbanks: ${data.enrolled.length}`);
                        if (data.available) console.log(`    available qbanks: ${data.available.length}`);
                        if (data.requests) console.log(`    requests count: ${data.requests.length}`);
                        if (data.enrolledCourses) console.log(`    enrolled courses: ${data.enrolledCourses.length}`);
                    }
                } else {
                    console.log(`  Error: ${JSON.stringify(data).slice(0, 200)}`);
                }
                console.log('');
            } catch (error: any) {
                console.log(`  ❌ Request failed: ${error.message}\n`);
            }
        }

    } catch (e) {
        console.error('Test script error:', e);
    }
    process.exit(0);
}

checkStudentAPIs();
