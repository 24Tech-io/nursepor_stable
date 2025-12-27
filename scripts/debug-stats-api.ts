import { config } from 'dotenv';
config({ path: '.env.local' });

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const BASE_URL = 'http://localhost:3000';

const studentToken = jwt.sign(
    { id: 16, name: 'Student', email: 'student@test.com', role: 'student', isActive: true },
    JWT_SECRET,
    { expiresIn: '7d' }
);

async function debugStatsAPI() {
    try {
        console.log('\n🔍 DEBUGGING STATS API\n');

        const response = await fetch(`${BASE_URL}/api/student/stats`, {
            headers: {
                Cookie: `student_token=${studentToken}`
            }
        });

        console.log(`Status: ${response.status}`);

        if (response.status === 200) {
            const data = await response.json();
            console.log('\n📊 FULL RESPONSE DATA:');
            console.log(JSON.stringify(data, null, 2));

            console.log('\n📈 KEY METRICS:');
            console.log(`  Enrolled Courses: ${data.enrolledCourses || 0}`);
            console.log(`  Completed Courses: ${data.completedCourses || 0}`);
            console.log(`  Total Progress: ${data.totalProgress || 0}`);
        } else {
            console.log('Error:', response.statusText);
        }

        console.log('\n🔍 DEBUGGING Q-BANKS API\n');

        const qbanksResponse = await fetch(`${BASE_URL}/api/student/qbanks`, {
            headers: {
                Cookie: `student_token=${studentToken}`
            }
        });

        console.log(`Status: ${qbanksResponse.status}`);

        if (qbanksResponse.status === 200) {
            const qbanksData = await qbanksResponse.json();
            console.log('\n📊 Q-BANKS RESPONSE:');
            console.log(`  Enrolled: ${qbanksData.enrolled?.length || 0}`);
            console.log(`  Requested: ${qbanksData.requested?.length || 0}`);
            console.log(`  Available: ${qbanksData.available?.length || 0}`);
            console.log(`  Locked: ${qbanksData.locked?.length || 0}`);
            console.log(`  Total: ${qbanksData.total || 0}`);

            if (qbanksData.enrolled && qbanksData.enrolled.length > 0) {
                console.log('\n  📚 Enrolled Q-Banks:');
                qbanksData.enrolled.forEach((qb: any) => {
                    console.log(`    - ID ${qb.id}: "${qb.name}"`);
                });
            }
        }

    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

debugStatsAPI();
