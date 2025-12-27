import { config } from 'dotenv';
config({ path: '.env.local' });

async function testDashboardAPIs() {
    const BASE_URL = 'http://localhost:3000';

    console.log('\n🧪 SIMULATING BROWSER REQUEST\n');
    console.log('Testing WITHOUT authentication cookie (simulating logged-out state):\n');

    const endpoints = [
        '/api/student/stats',
        '/api/student/enrolled-courses',
        '/api/student/requests'
    ];

    for (const endpoint of endpoints) {
        try {
            const response = await fetch(`${BASE_URL}${endpoint}`, {
                credentials: 'include', // This is what the browser sends
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            console.log(`${endpoint}:`);
            console.log(`  Status: ${response.status}`);

            if (response.status === 200) {
                const data = await response.json();
                console.log(`  ✅ Data:`, JSON.stringify(data).substring(0, 100) + '...');
            } else {
                const text = await response.text();
                console.log(`  ❌ Error: ${text.substring(0, 100)}`);
            }
        } catch (error: any) {
            console.log(`  ❌ Network Error: ${error.message}`);
        }
    }

    console.log('\n📝 NOTE: If all endpoints return 401/403, the browser has no valid cookie.');
    console.log('The user needs to log in again to get a fresh student_token cookie.');
}

testDashboardAPIs();
