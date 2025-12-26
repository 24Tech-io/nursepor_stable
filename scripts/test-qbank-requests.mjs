/**
 * Test script for Q-Bank Requests Feature
 * Tests the complete flow: student request → admin approve/reject
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
async function fetchAPI(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  const data = await response.json().catch(() => ({}));
  return { response, data, ok: response.ok, status: response.status };
}

async function runTests() {
  console.log('🚀 Starting Q-Bank Requests Feature Tests\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  // Test 1: Check server is running
  await test('Server Health Check', async () => {
    const { ok } = await fetchAPI('/api/auth/me');
    if (!ok) {
      throw new Error('Server not responding. Make sure dev server is running.');
    }
  });

  // Test 2: Admin GET requests endpoint (structure)
  await test('Admin GET /api/admin/qbank-requests - Endpoint exists', async () => {
    const { response, data } = await fetchAPI('/api/admin/qbank-requests');
    
    // Should return 401 (not authenticated) or 200 (if authenticated)
    // But should NOT return 404
    if (response.status === 404) {
      throw new Error('Endpoint not found');
    }
    
    // If authenticated, should return proper structure
    if (response.ok && !data.requests) {
      throw new Error('Response missing "requests" field');
    }
  });

  // Test 3: Check approve endpoint exists
  await test('Admin POST /api/admin/qbank-requests/[id]/approve - Endpoint exists', async () => {
    const { response } = await fetchAPI('/api/admin/qbank-requests/999/approve', {
      method: 'POST',
    });
    
    // Should return 401/403 (auth) or 404 (not found) but NOT 405 (method not allowed)
    if (response.status === 405) {
      throw new Error('Endpoint does not accept POST method');
    }
  });

  // Test 4: Check reject endpoint exists
  await test('Admin POST /api/admin/qbank-requests/[id]/reject - Endpoint exists', async () => {
    const { response } = await fetchAPI('/api/admin/qbank-requests/999/reject', {
      method: 'POST',
      body: JSON.stringify({ reason: 'test' }),
    });
    
    // Should return 401/403 (auth) or 404 (not found) but NOT 405
    if (response.status === 405) {
      throw new Error('Endpoint does not accept POST method');
    }
  });

  // Test 5: Student GET requests endpoint
  await test('Student GET /api/student/qbank-requests - Endpoint exists', async () => {
    const { response, data } = await fetchAPI('/api/student/qbank-requests');
    
    if (response.status === 404) {
      throw new Error('Endpoint not found');
    }
    
    if (response.ok && !data.requests) {
      throw new Error('Response missing "requests" field');
    }
  });

  // Test 6: Student POST request endpoint
  await test('Student POST /api/student/qbank-requests - Endpoint exists', async () => {
    const { response } = await fetchAPI('/api/student/qbank-requests', {
      method: 'POST',
      body: JSON.stringify({ qbankId: 999 }),
    });
    
    if (response.status === 404) {
      throw new Error('Endpoint not found');
    }
    
    if (response.status === 405) {
      throw new Error('Endpoint does not accept POST method');
    }
  });

  // Test 7: Check frontend page route
  await test('Frontend page /admin/qbank-requests - Route exists', async () => {
    const { response } = await fetchAPI('/admin/qbank-requests');
    
    // Should return 200 (page exists) or redirect, but NOT 404
    if (response.status === 404) {
      throw new Error('Page route not found');
    }
  });

  // Summary
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
  
  console.log('\n💡 Note: Some tests may fail due to authentication.');
  console.log('   To test fully authenticated:');
  console.log('   1. Login as admin at http://localhost:3000/admin/login');
  console.log('   2. Login as student at http://localhost:3000/login');
  console.log('   3. Create test requests and test approve/reject flow\n');
  
  return results.failed === 0;
}

// Run tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

