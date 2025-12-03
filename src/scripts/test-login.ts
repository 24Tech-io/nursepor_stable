import fetch from 'node-fetch';

async function testLogin() {
  console.log('Testing login for student@example.com...');
  const start = Date.now();

  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@example.com',
        password: 'Student123!',
        role: 'student',
      }),
    });

    const duration = Date.now() - start;
    console.log(`Response received in ${duration}ms`);
    console.log(`Status: ${response.status}`);

    const data = await response.json();
    console.log('Response body:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('✅ Login successful');
    } else {
      console.log('❌ Login failed');
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

testLogin();
