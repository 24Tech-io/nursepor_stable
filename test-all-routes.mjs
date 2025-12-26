#!/usr/bin/env node

/**
 * Complete Route Testing Script
 * Tests all routes in the LMS platform
 */

const BASE_URL = 'http://localhost:3000';

const routes = {
  'PUBLIC ROUTES - No Authentication Required': [
    { path: '/', name: 'Student Welcome Page', expectedStatus: 200 },
    { path: '/login', name: 'Student Login', expectedStatus: 200 },
    { path: '/register', name: 'Student Registration', expectedStatus: 200 },
    { path: '/forgot-password', name: 'Forgot Password', expectedStatus: 200 },
    { path: '/admin', name: 'Admin Welcome Page', expectedStatus: 200 },
    { path: '/admin/login', name: 'Admin Login', expectedStatus: 200 },
    { path: '/admin/register', name: 'Admin Registration', expectedStatus: 200 },
  ],
  'API ROUTES - Public': [
    { path: '/api/health', name: 'Health Check', expectedStatus: 200 },
    { path: '/api/auth/me', name: 'Check Auth (should 401)', expectedStatus: 401 },
  ],
  'PROTECTED STUDENT ROUTES - Should Redirect to Login': [
    { path: '/student/dashboard', name: 'Student Dashboard', expectedStatus: 307 },
    { path: '/student/courses', name: 'Student Courses', expectedStatus: 307 },
    { path: '/student/progress', name: 'Student Progress', expectedStatus: 307 },
    { path: '/student/qbank', name: 'Student Q-Bank', expectedStatus: 307 },
  ],
  'PROTECTED ADMIN ROUTES - Should Redirect to Admin Login': [
    { path: '/admin/dashboard', name: 'Admin Dashboard', expectedStatus: 307 },
    { path: '/admin/courses', name: 'Admin Courses', expectedStatus: 307 },
    { path: '/admin/students', name: 'Admin Students', expectedStatus: 307 },
    { path: '/admin/qbank', name: 'Admin Q-Bank', expectedStatus: 307 },
  ],
};

async function testRoute(path, name, expectedStatus) {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      redirect: 'manual', // Don't follow redirects
    });
    
    const status = response.status;
    const passed = status === expectedStatus;
    const icon = passed ? '✅' : '❌';
    
    console.log(`${icon} ${name.padEnd(40)} ${path.padEnd(30)} Status: ${status} ${passed ? '' : `(Expected: ${expectedStatus})`}`);
    
    return passed;
  } catch (error) {
    console.log(`❌ ${name.padEnd(40)} ${path.padEnd(30)} ERROR: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('\n🧪 TESTING ALL ROUTES\n');
  console.log('='.repeat(120));
  
  let totalTests = 0;
  let passedTests = 0;
  
  for (const [category, routeList] of Object.entries(routes)) {
    console.log(`\n📂 ${category}\n`);
    
    for (const route of routeList) {
      totalTests++;
      const passed = await testRoute(route.path, route.name, route.expectedStatus);
      if (passed) passedTests++;
    }
  }
  
  console.log('\n' + '='.repeat(120));
  console.log(`\n📊 RESULTS: ${passedTests}/${totalTests} tests passed\n`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED! Your application is working correctly.\n');
  } else {
    console.log(`⚠️  ${totalTests - passedTests} test(s) failed. Please review the output above.\n`);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await fetch(BASE_URL);
    return true;
  } catch (error) {
    console.error(`\n❌ Server is not running on ${BASE_URL}`);
    console.error('   Please start the server with: npm run dev\n');
    return false;
  }
}

// Main execution
(async () => {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await runTests();
  }
})();

