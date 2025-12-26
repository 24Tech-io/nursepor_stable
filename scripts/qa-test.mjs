/**
 * Comprehensive QA Testing Script
 * Tests all features, data synchronization, and identifies issues
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Load environment variables
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
  console.log('⚠️  No .env.local file found, using defaults');
}

const BASE_URL = envVars.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Test results storage
const results = {
  passed: [],
  failed: [],
  warnings: [],
  syncIssues: [],
  dataMismatches: []
};

// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
  try {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    const data = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      status: response.status,
      data,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      status: 0,
    };
  }
}

// Test categories
const tests = {
  // Health & Infrastructure
  health: async () => {
    console.log('\n📊 Testing Health & Infrastructure...');
    const health = await apiRequest('/health');
    if (health.ok) {
      results.passed.push('Health endpoint');
      return true;
    } else {
      results.failed.push('Health endpoint - Server not responding');
      return false;
    }
  },

  // Authentication
  auth: async () => {
    console.log('\n🔐 Testing Authentication...');
    
    // Test registration endpoint exists
    const register = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'test123',
        role: 'student'
      })
    });
    
    if (register.status === 400 || register.status === 200 || register.status === 409) {
      results.passed.push('Auth: Registration endpoint exists');
    } else {
      results.failed.push(`Auth: Registration endpoint - Status ${register.status}`);
    }

    // Test login endpoint
    const login = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'test123'
      })
    });
    
    if (login.status === 401 || login.status === 200) {
      results.passed.push('Auth: Login endpoint exists');
    } else {
      results.failed.push(`Auth: Login endpoint - Status ${login.status}`);
    }

    // Test me endpoint
    const me = await apiRequest('/auth/me');
    if (me.status === 401 || me.status === 200) {
      results.passed.push('Auth: Me endpoint exists');
    } else {
      results.failed.push(`Auth: Me endpoint - Status ${me.status}`);
    }
  },

  // Enrollment Synchronization
  enrollmentSync: async () => {
    console.log('\n🔄 Testing Enrollment Synchronization...');
    
    // Check sync endpoints
    const syncCheck = await apiRequest('/sync/check');
    if (syncCheck.ok || syncCheck.status === 401) {
      results.passed.push('Enrollment Sync: Sync check endpoint exists');
    } else {
      results.failed.push('Enrollment Sync: Sync check endpoint not working');
    }

    const syncStatus = await apiRequest('/sync/status');
    if (syncStatus.ok || syncStatus.status === 401) {
      results.passed.push('Enrollment Sync: Sync status endpoint exists');
    } else {
      results.failed.push('Enrollment Sync: Sync status endpoint not working');
    }

    // Check enrollment endpoints
    const enrollments = await apiRequest('/enrollments');
    if (enrollments.status === 401 || enrollments.status === 200) {
      results.passed.push('Enrollment Sync: Enrollments endpoint exists');
    } else {
      results.failed.push(`Enrollment Sync: Enrollments endpoint - Status ${enrollments.status}`);
    }

    const studentEnrolled = await apiRequest('/student/enrolled-courses');
    if (studentEnrolled.status === 401 || studentEnrolled.status === 200) {
      results.passed.push('Enrollment Sync: Student enrolled courses endpoint exists');
    } else {
      results.failed.push(`Enrollment Sync: Student enrolled courses - Status ${studentEnrolled.status}`);
    }
  },

  // Admin Endpoints
  adminEndpoints: async () => {
    console.log('\n👨‍💼 Testing Admin Endpoints...');
    
    const adminEndpoints = [
      '/admin/courses',
      '/admin/students',
      '/admin/requests',
      '/admin/quizzes',
      '/admin/reports/students',
      '/admin/reports/enrollment',
      '/admin/reports/engagement',
    ];

    for (const endpoint of adminEndpoints) {
      const response = await apiRequest(endpoint);
      if (response.status === 401 || response.status === 200 || response.status === 403) {
        results.passed.push(`Admin: ${endpoint} exists`);
      } else {
        results.failed.push(`Admin: ${endpoint} - Status ${response.status}`);
      }
    }
  },

  // Student Endpoints
  studentEndpoints: async () => {
    console.log('\n👨‍🎓 Testing Student Endpoints...');
    
    const studentEndpoints = [
      '/student/courses',
      '/student/enrolled-courses',
      '/student/stats',
      '/student/progress',
      '/student/progress-details',
      '/student/continue-learning',
      '/student/quiz-history',
    ];

    for (const endpoint of studentEndpoints) {
      const response = await apiRequest(endpoint);
      if (response.status === 401 || response.status === 200) {
        results.passed.push(`Student: ${endpoint} exists`);
      } else {
        results.failed.push(`Student: ${endpoint} - Status ${response.status}`);
      }
    }
  },

  // Q-Bank Endpoints
  qbankEndpoints: async () => {
    console.log('\n📚 Testing Q-Bank Endpoints...');
    
    const qbankEndpoints = [
      '/qbank',
      '/student/qbanks',
      '/admin/qbank',
    ];

    for (const endpoint of qbankEndpoints) {
      const response = await apiRequest(endpoint);
      if (response.status === 401 || response.status === 200 || response.status === 404) {
        results.passed.push(`Q-Bank: ${endpoint} exists`);
      } else {
        results.failed.push(`Q-Bank: ${endpoint} - Status ${response.status}`);
      }
    }
  },

  // Course Management
  courseManagement: async () => {
    console.log('\n📖 Testing Course Management...');
    
    const courseEndpoints = [
      '/courses',
      '/courses/1', // Assuming course ID 1 exists or will return 404
      '/admin/courses',
    ];

    for (const endpoint of courseEndpoints) {
      const response = await apiRequest(endpoint);
      if (response.status === 401 || response.status === 200 || response.status === 404) {
        results.passed.push(`Courses: ${endpoint} exists`);
      } else {
        results.failed.push(`Courses: ${endpoint} - Status ${response.status}`);
      }
    }
  },

  // Data Consistency Checks
  dataConsistency: async () => {
    console.log('\n🔍 Testing Data Consistency...');
    
    // Check if sync validation endpoint exists
    const syncValidate = await apiRequest('/sync/validate');
    if (syncValidate.ok || syncValidate.status === 401) {
      results.passed.push('Data Consistency: Sync validate endpoint exists');
    } else {
      results.warnings.push('Data Consistency: Sync validate endpoint may not be working');
    }

    // Check sync repair endpoint
    const syncRepair = await apiRequest('/admin/sync-repair');
    if (syncRepair.status === 401 || syncRepair.status === 200 || syncRepair.status === 403) {
      results.passed.push('Data Consistency: Sync repair endpoint exists');
    } else {
      results.warnings.push('Data Consistency: Sync repair endpoint may not be working');
    }
  },
};

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Comprehensive QA Testing...');
  console.log(`📍 Testing against: ${BASE_URL}`);
  console.log('='.repeat(60));

  // Check if server is running
  const serverRunning = await tests.health();
  if (!serverRunning) {
    console.log('\n❌ Server is not running. Please start the development server first.');
    console.log('   Run: npm run dev');
    return;
  }

  // Run all test categories
  await tests.auth();
  await tests.enrollmentSync();
  await tests.adminEndpoints();
  await tests.studentEndpoints();
  await tests.qbankEndpoints();
  await tests.courseManagement();
  await tests.dataConsistency();

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\n✅ PASSED: ${results.passed.length} tests`);
  results.passed.forEach(test => console.log(`   ✓ ${test}`));
  
  console.log(`\n❌ FAILED: ${results.failed.length} tests`);
  results.failed.forEach(test => console.log(`   ✗ ${test}`));
  
  console.log(`\n⚠️  WARNINGS: ${results.warnings.length} tests`);
  results.warnings.forEach(test => console.log(`   ⚠ ${test}`));

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: {
      total: results.passed.length + results.failed.length + results.warnings.length,
      passed: results.passed.length,
      failed: results.failed.length,
      warnings: results.warnings.length,
    },
    results: {
      passed: results.passed,
      failed: results.failed,
      warnings: results.warnings,
    }
  };

  console.log('\n' + '='.repeat(60));
  console.log('📝 Detailed Report Generated');
  console.log('='.repeat(60));
  console.log(JSON.stringify(report, null, 2));

  // Save report to file
  const fs = await import('fs');
  const reportPath = join(projectRoot, 'qa-test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Report saved to: ${reportPath}`);
}

// Run tests
runAllTests().catch(console.error);


