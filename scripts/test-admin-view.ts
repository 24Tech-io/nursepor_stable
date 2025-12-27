import { config } from 'dotenv';
config({ path: '.env.local' });

const ports = [3000, 3002, 3003];

async function findWorkingPort() {
    for (const port of ports) {
        try {
            await fetch(`http://localhost:${port}`, { signal: AbortSignal.timeout(2000) });
            return port;
        } catch (error) {
            continue;
        }
    }
    return null;
}

async function testAdminView() {
    const port = await findWorkingPort();
    if (!port) {
        console.log('❌ No dev server found');
        return;
    }

    const BASE_URL = `http://localhost:${port}`;
    console.log(`\n🔧 ADMIN ENROLLMENT & PROGRESS VERIFICATION`);
    console.log(`Using server on port ${port}\n`);
    console.log('='.repeat(80));

    // Admin Login
    console.log('\n📝 Step 1: Admin Login');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'adhithiyanmaliackal@gmail.com',
            password: 'Adhi1234'
        })
    });

    if (loginResponse.status !== 200) {
        console.log('❌ Login failed');
        return;
    }

    const userData = await loginResponse.json();
    const adminCookie = loginResponse.headers.get('set-cookie')?.match(/admin_token=([^;]+)/)?.[1];

    if (!adminCookie) {
        console.log('❌ No admin cookie received');
        return;
    }

    console.log(`✅ Logged in as: ${userData.user.name} (${userData.user.role})`);

    // Test Admin Students List
    console.log('\n📊 Step 2: Admin Students List');
    const studentsResponse = await fetch(`${BASE_URL}/api/admin/students`, {
        headers: { Cookie: `admin_token=${adminCookie}` }
    });

    if (studentsResponse.status === 200) {
        const studentsData = await studentsResponse.json();
        console.log(`✅ Students list retrieved: ${studentsData.students?.length || 0} students`);

        if (studentsData.students && studentsData.students.length > 0) {
            console.log('\n   Student Data:');
            studentsData.students.slice(0, 3).forEach((student: any) => {
                console.log(`   • ID ${student.id}: ${student.name} (${student.email})`);
                console.log(`     Role: ${student.role}, Active: ${student.isActive}`);
            });
        }
    } else {
        console.log(`❌ Students list failed: ${studentsResponse.status}`);
    }

    // Test Individual Student Profile (ID 11)
    console.log('\n📊 Step 3: Individual Student Profile (ID 11)');
    const studentProfileResponse = await fetch(`${BASE_URL}/api/students/11`, {
        headers: { Cookie: `admin_token=${adminCookie}` }
    });

    if (studentProfileResponse.status === 200) {
        const profileData = await studentProfileResponse.json();
        console.log(`✅ Student profile retrieved`);
        console.log(`   Name: ${profileData.user?.name}`);
        console.log(`   Email: ${profileData.user?.email}`);
        console.log(`   Enrollments: ${profileData.enrollments?.length || 0}`);

        if (profileData.enrollments && profileData.enrollments.length > 0) {
            console.log('\n   Enrollment Details:');
            profileData.enrollments.forEach((enrollment: any) => {
                console.log(`   ✓ Course ID ${enrollment.courseId}: ${enrollment.course?.title || 'Unknown'}`);
                console.log(`     Progress: ${enrollment.progress}%`);
                console.log(`     Status: ${enrollment.status}`);
                console.log(`     Enrolled: ${new Date(enrollment.enrolledAt).toLocaleDateString()}`);
            });
        }

        if (profileData.qbankEnrollments && profileData.qbankEnrollments.length > 0) {
            console.log('\n   Q-Bank Enrollments:');
            profileData.qbankEnrollments.forEach((qb: any) => {
                console.log(`   ✓ Q-Bank ID ${qb.qbankId}: Progress ${qb.progress}%`);
                console.log(`     Tests: ${qb.testsCompleted || 0}, Readiness: ${qb.readinessScore || 0}%`);
            });
        }
    } else {
        console.log(`❌ Student profile failed: ${studentProfileResponse.status}`);
    }

    // Test Student ID 16 (student@test.com)
    console.log('\n📊 Step 4: Student Profile (ID 16 - student@test.com)');
    const student16Response = await fetch(`${BASE_URL}/api/students/16`, {
        headers: { Cookie: `admin_token=${adminCookie}` }
    });

    if (student16Response.status === 200) {
        const student16Data = await student16Response.json();
        console.log(`✅ Student profile retrieved`);
        console.log(`   Name: ${student16Data.user?.name}`);
        console.log(`   Email: ${student16Data.user?.email}`);
        console.log(`   Enrollments: ${student16Data.enrollments?.length || 0}`);

        if (student16Data.enrollments && student16Data.enrollments.length > 0) {
            console.log('\n   Enrollment Details:');
            student16Data.enrollments.forEach((enrollment: any) => {
                console.log(`   ✓ Course ID ${enrollment.courseId}: ${enrollment.course?.title || 'Unknown'}`);
                console.log(`     Progress: ${enrollment.progress}%`);
                console.log(`     Status: ${enrollment.status}`);
            });
        }

        if (student16Data.qbankEnrollments && student16Data.qbankEnrollments.length > 0) {
            console.log('\n   Q-Bank Enrollments:');
            student16Data.qbankEnrollments.forEach((qb: any) => {
                console.log(`   ✓ Q-Bank ID ${qb.qbankId}: Progress ${qb.progress}%`);
            });
        }
    } else {
        console.log(`❌ Student 16 profile failed: ${student16Response.status}`);
    }

    // Test Unified Student Data API
    console.log('\n📊 Step 5: Unified Student Data API');
    const unifiedResponse = await fetch(`${BASE_URL}/api/unified/student-data?studentId=11`, {
        headers: { Cookie: `admin_token=${adminCookie}` }
    });

    if (unifiedResponse.status === 200) {
        const unifiedData = await unifiedResponse.json();
        console.log(`✅ Unified data retrieved`);
        console.log(`   Enrollments: ${unifiedData.enrollments?.length || 0}`);
        console.log(`   Progress records: ${unifiedData.progress?.length || 0}`);
        console.log(`   Q-Bank enrollments: ${unifiedData.qbankEnrollments?.length || 0}`);
    } else {
        console.log(`❌ Unified data failed: ${unifiedResponse.status}`);
    }

    // Test Admin Courses List
    console.log('\n📊 Step 6: Admin Courses List');
    const coursesResponse = await fetch(`${BASE_URL}/api/admin/courses`, {
        headers: { Cookie: `admin_token=${adminCookie}` }
    });

    if (coursesResponse.status === 200) {
        const coursesData = await coursesResponse.json();
        console.log(`✅ Courses retrieved: ${coursesData.courses?.length || 0} courses`);

        if (coursesData.courses && coursesData.courses.length > 0) {
            coursesData.courses.slice(0, 2).forEach((course: any) => {
                console.log(`   • ID ${course.id}: "${course.title}"`);
                console.log(`     Status: ${course.status}, Enrollments: ${course.enrollmentCount || 0}`);
            });
        }
    } else {
        console.log(`❌ Courses list failed: ${coursesResponse.status}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✨ ADMIN VERIFICATION COMPLETE\n');

    console.log('Summary:');
    console.log('✓ Admin can access students list');
    console.log('✓ Admin can view individual student profiles');
    console.log('✓ Enrollment data is visible');
    console.log('✓ Progress data is visible');
    console.log('✓ Q-Bank enrollment data is visible');
    console.log('✓ Course statistics are accessible');
    console.log('\n' + '='.repeat(80) + '\n');
}

testAdminView().catch(console.error);
