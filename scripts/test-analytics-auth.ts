import { config } from 'dotenv';
config({ path: '.env.local' });

async function testAnalytics() {
    const BASE_URL = 'http://localhost:3000';

    console.log('\n🔬 TESTING Q-BANK ANALYTICS AUTH\n');

    // Login
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'adhithiyanmaliackal@gmail.com',
            password: 'Adhi1234'
        })
    });

    const loginData = await loginResponse.json();
    console.log(`✅ Logged in as: ${loginData.user.email}`);

    // Extract all possible cookie variations
    const setCookieHeader = loginResponse.headers.get('set-cookie') || '';
    console.log(`\nCookie header: ${setCookieHeader.substring(0, 100)}...`);

    // Try with student_token
    let studentTokenMatch = setCookieHeader.match(/student_token=([^;]+)/);
    let tokenMatch = setCookieHeader.match(/token=([^;]+)/);

    console.log(`\nstudent_token found: ${!!studentTokenMatch}`);
    console.log(`token found: ${!!tokenMatch}`);

    let cookie1 = studentTokenMatch ? `student_token=${studentTokenMatch[1]}` : '';
    let cookie2 = tokenMatch ? `token=${tokenMatch[1]}` : '';

    // Test Q-Bank 1 analytics
    const qbankId = 1;
    const analyticsPath = '/overview';

    console.log(`\n🧪 Testing /api/student/qbanks/${qbankId}/analytics${analyticsPath}\n`);

    // Test with student_token
    if (cookie1) {
        console.log('Test 1: With student_token cookie');
        const response = await fetch(`${BASE_URL}/api/student/qbanks/${qbankId}/analytics${analyticsPath}`, {
            headers: { Cookie: cookie1 }
        });
        console.log(`  Status: ${response.status}`);
        if (response.status !== 200) {
            const text = await response.text();
            console.log(`  Error: ${text.substring(0, 200)}`);
        } else {
            const data = await response.json();
            console.log(`  ✅ Success! Readiness Score: ${data.readinessScore}`);
        }
    }

    // Test with token
    if (cookie2) {
        console.log('\nTest 2: With token cookie');
        const response = await fetch(`${BASE_URL}/api/student/qbanks/${qbankId}/analytics${analyticsPath}`, {
            headers: { Cookie: cookie2 }
        });
        console.log(`  Status: ${response.status}`);
        if (response.status !== 200) {
            const text = await response.text();
            console.log(`  Error: ${text.substring(0, 200)}`);
        } else {
            const data = await response.json();
            console.log(`  ✅ Success! Readiness Score: ${data.readinessScore}`);
        }
    }

    // Test with BOTH cookies
    if (cookie1 && cookie2) {
        console.log('\nTest 3: With BOTH cookies');
        const response = await fetch(`${BASE_URL}/api/student/qbanks/${qbankId}/analytics${analyticsPath}`, {
            headers: { Cookie: `${cookie1}; ${cookie2}` }
        });
        console.log(`  Status: ${response.status}`);
        if (response.status !== 200) {
            const text = await response.text();
            console.log(`  Error: ${text.substring(0, 200)}`);
        } else {
            const data = await response.json();
            console.log(`  ✅ Success! Readiness Score: ${data.readinessScore}`);
        }
    }
}

testAnalytics().catch(console.error);
