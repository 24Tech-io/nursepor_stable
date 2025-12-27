import { config } from 'dotenv';
config({ path: '.env.local' });

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const BASE_URL = 'http://localhost:3000';

// Generate tokens
const studentToken = jwt.sign(
    { id: 16, name: 'Student', email: 'student@test.com', role: 'student', isActive: true },
    JWT_SECRET,
    { expiresIn: '7d' }
);

const adminToken = jwt.sign(
    { id: 10, name: 'Admin', email: 'adhithiyanmaliackal@gmail.com', role: 'admin', isActive: true },
    JWT_SECRET,
    { expiresIn: '7d' }
);

async function testAPI(endpoint: string, token: string, description: string) {
    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            headers: {
                Cookie: token.includes('admin') ? `admin_token=${token}` : `student_token=${token}`
            }
        });

        const status = response.status;
        const statusEmoji = status === 200 ? '✅' : status === 403 ? '🔒' : status === 401 ? '🔑' : '❌';

        if (status === 200) {
            const data = await response.json();
            console.log(`${statusEmoji} ${description}: ${status}`);
            return { success: true, data, status };
        } else {
            console.log(`${statusEmoji} ${description}: ${status}`);
            return { success: false, status };
        }
    } catch (error: any) {
        console.log(`❌ ${description}: ERROR - ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function runTests() {
    console.log('\n🧪 COMPREHENSIVE API VERIFICATION\n');
    console.log('Server: http://localhost:3000');
    console.log('Student: student@test.com (ID 16)');
    console.log('Admin: adhithiyanmaliackal@gmail.com (ID 10)\n');

    console.log('═'.repeat(60));
    console.log('STUDENT ENDPOINTS');
    console.log('═'.repeat(60));

    const studentTests = [
        { endpoint: '/api/student/courses', desc: 'Student Courses List' },
        { endpoint: '/api/student/enrolled-courses', desc: 'Enrolled Courses' },
        { endpoint: '/api/student/stats', desc: 'Student Stats' },
        { endpoint: '/api/student/qbanks', desc: 'Q-Banks List' },
        { endpoint: '/api/student/requests', desc: 'Access Requests' },
        { endpoint: '/api/student/textbooks', desc: 'Textbooks' },
    ];

    for (const test of studentTests) {
        const result = await testAPI(test.endpoint, studentToken, test.desc);
        if (result.success && result.data) {
            // Show key data points
            if (test.endpoint.includes('courses') && !test.endpoint.includes('enrolled')) {
                console.log(`   📊 Courses: ${result.data.courses?.length || 0}`);
            } else if (test.endpoint.includes('enrolled-courses')) {
                console.log(`   📊 Enrolled: ${result.data.enrolledCourses?.length || 0}`);
            } else if (test.endpoint.includes('stats')) {
                console.log(`   📊 Enrolled: ${result.data.enrolledCourses || 0}, Completed: ${result.data.completedCourses || 0}`);
            } else if (test.endpoint.includes('qbanks')) {
                console.log(`   📊 Q-Banks: ${result.data.qbanks?.length || 0}`);
            }
        }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('ADMIN ENDPOINTS');
    console.log('═'.repeat(60));

    const adminTests = [
        { endpoint: '/api/admin/courses', desc: 'Admin Courses' },
        { endpoint: '/api/admin/students', desc: 'Students List' },
        { endpoint: '/api/students/11', desc: 'Student Profile (ID 11)' },
        { endpoint: '/api/admin/qbanks', desc: 'Admin Q-Banks' },
    ];

    for (const test of adminTests) {
        await testAPI(test.endpoint, adminToken, test.desc);
    }

    console.log('\n' + '═'.repeat(60));
    console.log('DATA CONSISTENCY CHECK');
    console.log('═'.repeat(60));

    // Check if enrolled courses match stats
    const coursesResult = await testAPI('/api/student/enrolled-courses', studentToken, '');
    const statsResult = await testAPI('/api/student/stats', studentToken, '');

    if (coursesResult.success && statsResult.success) {
        const enrolledCount = coursesResult.data.enrolledCourses?.length || 0;
        const statsCount = statsResult.data.enrolledCourses || 0;

        if (enrolledCount === statsCount) {
            console.log(`✅ Enrollment data CONSISTENT: ${enrolledCount} courses`);
        } else {
            console.log(`❌ MISMATCH: Enrolled API shows ${enrolledCount}, Stats shows ${statsCount}`);
        }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('SUMMARY');
    console.log('═'.repeat(60));
    console.log('✅ = Success (200)');
    console.log('🔒 = Forbidden (403)');
    console.log('🔑 = Unauthorized (401)');
    console.log('❌ = Error or Failed');
    console.log('\n✨ Verification complete!\n');
}

runTests().catch(console.error);
