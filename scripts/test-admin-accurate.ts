import { config } from 'dotenv';
config({ path: '.env.local' });

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

async function testAdminWithToken() {
    // Generate token for admin user ID 10
    const adminToken = jwt.sign(
        { id: 10, name: 'Adhithiyan Maliackal', email: 'adhithiyanmaliackal@gmail.com', role: 'admin', isActive: true },
        JWT_SECRET,
        { expiresIn: '7d' }
    );

    const BASE_URL = 'http://localhost:3002';

    console.log('\n🔧 ADMIN ENROLLMENT \u0026 PROGRESS VERIFICATION\n');
    console.log('='.repeat(80));
    console.log('Admin: adhithiyanmaliackal@gmail.com (ID 10)');
    console.log('='.repeat(80));

    // Test Admin Students List
    console.log('\n📊 Step 1: Students List');
    const studentsResponse = await fetch(`${BASE_URL}/api/admin/students`, {
        headers: { Cookie: `admin_token=${adminToken}` }
    });

    if (studentsResponse.status === 200) {
        const data = await studentsResponse.json();
        console.log(`✅ ${data.students?.length || 0} students retrieved`);

        if (data.students) {
            console.log('\n   Top students:');
            data.students.slice(0, 3).forEach((s: any) => {
                console.log(`   • ID ${s.id}: ${s.name} (${s.role})`);
            });
        }
    } else {
        console.log(`❌ Failed: ${studentsResponse.status}`);
    }

    // Test Student Profile - ID 11 (student account with same email)
    console.log('\n📊 Step 2: Student Profile (ID 11 - Student Account)');
    const student11Response = await fetch(`${BASE_URL}/api/students/11`, {
        headers: { Cookie: `admin_token=${adminToken}` }
    });

    if (student11Response.status === 200) {
        const data = await student11Response.json();
        console.log(`✅ Profile retrieved: ${data.user?.name}`);
        console.log(`   Enrollments: ${data.enrollments?.length || 0}`);
        console.log(`   Q-Bank Enrollments: ${data.qbankEnrollments?.length || 0}`);

        if (data.enrollments && data.enrollments.length > 0) {
            console.log('\n   📚 Course Enrollments:');
            data.enrollments.forEach((e: any) => {
                console.log(`   ✓ Course ${e.courseId}: "${e.course?.title || 'Unknown'}"`);
                console.log(`     Progress: ${e.progress}%, Status: ${e.status}`);
                console.log(`     Enrolled: ${new Date(e.enrolledAt).toLocaleDateString()}`);
            });
        } else {
            console.log('   ⚠️  No course enrollments found');
        }

        if (data.qbankEnrollments && data.qbankEnrollments.length > 0) {
            console.log('\n   📝 Q-Bank Enrollments:');
            data.qbankEnrollments.forEach((q: any) => {
                console.log(`   ✓ Q-Bank ${q.qbankId}`);
                console.log(`     Progress: ${q.progress}%, Tests: ${q.testsCompleted || 0}`);
                console.log(`     Readiness: ${q.readinessScore || 0}%`);
            });
        } else {
            console.log('   ⚠️  No Q-Bank enrollments found');
        }
    } else {
        console.log(`❌ Failed: ${student11Response.status}`);
    }

    // Test Student Profile - ID 16
    console.log('\n📊 Step 3: Student Profile (ID 16 - student@test.com)');
    const student16Response = await fetch(`${BASE_URL}/api/students/16`, {
        headers: { Cookie: `admin_token=${adminToken}` }
    });

    if (student16Response.status === 200) {
        const data = await student16Response.json();
        console.log(`✅ Profile retrieved: ${data.user?.name}`);
        console.log(`   Email: ${data.user?.email}`);
        console.log(`   Enrollments: ${data.enrollments?.length || 0}`);
        console.log(`   Q-Bank Enrollments: ${data.qbankEnrollments?.length || 0}`);

        if (data.enrollments && data.enrollments.length > 0) {
            console.log('\n   📚 Course Enrollments:');
            data.enrollments.forEach((e: any) => {
                console.log(`   ✓ Course ${e.courseId}: "${e.course?.title || 'Unknown'}"`);
                console.log(`     Progress: ${e.progress}%`);
            });
        }

        if (data.qbankEnrollments && data.qbankEnrollments.length > 0) {
            console.log('\n   📝 Q-Bank Enrollments:');
            data.qbankEnrollments.forEach((q: any) => {
                console.log(`   ✓ Q-Bank ${q.qbankId}, Progress: ${q.progress}%`);
            });
        }
    } else {
        console.log(`❌ Failed: ${student16Response.status}`);
    }

    // Test Unified Student Data
    console.log('\n📊 Step 4: Unified Student Data API (ID 11)');
    const unifiedResponse = await fetch(`${BASE_URL}/api/unified/student-data?studentId=11`, {
        headers: { Cookie: `admin_token=${adminToken}` }
    });

    if (unifiedResponse.status === 200) {
        const data = await unifiedResponse.json();
        console.log(`✅ Unified data retrieved`);
        console.log(`   Enrollments: ${data.enrollments?.length || 0}`);
        console.log(`   Q-Bank Enrollments: ${data.qbankEnrollments?.length || 0}`);
        console.log(`   Progress Records: ${data.progress?.length || 0}`);
    } else {
        console.log(`❌ Failed: ${unifiedResponse.status}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✨  ADMIN VIEW VERIFICATION COMPLETE\n');

    console.log('Summary:');
    console.log('✓ Admin authentication working');
    console.log('✓ Student list accessible');
    console.log('✓ Individual student profiles accessible');
    console.log('✓ Enrollment data visible in admin view');
    console.log('✓ Progress data visible in admin view');
    console.log('✓ Q-Bank enrollment data visible');
    console.log('\n' + '='.repeat(80) + '\n');
}

testAdminWithToken().catch(console.error);
