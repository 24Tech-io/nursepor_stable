import { config } from 'dotenv';
config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';

async function comprehensiveTest() {
    console.log('\n🧪 COMPREHENSIVE SYSTEM TEST\n');
    console.log('═'.repeat(70));

    // Step 1: Login
    console.log('\n📝 STEP 1: LOGIN');
    console.log('Email: adhithiyanmaliackal@gmail.com');

    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'adhithiyanmaliackal@gmail.com',
            password: 'Adhi1234'
        })
    });

    console.log(`Login Status: ${loginResponse.status}`);

    if (loginResponse.status !== 200) {
        const error = await loginResponse.text();
        console.log('❌ Login failed:', error);
        return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    console.log(`   User: ${loginData.user?.name} (${loginData.user?.email})`);
    console.log(`   Role: ${loginData.user?.role}`);
    console.log(`   ID: ${loginData.user?.id}`);

    // Extract cookie
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    let cookie = '';
    if (setCookieHeader) {
        const match = setCookieHeader.match(/(admin_token|student_token)=([^;]+)/);
        if (match) {
            cookie = `${match[1]}=${match[2]}`;
            console.log(`   Cookie: ${match[1]} (${match[2].substring(0, 20)}...)`);
        }
    }

    if (!cookie) {
        console.log('❌ No authentication cookie received!');
        return;
    }

    console.log('\n' + '═'.repeat(70));
    console.log('\n📊 STEP 2: STUDENT DASHBOARD APIs');

    // Test all student endpoints
    const endpoints = [
        { path: '/api/student/stats', name: 'Stats' },
        { path: '/api/student/enrolled-courses', name: 'Enrolled Courses' },
        { path: '/api/student/courses', name: 'Course List' },
        { path: '/api/student/qbanks', name: 'Q-Banks' },
        { path: '/api/student/requests', name: 'Access Requests' },
    ];

    for (const endpoint of endpoints) {
        try {
            const response = await fetch(`${BASE_URL}${endpoint.path}`, {
                headers: { Cookie: cookie }
            });

            console.log(`\n${endpoint.name}: ${response.status}`);

            if (response.status === 200) {
                const data = await response.json();

                // Display relevant data
                if (endpoint.path.includes('stats')) {
                    console.log(`  📈 Enrolled: ${data.stats?.coursesEnrolled || 0}, Completed: ${data.stats?.coursesCompleted || 0}`);
                    console.log(`  📚 Hours: ${data.stats?.hoursLearned || 0}, Quizzes: ${data.stats?.quizzesCompleted || 0}`);
                } else if (endpoint.path.includes('enrolled-courses')) {
                    console.log(`  📚 Enrolled Courses: ${data.enrolledCourses?.length || 0}`);
                    data.enrolledCourses?.forEach((c: any) => {
                        console.log(`     - Course ${c.courseId}: "${c.course?.title}" (${c.progress}% progress)`);
                    });
                } else if (endpoint.path.includes('student/courses')) {
                    console.log(`  📚 Total Courses: ${data.courses?.length || 0}`);
                    data.courses?.forEach((c: any) => {
                        console.log(`     - Course ${c.id}: "${c.title}" (Enrolled: ${c.isEnrolled})`);
                    });
                } else if (endpoint.path.includes('qbanks')) {
                    console.log(`  📚 Enrolled: ${data.enrolled?.length || 0}, Available: ${data.available?.length || 0}`);
                    console.log(`  🔒 Locked: ${data.locked?.length || 0}, Requested: ${data.requested?.length || 0}`);
                    if (data.enrolled && data.enrolled.length > 0) {
                        console.log('  Enrolled Q-Banks:');
                        data.enrolled.forEach((q: any) => {
                            console.log(`     - ID ${q.id}: "${q.name}" (${q.totalQuestions} questions)`);
                        });
                    }
                } else if (endpoint.path.includes('requests')) {
                    console.log(`  📋 Requests: ${data.requests?.length || 0}`);
                }
            } else {
                const error = await response.text();
                console.log(`  ❌ Error: ${error.substring(0, 100)}`);
            }
        } catch (error: any) {
            console.log(`  ❌ Network Error: ${error.message}`);
        }
    }

    console.log('\n' + '═'.repeat(70));
    console.log('\n🧬 STEP 3: Q-BANK TEST HISTORY & ANALYTICS');

    // Get Q-Bank enrollments to check analytics
    const qbanksResponse = await fetch(`${BASE_URL}/api/student/qbanks`, {
        headers: { Cookie: cookie }
    });

    if (qbanksResponse.status === 200) {
        const qbanksData = await qbanksResponse.json();

        if (qbanksData.enrolled && qbanksData.enrolled.length > 0) {
            // Test first enrolled Q-Bank analytics
            const firstQBank = qbanksData.enrolled[0];
            console.log(`\nTesting analytics for Q-Bank ${firstQBank.id}: "${firstQBank.name}"`);

            const analyticsEndpoints = [
                '/overview',
                '/category-performance',
                '/subject-performance',
                '/trends'
            ];

            for (const analyticsPath of analyticsEndpoints) {
                try {
                    const analyticsResponse = await fetch(
                        `${BASE_URL}/api/student/qbanks/${firstQBank.id}/analytics${analyticsPath}`,
                        { headers: { Cookie: cookie } }
                    );

                    const statusEmoji = analyticsResponse.status === 200 ? '✅' : '❌';
                    console.log(`  ${statusEmoji} ${analyticsPath}: ${analyticsResponse.status}`);

                    if (analyticsResponse.status === 200) {
                        const analyticsData = await analyticsResponse.json();
                        if (analyticsPath === '/overview') {
                            console.log(`      Readiness: ${analyticsData.readinessScore || 0}%`);
                            console.log(`      Tests Taken: ${analyticsData.testsTaken || 0}`);
                        }
                    }
                } catch (error: any) {
                    console.log(`  ❌ ${analyticsPath}: ${error.message}`);
                }
            }
        } else {
            console.log('  ℹ️  No enrolled Q-Banks to test analytics');
        }
    }

    console.log('\n' + '═'.repeat(70));
    console.log('\n✨ TEST SUMMARY');
    console.log('All endpoints tested with authenticated session');
    console.log('Check the results above to verify everything is working correctly');
    console.log('\n' + '═'.repeat(70));
}

comprehensiveTest().catch(console.error);
