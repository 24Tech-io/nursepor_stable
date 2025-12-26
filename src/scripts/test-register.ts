import fetch from 'node-fetch';

async function testRegister() {
  console.log('Registering student@example.com...');
  const start = Date.now();

  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Student',
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
      console.log('✅ Registration successful');
    } else {
      console.log('❌ Registration failed');
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

testRegister();
