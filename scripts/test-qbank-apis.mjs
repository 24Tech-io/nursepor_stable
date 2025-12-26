/**
 * Test script for Q-Bank APIs
 * Tests all Q-Bank endpoints to ensure they work correctly
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
let authToken = '';

// Test helper functions
async function testEndpoint(name, method, url, body = null, requiresAuth = true) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (requiresAuth && authToken) {
      options.headers['Cookie'] = `token=${authToken}`;
    }

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (response.ok) {
      console.log(`✅ ${name}: ${response.status}`);
      return { success: true, data };
    } else {
      console.log(`❌ ${name}: ${response.status} - ${data.message || 'Error'}`);
      return { success: false, status: response.status, data };
    }
  } catch (error) {
    console.log(`❌ ${name}: Network error - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🧪 Starting Q-Bank API Tests...\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  // Test 1: Check if server is running
  console.log('1. Testing server connection...');
  const healthCheck = await testEndpoint('Health Check', 'GET', `${BASE_URL}/api/auth/me`, null, false);
  
  if (!healthCheck.success && healthCheck.error) {
    console.log('\n❌ Server is not running. Please start the dev server:');
    console.log('   npm run dev\n');
    return;
  }

  // Test 2: Login as student (you'll need to provide credentials)
  console.log('\n2. Testing student login...');
  console.log('   ⚠️  Note: You need to login manually first to get a token');
  console.log('   Or use existing session cookie\n');

  // Test 3: List Q-Banks (requires auth)
  console.log('3. Testing GET /api/student/qbanks...');
  await testEndpoint('List Q-Banks', 'GET', `${BASE_URL}/api/student/qbanks`);

  // Test 4: Admin endpoints (requires admin auth)
  console.log('\n4. Testing admin endpoints...');
  await testEndpoint('Admin List Q-Banks', 'GET', `${BASE_URL}/api/admin/qbanks`);

  // Test 5: Admin Q-Bank requests
  console.log('\n5. Testing admin Q-Bank requests...');
  await testEndpoint('Admin List Requests', 'GET', `${BASE_URL}/api/admin/qbank-requests`);

  console.log('\n✅ Test suite completed!');
  console.log('\nNote: Some tests may fail if you\'re not authenticated.');
  console.log('To test fully:');
  console.log('1. Login at http://localhost:3000/login');
  console.log('2. Open browser DevTools → Application → Cookies');
  console.log('3. Copy the "token" cookie value');
  console.log('4. Update authToken in this script\n');
}

runTests();

