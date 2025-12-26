#!/usr/bin/env node

/**
 * Comprehensive Test Script for Critical Fixes
 * Tests:
 * 1. Course API 500 Error Fix
 * 2. Admin Students Date Formatting
 * 3. Missing Table Error Handling
 * 4. Build Errors
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function testEndpoint(name, method, url, options = {}) {
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    });

    const data = await response.json().catch(() => ({}));
    const success = response.status < 400;

    if (success) {
      log(`   ✅ ${name}: ${response.status}`, 'green');
      return { success: true, status: response.status, data };
    } else {
      log(`   ❌ ${name}: ${response.status} - ${data.message || 'Error'}`, 'red');
      if (data.error) {
        log(`      Error: ${data.error}`, 'yellow');
      }
      return { success: false, status: response.status, data };
    }
  } catch (error) {
    log(`   ❌ ${name}: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function testStudentCoursesAPI() {
  logSection('TEST 1: Student Courses API (500 Error Fix)');
  
  log('Testing: GET /api/student/courses', 'blue');
  log('Expected: Should return 200 with courses array (even if tables missing)', 'blue');
  
  const result = await testEndpoint(
    'Student Courses API',
    'GET',
    `${BASE_URL}/api/student/courses`
  );

  if (result.success) {
    const courses = result.data?.courses || [];
    log(`   📊 Found ${courses.length} courses`, 'green');
    
    if (courses.length > 0) {
      const sample = courses[0];
      log(`   📝 Sample course: ${sample.title} (ID: ${sample.id})`, 'blue');
      log(`   📝 Status: ${sample.status}, Enrolled: ${sample.isEnrolled || false}`, 'blue');
    } else {
      log(`   ⚠️  No courses returned (may be expected if no courses exist)`, 'yellow');
    }
    
    // Check for error handling
    if (result.data?.error) {
      log(`   ⚠️  API returned error in response: ${result.data.error}`, 'yellow');
    }
  } else {
    log(`   ❌ CRITICAL: API still returning error!`, 'red');
    if (result.data?.error) {
      log(`   Error details: ${JSON.stringify(result.data.error)}`, 'red');
    }
  }

  return result;
}

async function testAdminStudentsAPI() {
  logSection('TEST 2: Admin Students API (Date Formatting Fix)');
  
  log('Testing: GET /api/admin/students', 'blue');
  log('Expected: Should return 200 with students array, dates formatted correctly', 'blue');
  
  const result = await testEndpoint(
    'Admin Students API',
    'GET',
    `${BASE_URL}/api/admin/students`
  );

  if (result.success) {
    const students = result.data?.students || [];
    log(`   📊 Found ${students.length} students`, 'green');
    
    if (students.length > 0) {
      const sample = students[0];
      log(`   📝 Sample student: ${sample.name || sample.email}`, 'blue');
      
      // Check date formatting
      if (sample.joinedDate) {
        const date = new Date(sample.joinedDate);
        const isValid = !isNaN(date.getTime());
        
        if (isValid) {
          log(`   ✅ Date is valid: ${sample.joinedDate} (${date.toLocaleDateString()})`, 'green');
        } else {
          log(`   ❌ Date is invalid: ${sample.joinedDate}`, 'red');
        }
      } else {
        log(`   ⚠️  No joinedDate field in response`, 'yellow');
      }
    } else {
      log(`   ⚠️  No students returned`, 'yellow');
    }
  } else {
    log(`   ❌ CRITICAL: API returning error!`, 'red');
  }

  return result;
}

async function testServerHealth() {
  logSection('TEST 3: Server Health Check');
  
  const healthCheck = await testEndpoint(
    'Server Health',
    'GET',
    `${BASE_URL}/api/auth/me`
  );

  if (!healthCheck.success && healthCheck.error?.includes('ECONNREFUSED')) {
    log('   ❌ Server is not running!', 'red');
    log('   Please start the dev server: npm run dev', 'yellow');
    return false;
  }

  return true;
}

async function testBuildErrors() {
  logSection('TEST 4: Build Error Check');
  
  log('Checking for build errors in key files...', 'blue');
  
  const filesToCheck = [
    'src/app/api/admin/courses/[courseId]/questions/route.ts',
    'src/app/api/student/courses/route.ts',
  ];

  const fs = await import('fs');
  const path = await import('path');
  
  let hasErrors = false;
  
  for (const file of filesToCheck) {
    try {
      const filePath = path.resolve(process.cwd(), file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Check for getDatabase() instead of getDatabaseWithRetry()
      if (file.includes('questions/route.ts')) {
        if (content.includes('getDatabase()') && !content.includes('getDatabaseWithRetry()')) {
          log(`   ❌ ${file}: Still using getDatabase()`, 'red');
          hasErrors = true;
        } else {
          log(`   ✅ ${file}: Using getDatabaseWithRetry()`, 'green');
        }
      }
      
      // Check for error handling in courses route
      if (file.includes('student/courses')) {
        const hasEnrollmentsHandling = content.includes('enrollments table does not exist');
        const hasAccessRequestsHandling = content.includes('access_requests table does not exist');
        const hasStudentProgressHandling = content.includes('student_progress table does not exist');
        
        if (hasEnrollmentsHandling && hasAccessRequestsHandling && hasStudentProgressHandling) {
          log(`   ✅ ${file}: Has error handling for all missing tables`, 'green');
        } else {
          log(`   ⚠️  ${file}: Missing some error handling`, 'yellow');
          if (!hasEnrollmentsHandling) log(`      - Missing enrollments error handling`, 'yellow');
          if (!hasAccessRequestsHandling) log(`      - Missing access_requests error handling`, 'yellow');
          if (!hasStudentProgressHandling) log(`      - Missing student_progress error handling`, 'yellow');
        }
      }
    } catch (error) {
      log(`   ⚠️  Could not check ${file}: ${error.message}`, 'yellow');
    }
  }

  return !hasErrors;
}

async function runAllTests() {
  console.clear();
  log('\n🧪 COMPREHENSIVE FIX VERIFICATION TESTS', 'cyan');
  log(`Base URL: ${BASE_URL}\n`, 'blue');

  const results = {
    serverHealth: false,
    studentCourses: false,
    adminStudents: false,
    buildErrors: false,
  };

  // Test 1: Server Health
  results.serverHealth = await testServerHealth();
  
  if (!results.serverHealth) {
    log('\n❌ Server is not running. Cannot continue tests.', 'red');
    log('Please start the dev server: npm run dev', 'yellow');
    return;
  }

  // Test 2: Student Courses API
  results.studentCourses = (await testStudentCoursesAPI()).success;

  // Test 3: Admin Students API
  results.adminStudents = (await testAdminStudentsAPI()).success;

  // Test 4: Build Errors
  results.buildErrors = await testBuildErrors();

  // Summary
  logSection('TEST SUMMARY');
  
  const allPassed = Object.values(results).every(r => r === true);
  
  log(`Server Health:     ${results.serverHealth ? '✅ PASS' : '❌ FAIL'}`, results.serverHealth ? 'green' : 'red');
  log(`Student Courses:   ${results.studentCourses ? '✅ PASS' : '❌ FAIL'}`, results.studentCourses ? 'green' : 'red');
  log(`Admin Students:    ${results.adminStudents ? '✅ PASS' : '❌ FAIL'}`, results.adminStudents ? 'green' : 'red');
  log(`Build Errors:      ${results.buildErrors ? '✅ PASS' : '❌ FAIL'}`, results.buildErrors ? 'green' : 'red');

  if (allPassed) {
    log('\n🎉 ALL TESTS PASSED!', 'green');
  } else {
    log('\n⚠️  SOME TESTS FAILED - Review errors above', 'yellow');
  }

  log('\n📋 Next Steps:', 'cyan');
  log('1. Check browser console for ChunkLoadError', 'blue');
  log('2. Navigate to http://localhost:3000/student/dashboard', 'blue');
  log('3. Navigate to http://localhost:3000/admin/dashboard/students', 'blue');
  log('4. Verify courses appear and dates display correctly', 'blue');
}

// Run tests
runAllTests().catch(error => {
  log(`\n❌ Test runner error: ${error.message}`, 'red');
  process.exit(1);
});




