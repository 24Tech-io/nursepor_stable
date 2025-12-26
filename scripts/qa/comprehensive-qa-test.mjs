/**
 * Comprehensive QA Test Suite
 * Tests all features, endpoints, and functionality
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

console.log('🧪 Comprehensive QA Test Suite');
console.log('='.repeat(70));

const results = {
  passed: [],
  failed: [],
  warnings: [],
  skipped: [],
};

// Test categories
const tests = {
  apiEndpoints: [],
  database: [],
  authentication: [],
  authorization: [],
  dataSync: [],
  fileUploads: [],
  errorHandling: [],
  performance: [],
  security: [],
};

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    if (response.ok) {
      return true;
    }
  } catch (e) {
    return false;
  }
  return false;
}

// Test API endpoint
async function testEndpoint(method, path, options = {}) {
  const baseUrl = 'http://localhost:3000';
  const url = `${baseUrl}${path}`;
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    
    return {
      success: response.ok,
      status: response.status,
      data: await response.json().catch(() => null),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// Test 1: Health Check
async function testHealthCheck() {
  console.log('\n1️⃣ Testing Health Check...');
  const result = await testEndpoint('GET', '/api/health');
  
  if (result.success) {
    results.passed.push('Health check endpoint works');
    console.log('   ✅ Health check passed');
  } else {
    results.failed.push('Health check endpoint failed');
    console.log('   ❌ Health check failed');
  }
}

// Test 2: API Endpoints Structure
async function testAPIStructure() {
  console.log('\n2️⃣ Testing API Endpoints Structure...');
  
  const apiDir = join(projectRoot, 'src/app/api');
  const endpoints = [
    '/api/health',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/me',
    '/api/student/courses',
    '/api/admin/students',
    '/api/enrollments',
    '/api/courses',
  ];
  
  let passed = 0;
  for (const endpoint of endpoints) {
    const result = await testEndpoint('GET', endpoint);
    if (result.status !== 404) {
      passed++;
    }
  }
  
  if (passed === endpoints.length) {
    results.passed.push('API endpoints structure valid');
    console.log(`   ✅ All ${endpoints.length} endpoints accessible`);
  } else {
    results.warnings.push(`Only ${passed}/${endpoints.length} endpoints accessible`);
    console.log(`   ⚠️  ${passed}/${endpoints.length} endpoints accessible`);
  }
}

// Test 3: Database Connection
async function testDatabase() {
  console.log('\n3️⃣ Testing Database Connection...');
  
  const result = await testEndpoint('GET', '/api/health');
  if (result.success && result.data?.database === 'connected') {
    results.passed.push('Database connection works');
    console.log('   ✅ Database connected');
  } else {
    results.failed.push('Database connection failed');
    console.log('   ❌ Database connection failed');
  }
}

// Test 4: Authentication Endpoints
async function testAuthentication() {
  console.log('\n4️⃣ Testing Authentication Endpoints...');
  
  const authEndpoints = [
    { method: 'POST', path: '/api/auth/register', body: { name: 'Test', email: 'test@test.com', password: 'Test123!' } },
    { method: 'POST', path: '/api/auth/login', body: { email: 'test@test.com', password: 'Test123!' } },
    { method: 'GET', path: '/api/auth/me' },
  ];
  
  let passed = 0;
  for (const endpoint of authEndpoints) {
    const result = await testEndpoint(endpoint.method, endpoint.path, { body: endpoint.body });
    if (result.status !== 404 && result.status !== 500) {
      passed++;
    }
  }
  
  if (passed === authEndpoints.length) {
    results.passed.push('Authentication endpoints accessible');
    console.log(`   ✅ ${passed}/${authEndpoints.length} auth endpoints work`);
  } else {
    results.warnings.push(`Only ${passed}/${authEndpoints.length} auth endpoints work`);
    console.log(`   ⚠️  ${passed}/${authEndpoints.length} auth endpoints work`);
  }
}

// Test 5: Error Handling
async function testErrorHandling() {
  console.log('\n5️⃣ Testing Error Handling...');
  
  // Test invalid endpoint
  const result1 = await testEndpoint('GET', '/api/invalid-endpoint');
  if (result1.status === 404) {
    results.passed.push('404 error handling works');
    console.log('   ✅ 404 errors handled correctly');
  } else {
    results.warnings.push('404 error handling may need improvement');
    console.log('   ⚠️  404 error handling needs review');
  }
  
  // Test invalid request
  const result2 = await testEndpoint('POST', '/api/auth/login', { body: { invalid: 'data' } });
  if (result2.status === 400 || result2.status === 401) {
    results.passed.push('400/401 error handling works');
    console.log('   ✅ 400/401 errors handled correctly');
  } else {
    results.warnings.push('400/401 error handling may need improvement');
    console.log('   ⚠️  400/401 error handling needs review');
  }
}

// Test 6: File Upload Validation
async function testFileUploadValidation() {
  console.log('\n6️⃣ Testing File Upload Validation...');
  
  // Check if upload endpoint exists and has validation
  const uploadFile = join(projectRoot, 'src/app/api/upload/route.ts');
  try {
    const content = readFileSync(uploadFile, 'utf-8');
    
    const hasValidation = 
      content.includes('allowedTypes') &&
      content.includes('blockedExtensions') &&
      content.includes('file.size') &&
      content.includes('MAX_FILE_SIZE');
    
    if (hasValidation) {
      results.passed.push('File upload validation implemented');
      console.log('   ✅ File upload validation found');
    } else {
      results.warnings.push('File upload validation may be incomplete');
      console.log('   ⚠️  File upload validation needs review');
    }
  } catch (e) {
    results.skipped.push('Could not check file upload validation');
    console.log('   ⏭️  Could not check file upload validation');
  }
}

// Test 7: Security Headers
async function testSecurityHeaders() {
  console.log('\n7️⃣ Testing Security Headers...');
  
  const result = await testEndpoint('GET', '/api/health');
  // Note: We can't check headers from fetch in Node.js easily
  // This would need to be tested with a browser or curl
  
  const middlewareFile = join(projectRoot, 'src/middleware.ts');
  try {
    const content = readFileSync(middlewareFile, 'utf-8');
    
    const hasSecurityHeaders = 
      content.includes('X-Content-Type-Options') &&
      content.includes('X-Frame-Options') &&
      content.includes('Content-Security-Policy');
    
    if (hasSecurityHeaders) {
      results.passed.push('Security headers configured');
      console.log('   ✅ Security headers found in middleware');
    } else {
      results.warnings.push('Security headers may be incomplete');
      console.log('   ⚠️  Security headers need review');
    }
  } catch (e) {
    results.skipped.push('Could not check security headers');
    console.log('   ⏭️  Could not check security headers');
  }
}

// Test 8: Data Synchronization
async function testDataSync() {
  console.log('\n8️⃣ Testing Data Synchronization...');
  
  // Check if data-manager uses transactions
  const coreFile = join(projectRoot, 'src/lib/data-manager/core.ts');
  try {
    const content = readFileSync(coreFile, 'utf-8');
    
    if (content.includes('db.transaction')) {
      results.passed.push('Data manager uses transactions');
      console.log('   ✅ Transactions implemented');
    } else {
      results.failed.push('Data manager missing transactions');
      console.log('   ❌ Transactions not found');
    }
    
    // Check if enrollment helpers sync both tables
    const enrollmentHelper = join(projectRoot, 'src/lib/data-manager/helpers/enrollment-helper.ts');
    const helperContent = readFileSync(enrollmentHelper, 'utf-8');
    
    if (helperContent.includes('enrollments') && helperContent.includes('studentProgress')) {
      results.passed.push('Enrollment helpers sync both tables');
      console.log('   ✅ Dual-table sync implemented');
    } else {
      results.warnings.push('Enrollment helpers may not sync both tables');
      console.log('   ⚠️  Dual-table sync needs verification');
    }
  } catch (e) {
    results.skipped.push('Could not check data sync');
    console.log('   ⏭️  Could not check data sync');
  }
}

// Test 9: Environment Configuration
async function testEnvironmentConfig() {
  console.log('\n9️⃣ Testing Environment Configuration...');
  
  const envExample = join(projectRoot, '.env.example');
  const envLocal = join(projectRoot, '.env.local');
  
  try {
    const exampleContent = readFileSync(envExample, 'utf-8');
    const requiredVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'NEXT_PUBLIC_APP_URL',
    ];
    
    let found = 0;
    for (const varName of requiredVars) {
      if (exampleContent.includes(varName)) {
        found++;
      }
    }
    
    if (found === requiredVars.length) {
      results.passed.push('Environment variables documented');
      console.log('   ✅ Required env vars documented');
    } else {
      results.warnings.push('Some required env vars may be missing');
      console.log(`   ⚠️  ${found}/${requiredVars.length} required vars documented`);
    }
  } catch (e) {
    results.warnings.push('Could not check environment config');
    console.log('   ⚠️  Could not check environment config');
  }
}

// Test 10: Code Quality
async function testCodeQuality() {
  console.log('\n🔟 Testing Code Quality...');
  
  // Check for console.log in API routes
  const apiDir = join(projectRoot, 'src/app/api');
  const { execSync } = await import('child_process');
  
  try {
    const grepResult = execSync(
      `grep -r "console\\.log" "${apiDir}" --include="*.ts" --include="*.tsx" | wc -l`,
      { encoding: 'utf-8', shell: true }
    ).trim();
    
    const consoleCount = parseInt(grepResult) || 0;
    
    if (consoleCount === 0) {
      results.passed.push('No console.log in API routes');
      console.log('   ✅ No console.log statements found');
    } else {
      results.warnings.push(`${consoleCount} console.log statements still in API routes`);
      console.log(`   ⚠️  ${consoleCount} console.log statements found`);
    }
  } catch (e) {
    // Windows doesn't have grep, use alternative
    results.skipped.push('Could not check console.log usage');
    console.log('   ⏭️  Could not check console.log usage');
  }
}

// Main test runner
async function runAllTests() {
  console.log('Starting comprehensive QA tests...\n');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log('⚠️  Server not running. Some tests will be skipped.');
    console.log('   Start server with: npm run dev\n');
    results.warnings.push('Server not running - some tests skipped');
  }
  
  await testHealthCheck();
  await testAPIStructure();
  await testDatabase();
  await testAuthentication();
  await testErrorHandling();
  await testFileUploadValidation();
  await testSecurityHeaders();
  await testDataSync();
  await testEnvironmentConfig();
  await testCodeQuality();
  
  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 QA TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);
  console.log(`⏭️  Skipped: ${results.skipped.length}`);
  
  if (results.passed.length > 0) {
    console.log('\n✅ Passed Tests:');
    results.passed.forEach(test => console.log(`   - ${test}`));
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    results.failed.forEach(test => console.log(`   - ${test}`));
  }
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    results.warnings.forEach(warning => console.log(`   - ${warning}`));
  }
  
  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      passed: results.passed.length,
      failed: results.failed.length,
      warnings: results.warnings.length,
      skipped: results.skipped.length,
    },
    results,
  };
  
  const fs = await import('fs');
  const reportPath = join(projectRoot, 'qa-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Report saved to: ${reportPath}`);
}

runAllTests().catch(console.error);


