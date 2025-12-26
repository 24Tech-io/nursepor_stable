/**
 * API Endpoints Debugger
 * Tests all API endpoints and identifies issues
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

// Load environment
let envVars = {};
try {
  const envFile = readFileSync(join(projectRoot, '.env.local'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  });
} catch (e) {
  console.log('⚠️  No .env.local file found');
}

const BASE_URL = envVars.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

const results = {
  working: [],
  broken: [],
  requiresAuth: [],
  errors: [],
};

async function testEndpoint(name, method, endpoint, body = null, requiresAuth = false) {
  try {
    const url = `${API_BASE}${endpoint}`;
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    const result = {
      name,
      endpoint,
      method,
      status: response.status,
      ok: response.ok,
      requiresAuth,
      data: data.message || data.error || 'OK',
    };

    if (response.status === 401 && requiresAuth) {
      results.requiresAuth.push(result);
      return { ...result, status: 'requires_auth' };
    } else if (response.ok || response.status === 404) {
      results.working.push(result);
      return { ...result, status: 'working' };
    } else {
      results.broken.push(result);
      return { ...result, status: 'broken' };
    }
  } catch (error) {
    const result = {
      name,
      endpoint,
      method,
      error: error.message,
      status: 'error',
    };
    results.errors.push(result);
    return result;
  }
}

async function debugAllEndpoints() {
  console.log('🔍 API Endpoints Debugger');
  console.log('='.repeat(70));
  console.log(`Testing against: ${BASE_URL}\n`);

  // Health check
  console.log('1️⃣ Testing Health Endpoints...');
  await testEndpoint('Health Check', 'GET', '/health');
  await testEndpoint('Sync Health', 'GET', '/sync/health');

  // Authentication endpoints
  console.log('\n2️⃣ Testing Authentication Endpoints...');
  await testEndpoint('Register', 'POST', '/auth/register', {
    email: 'test@example.com',
    password: 'test123',
    role: 'student'
  });
  await testEndpoint('Login', 'POST', '/auth/login', {
    email: 'test@example.com',
    password: 'test123'
  });
  await testEndpoint('Admin Login', 'POST', '/auth/admin-login', {
    email: 'admin@example.com',
    password: 'admin123'
  });
  await testEndpoint('Get Me', 'GET', '/auth/me', null, true);
  await testEndpoint('Logout', 'POST', '/auth/logout', null, true);

  // Enrollment endpoints
  console.log('\n3️⃣ Testing Enrollment Endpoints...');
  await testEndpoint('Get Enrollments', 'GET', '/enrollments?studentId=1', null, true);
  await testEndpoint('Student Enrolled Courses', 'GET', '/student/enrolled-courses', null, true);
  await testEndpoint('Admin Enrollment Status', 'GET', '/admin/enrollment?studentId=1', null, true);
  await testEndpoint('Admin Enroll Student', 'POST', '/admin/enrollment', {
    studentId: 1,
    courseId: 1
  }, true);
  await testEndpoint('Student Enroll', 'POST', '/student/enroll', {
    courseId: 1
  }, true);
  await testEndpoint('Student Enroll Free', 'POST', '/student/enroll-free', {
    courseId: 1
  }, true);

  // Course endpoints
  console.log('\n4️⃣ Testing Course Endpoints...');
  await testEndpoint('List Courses', 'GET', '/courses');
  await testEndpoint('Get Course', 'GET', '/courses/1');
  await testEndpoint('Admin List Courses', 'GET', '/admin/courses', null, true);
  await testEndpoint('Admin Create Course', 'POST', '/admin/courses', {
    title: 'Test Course',
    description: 'Test',
    status: 'published'
  }, true);
  await testEndpoint('Admin Update Course', 'PATCH', '/admin/courses/1', {
    description: 'Updated'
  }, true);

  // Request endpoints
  console.log('\n5️⃣ Testing Request Endpoints...');
  await testEndpoint('Student Requests', 'GET', '/student/requests', null, true);
  await testEndpoint('Create Request', 'POST', '/student/requests', {
    courseId: 1
  }, true);
  await testEndpoint('Admin Requests', 'GET', '/admin/requests', null, true);
  await testEndpoint('Admin Approve Request', 'PATCH', '/admin/requests/1', {
    status: 'approved'
  }, true);

  // Q-Bank endpoints
  console.log('\n6️⃣ Testing Q-Bank Endpoints...');
  await testEndpoint('List Q-Banks', 'GET', '/qbank');
  await testEndpoint('Student Q-Banks', 'GET', '/student/qbanks', null, true);
  await testEndpoint('Admin Q-Banks', 'GET', '/admin/qbank', null, true);
  await testEndpoint('Admin Create Q-Bank', 'POST', '/admin/qbank', {
    title: 'Test Q-Bank',
    courseId: 1
  }, true);

  // Progress endpoints
  console.log('\n7️⃣ Testing Progress Endpoints...');
  await testEndpoint('Student Progress', 'GET', '/student/progress', null, true);
  await testEndpoint('Student Progress Details', 'GET', '/student/progress-details', null, true);
  await testEndpoint('Update Video Progress', 'POST', '/student/video-progress', {
    chapterId: 1,
    currentTime: 100,
    duration: 1000
  }, true);

  // Sync endpoints
  console.log('\n8️⃣ Testing Sync Endpoints...');
  await testEndpoint('Sync Check', 'GET', '/sync/check', null, true);
  await testEndpoint('Sync Status', 'GET', '/sync/status', null, true);
  await testEndpoint('Sync Validate', 'GET', '/sync/validate', null, true);

  // Reports endpoints
  console.log('\n9️⃣ Testing Reports Endpoints...');
  await testEndpoint('Student Reports', 'GET', '/admin/reports/students', null, true);
  await testEndpoint('Enrollment Reports', 'GET', '/admin/reports/enrollment', null, true);
  await testEndpoint('Engagement Reports', 'GET', '/admin/reports/engagement', null, true);

  // Print results
  console.log('\n' + '='.repeat(70));
  console.log('📊 API ENDPOINTS DEBUG REPORT');
  console.log('='.repeat(70));

  console.log(`\n✅ WORKING: ${results.working.length} endpoints`);
  results.working.forEach(r => {
    console.log(`   ✓ ${r.method} ${r.endpoint} (${r.status})`);
  });

  console.log(`\n🔐 REQUIRES AUTH: ${results.requiresAuth.length} endpoints`);
  results.requiresAuth.forEach(r => {
    console.log(`   🔒 ${r.method} ${r.endpoint} (401 - expected)`);
  });

  console.log(`\n❌ BROKEN: ${results.broken.length} endpoints`);
  results.broken.forEach(r => {
    console.log(`   ✗ ${r.method} ${r.endpoint} (${r.status}): ${r.data}`);
  });

  console.log(`\n💥 ERRORS: ${results.errors.length} endpoints`);
  results.errors.forEach(r => {
    console.log(`   ⚠ ${r.method} ${r.endpoint}: ${r.error}`);
  });

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: {
      working: results.working.length,
      requiresAuth: results.requiresAuth.length,
      broken: results.broken.length,
      errors: results.errors.length,
    },
    results: {
      working: results.working,
      requiresAuth: results.requiresAuth,
      broken: results.broken,
      errors: results.errors,
    }
  };

  const fs = await import('fs');
  const reportPath = join(projectRoot, 'debug-api-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Report saved to: ${reportPath}`);
}

// Check if server is running first
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    if (response.ok) {
      return true;
    }
  } catch (e) {
    return false;
  }
  return false;
}

async function main() {
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log('❌ Server is not running!');
    console.log('   Please start the server: npm run dev');
    process.exit(1);
  }

  await debugAllEndpoints();
}

main().catch(console.error);


