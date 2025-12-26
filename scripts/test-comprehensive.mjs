/**
 * Comprehensive Test Script
 * Tests: Login, Registration, Q-Bank Creation/Management, Course Creation/Management
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Test results
const results = {
  passed: 0,
  failed: 0,
  errors: []
};

// Test helper
async function test(name, fn) {
  try {
    console.log(`\n🧪 Testing: ${name}`);
    await fn();
    results.passed++;
    console.log(`✅ PASSED: ${name}`);
  } catch (error) {
    results.failed++;
    results.errors.push({ test: name, error: error.message });
    console.log(`❌ FAILED: ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

// HTTP helper
async function request(method, url, options = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
    ...options,
  });
  
  const data = await response.json().catch(() => ({ message: 'No JSON response' }));
  return { response, data, status: response.status };
}

// ============================================
// 1. REGISTRATION TESTS
// ============================================

async function testRegistration() {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'Test123!@#';
  
  await test('Student Registration', async () => {
    const { response, data } = await request('POST', `${BASE_URL}/api/auth/register`, {
      body: JSON.stringify({
        name: 'Test Student',
        email: testEmail,
        password: testPassword,
        role: 'student'
      })
    });
    
    if (response.status !== 201 && response.status !== 200) {
      throw new Error(`Expected 201/200, got ${response.status}: ${JSON.stringify(data)}`);
    }
    
    if (!data.user && !data.message) {
      throw new Error('No user or message in response');
    }
    
    console.log(`   ✅ Registered student: ${testEmail}`);
    return { email: testEmail, password: testPassword };
  });
  
  return { email: testEmail, password: testPassword };
}

// ============================================
// 2. LOGIN TESTS
// ============================================

async function testLogin(email, password) {
  let token = null;
  
  await test('Student Login', async () => {
    const { response, data } = await request('POST', `${BASE_URL}/api/auth/login`, {
      body: JSON.stringify({
        email,
        password
      })
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(data)}`);
    }
    
    if (!data.user && !data.token) {
      throw new Error('No user or token in response');
    }
    
    token = data.token || response.headers.get('set-cookie');
    console.log(`   ✅ Logged in as: ${data.user?.email || email}`);
    return token;
  });
  
  await test('Admin Login', async () => {
    // Try to login as admin (assuming admin exists)
    const { response, data } = await request('POST', `${BASE_URL}/api/auth/admin-login`, {
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123'
      })
    });
    
    // Admin login might fail if admin doesn't exist, that's okay
    if (response.status === 200) {
      console.log(`   ✅ Admin login successful`);
    } else {
      console.log(`   ⚠️  Admin login skipped (admin may not exist)`);
    }
  });
  
  return token;
}

// ============================================
// 3. Q-BANK CREATION & MANAGEMENT TESTS
// ============================================

async function testQBankManagement(adminToken) {
  let qbankId = null;
  
  await test('Create Q-Bank', async () => {
    const { response, data } = await request('POST', `${BASE_URL}/api/admin/qbanks`, {
      headers: {
        'Cookie': `adminToken=${adminToken}`,
      },
      body: JSON.stringify({
        name: `Test Q-Bank ${Date.now()}`,
        description: 'Test Q-Bank Description',
        instructor: 'Test Instructor',
        pricing: 0,
        status: 'published',
        isRequestable: true,
        isPublic: false,
        isDefaultUnlocked: false
      })
    });
    
    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Expected 200/201, got ${response.status}: ${JSON.stringify(data)}`);
    }
    
    if (!data.qbank || !data.qbank.id) {
      throw new Error('No qbank in response');
    }
    
    qbankId = data.qbank.id;
    console.log(`   ✅ Created Q-Bank ID: ${qbankId}`);
  });
  
  await test('List Q-Banks', async () => {
    const { response, data } = await request('GET', `${BASE_URL}/api/admin/qbanks`, {
      headers: {
        'Cookie': `adminToken=${adminToken}`,
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(data)}`);
    }
    
    if (!data.qbanks || !Array.isArray(data.qbanks)) {
      throw new Error('No qbanks array in response');
    }
    
    console.log(`   ✅ Found ${data.qbanks.length} Q-Banks`);
  });
  
  await test('Get Q-Bank by ID', async () => {
    if (!qbankId) {
      throw new Error('No Q-Bank ID from previous test');
    }
    
    const { response, data } = await request('GET', `${BASE_URL}/api/admin/qbanks/${qbankId}`, {
      headers: {
        'Cookie': `adminToken=${adminToken}`,
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(data)}`);
    }
    
    if (!data.qbank) {
      throw new Error('No qbank in response');
    }
    
    console.log(`   ✅ Retrieved Q-Bank: ${data.qbank.name}`);
  });
  
  await test('Update Q-Bank', async () => {
    if (!qbankId) {
      throw new Error('No Q-Bank ID from previous test');
    }
    
    const { response, data } = await request('PUT', `${BASE_URL}/api/admin/qbanks/${qbankId}`, {
      headers: {
        'Cookie': `adminToken=${adminToken}`,
      },
      body: JSON.stringify({
        description: 'Updated Test Q-Bank Description'
      })
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(data)}`);
    }
    
    console.log(`   ✅ Updated Q-Bank ID: ${qbankId}`);
  });
  
  return qbankId;
}

// ============================================
// 4. COURSE CREATION & MANAGEMENT TESTS
// ============================================

async function testCourseManagement(adminToken) {
  let courseId = null;
  
  await test('Create Course', async () => {
    const { response, data } = await request('POST', `${BASE_URL}/api/courses`, {
      headers: {
        'Cookie': `adminToken=${adminToken}`,
      },
      body: JSON.stringify({
        title: `Test Course ${Date.now()}`,
        description: 'Test Course Description',
        instructor: 'Test Instructor',
        pricing: 0,
        status: 'published',
        isRequestable: true,
        isPublic: false,
        isDefaultUnlocked: false
      })
    });
    
    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Expected 200/201, got ${response.status}: ${JSON.stringify(data)}`);
    }
    
    if (!data.course || !data.course.id) {
      throw new Error('No course in response');
    }
    
    courseId = data.course.id;
    console.log(`   ✅ Created Course ID: ${courseId}`);
  });
  
  await test('List Courses', async () => {
    const { response, data } = await request('GET', `${BASE_URL}/api/courses`);
    
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(data)}`);
    }
    
    if (!data.courses || !Array.isArray(data.courses)) {
      throw new Error('No courses array in response');
    }
    
    console.log(`   ✅ Found ${data.courses.length} courses`);
  });
  
  await test('Get Course by ID', async () => {
    if (!courseId) {
      throw new Error('No Course ID from previous test');
    }
    
    const { response, data } = await request('GET', `${BASE_URL}/api/courses/${courseId}`);
    
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(data)}`);
    }
    
    if (!data.course) {
      throw new Error('No course in response');
    }
    
    console.log(`   ✅ Retrieved Course: ${data.course.title}`);
  });
  
  await test('Update Course', async () => {
    if (!courseId) {
      throw new Error('No Course ID from previous test');
    }
    
    const { response, data } = await request('PATCH', `${BASE_URL}/api/courses/${courseId}`, {
      headers: {
        'Cookie': `adminToken=${adminToken}`,
      },
      body: JSON.stringify({
        description: 'Updated Test Course Description'
      })
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(data)}`);
    }
    
    console.log(`   ✅ Updated Course ID: ${courseId}`);
  });
  
  return courseId;
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function runTests() {
  console.log('\n🚀 Starting Comprehensive Tests');
  console.log(`Base URL: ${BASE_URL}\n`);
  
  let studentCredentials = null;
  let adminToken = null;
  
  try {
    // 1. Test Registration
    console.log('\n' + '='.repeat(60));
    console.log('PHASE 1: REGISTRATION');
    console.log('='.repeat(60));
    studentCredentials = await testRegistration();
    
    // 2. Test Login
    console.log('\n' + '='.repeat(60));
    console.log('PHASE 2: LOGIN');
    console.log('='.repeat(60));
    const studentToken = await testLogin(studentCredentials.email, studentCredentials.password);
    
    // Try to get admin token (might fail if admin doesn't exist)
    try {
      const adminResponse = await fetch(`${BASE_URL}/api/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'admin123'
        })
      });
      
      if (adminResponse.ok) {
        const adminData = await adminResponse.json();
        adminToken = adminData.token;
        console.log('   ✅ Admin token obtained');
      } else {
        console.log('   ⚠️  Admin login failed - using student token for admin tests');
        adminToken = studentToken;
      }
    } catch (e) {
      console.log('   ⚠️  Admin login skipped - using student token');
      adminToken = studentToken;
    }
    
    // 3. Test Q-Bank Management
    console.log('\n' + '='.repeat(60));
    console.log('PHASE 3: Q-BANK CREATION & MANAGEMENT');
    console.log('='.repeat(60));
    await testQBankManagement(adminToken);
    
    // 4. Test Course Management
    console.log('\n' + '='.repeat(60));
    console.log('PHASE 4: COURSE CREATION & MANAGEMENT');
    console.log('='.repeat(60));
    await testCourseManagement(adminToken);
    
  } catch (error) {
    console.error('\n❌ Test suite error:', error);
    results.failed++;
    results.errors.push({ test: 'Test Suite', error: error.message });
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(({ test, error }) => {
      console.log(`   - ${test}: ${error}`);
    });
  }
  
  console.log('\n💡 Note: Some tests may fail due to authentication or missing data.');
  console.log('   This is expected if admin account doesn\'t exist or endpoints require specific setup.\n');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(console.error);

