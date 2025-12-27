import { config } from 'dotenv';
config({ path: '.env.local' });

const ports = [3000, 3002, 3003];

async function findWorkingPort() {
    console.log('🔍 Checking which ports have dev servers running...\n');

    for (const port of ports) {
        try {
            const response = await fetch(`http://localhost:${port}`, {
                signal: AbortSignal.timeout(2000)
            });
            console.log(`✅ Port ${port}: Server is RUNNING`);
            return port;
        } catch (error) {
            console.log(`❌ Port ${port}: No server`);
        }
    }

    return null;
}

async function runFullTest() {
    const workingPort = await findWorkingPort();

    if (!workingPort) {
        console.log('\n❌ No dev server found on ports 3000, 3002, or 3003');
        console.log('Please start the dev server: npm run dev');
        return;
    }

    const BASE_URL = `http://localhost:${workingPort}`;
    console.log(`\n✅ Using server on port ${workingPort}\n`);
    console.log('='.repeat(80));

    // Login and test
    console.log('🧪 FULL SYSTEM TEST\n');

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
    const cookie = loginResponse.headers.get('set-cookie')?.match(/student_token=([^;]+)/)?.[1];

    console.log(`✅ Logged in: ${userData.user.name} (${userData.user.email})`);
    console.log(`   Role: ${userData.user.role}, ID: ${userData.user.id}\n`);

    // Test all endpoints
    const endpoints = [
        { path: '/api/student/stats', name: 'Stats' },
        { path: '/api/student/enrolled-courses', name: 'Enrolled Courses' },
        { path: '/api/student/courses', name: 'Courses List' },
        { path: '/api/student/qbanks', name: 'Q-Banks' },
    ];

    console.log('📊 Testing Student Endpoints:\n');

    for (const endpoint of endpoints) {
        const response = await fetch(`${BASE_URL}${endpoint.path}`, {
            headers: { Cookie: `student_token=${cookie}` }
        });

        const emoji = response.status === 200 ? '✅' : '❌';
        console.log(`${emoji} ${endpoint.name}: ${response.status}`);

        if (response.status === 200) {
            const data = await response.json();
            if (endpoint.path.includes('stats')) {
                console.log(`   → Enrolled: ${data.stats?.coursesEnrolled || 0}, Hours: ${data.stats?.hoursLearned || 0}`);
            } else if (endpoint.path.includes('enrolled-courses')) {
                console.log(`   → Courses: ${data.enrolledCourses?.length || 0}`);
                if (data.enrolledCourses?.[0]) {
                    console.log(`   → First: "${data.enrolledCourses[0].course?.title}" (${data.enrolledCourses[0].progress}%)`);
                }
            } else if (endpoint.path.includes('qbanks')) {
                console.log(`   → Enrolled: ${data.enrolled?.length || 0}, Available: ${data.available?.length || 0}, Total: ${data.total || 0}`);
            }
        }
    }

    // Test Q-Bank Analytics
    console.log('\n🧬 Testing Q-Bank Analytics (After Auth Fix):\n');

    const qbanksResponse = await fetch(`${BASE_URL}/api/student/qbanks`, {
        headers: { Cookie: `student_token=${cookie}` }
    });

    if (qbanksResponse.status === 200) {
        const qbanksData = await qbanksResponse.json();

        if (qbanksData.enrolled && qbanksData.enrolled.length > 0) {
            const qbank = qbanksData.enrolled[0];
            console.log(`Testing Q-Bank ${qbank.id}: "${qbank.name}"\n`);

            const analyticsEndpoints = [
                '/overview',
                '/category-performance',
                '/subject-performance',
                '/trends'
            ];

            for (const path of analyticsEndpoints) {
                const analyticsResponse = await fetch(
                    `${BASE_URL}/api/student/qbanks/${qbank.id}/analytics${path}`,
                    { headers: { Cookie: `student_token=${cookie}` } }
                );

                const emoji = analyticsResponse.status === 200 ? '✅' : '❌';
                console.log(`${emoji} Analytics${path}: ${analyticsResponse.status}`);

                if (analyticsResponse.status === 200 && path === '/overview') {
                    const data = await analyticsResponse.json();
                    console.log(`   → Readiness: ${data.readinessScore || 0}%, Tests: ${data.testsCompleted || 0}, Questions: ${data.questionsAttempted || 0}`);
                }
            }
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✨ TEST COMPLETE\n');
}

runFullTest().catch(console.error);
