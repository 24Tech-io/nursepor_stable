/**
 * Comprehensive Platform Testing Script
 * Tests all features: login, student management, course builder, qbank, student pages
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🧪 Comprehensive LMS Platform Testing');
console.log('='.repeat(70));

const issues = {
  errors: [],
  syncIssues: [],
  mismatches: [],
  inconsistencies: [],
  missingFeatures: [],
  brokenEndpoints: [],
  validationIssues: [],
  dataIssues: [],
};

// Test categories
const testResults = {
  authentication: { passed: 0, failed: 0, issues: [] },
  studentManagement: { passed: 0, failed: 0, issues: [] },
  courseBuilder: { passed: 0, failed: 0, issues: [] },
  qbankManager: { passed: 0, failed: 0, issues: [] },
  studentPages: { passed: 0, failed: 0, issues: [] },
  adminPages: { passed: 0, failed: 0, issues: [] },
  dataSync: { passed: 0, failed: 0, issues: [] },
  apiEndpoints: { passed: 0, failed: 0, issues: [] },
};

// 1. Test Authentication Endpoints
function testAuthentication() {
  console.log('\n1️⃣ Testing Authentication...');
  
  const authEndpoints = [
    'src/app/api/auth/login/route.ts',
    'src/app/api/auth/register/route.ts',
    'src/app/api/auth/admin-login/route.ts',
    'src/app/api/auth/logout/route.ts',
    'src/app/api/auth/me/route.ts',
    'src/app/api/auth/face-login/route.ts',
    'src/app/api/auth/face-enroll/route.ts',
  ];
  
  for (const endpoint of authEndpoints) {
    const filePath = join(projectRoot, endpoint);
    try {
      if (!existsSync(filePath)) {
        testResults.authentication.failed++;
        issues.brokenEndpoints.push(`Missing: ${endpoint}`);
        continue;
      }
      
      const content = readFileSync(filePath, 'utf-8');
      
      // Check for validation
      if (!content.includes('extractAndValidate') && content.includes('request.json()')) {
        testResults.authentication.failed++;
        issues.validationIssues.push(`${endpoint}: Missing input validation`);
      }
      
      // Check for error handling
      if (!content.includes('try') || !content.includes('catch')) {
        testResults.authentication.failed++;
        issues.errors.push(`${endpoint}: Missing error handling`);
      }
      
      // Check for logger
      if (content.includes('console.log') || content.includes('console.error')) {
        testResults.authentication.failed++;
        issues.inconsistencies.push(`${endpoint}: Still using console.log instead of logger`);
      }
      
      testResults.authentication.passed++;
    } catch (error) {
      testResults.authentication.failed++;
      issues.errors.push(`${endpoint}: ${error.message}`);
    }
  }
  
  console.log(`   ✅ Passed: ${testResults.authentication.passed}`);
  console.log(`   ❌ Failed: ${testResults.authentication.failed}`);
}

// 2. Test Student Management
function testStudentManagement() {
  console.log('\n2️⃣ Testing Student Management...');
  
  const studentEndpoints = [
    'src/app/api/admin/students/route.ts',
    'src/app/api/admin/students/[id]/route.ts',
    'src/app/api/admin/students/[id]/courses/route.ts',
    'src/app/api/admin/students/[id]/toggle-active/route.ts',
  ];
  
  for (const endpoint of studentEndpoints) {
    const filePath = join(projectRoot, endpoint);
    try {
      if (!existsSync(filePath)) {
        testResults.studentManagement.failed++;
        issues.brokenEndpoints.push(`Missing: ${endpoint}`);
        continue;
      }
      
      const content = readFileSync(filePath, 'utf-8');
      
      // Check for dual-table sync
      if (endpoint.includes('courses')) {
        if (!content.includes('enrollStudent') && !content.includes('unenrollStudent')) {
          testResults.studentManagement.failed++;
          issues.syncIssues.push(`${endpoint}: Not using data-manager for enrollment sync`);
        }
        
        if (!content.includes('withEnrollmentLock')) {
          testResults.studentManagement.failed++;
          issues.syncIssues.push(`${endpoint}: Missing enrollment lock for concurrency`);
        }
      }
      
      // Check for validation
      if (!content.includes('extractAndValidate') && content.includes('request.json()')) {
        testResults.studentManagement.failed++;
        issues.validationIssues.push(`${endpoint}: Missing input validation`);
      }
      
      testResults.studentManagement.passed++;
    } catch (error) {
      testResults.studentManagement.failed++;
      issues.errors.push(`${endpoint}: ${error.message}`);
    }
  }
  
  console.log(`   ✅ Passed: ${testResults.studentManagement.passed}`);
  console.log(`   ❌ Failed: ${testResults.studentManagement.failed}`);
}

// 3. Test Course Builder
function testCourseBuilder() {
  console.log('\n3️⃣ Testing Course Builder...');
  
  const courseEndpoints = [
    'src/app/api/admin/courses/route.ts',
    'src/app/api/admin/courses/[courseId]/route.ts',
    'src/app/api/admin/courses/[courseId]/modules/route.ts',
    'src/app/api/admin/courses/[courseId]/modules/[moduleId]/route.ts',
    'src/app/api/admin/modules/[moduleId]/chapters/route.ts',
    'src/app/api/admin/chapters/[chapterId]/route.ts',
  ];
  
  for (const endpoint of courseEndpoints) {
    const filePath = join(projectRoot, endpoint);
    try {
      if (!existsSync(filePath)) {
        testResults.courseBuilder.failed++;
        issues.brokenEndpoints.push(`Missing: ${endpoint}`);
        continue;
      }
      
      const content = readFileSync(filePath, 'utf-8');
      
      // Check for status case consistency
      if (content.includes("'Published'") || content.includes("'Active'")) {
        testResults.courseBuilder.failed++;
        issues.inconsistencies.push(`${endpoint}: Using uppercase status values (should be lowercase)`);
      }
      
      // Check for validation
      if (!content.includes('extractAndValidate') && content.includes('request.json()')) {
        testResults.courseBuilder.failed++;
        issues.validationIssues.push(`${endpoint}: Missing input validation`);
      }
      
      testResults.courseBuilder.passed++;
    } catch (error) {
      testResults.courseBuilder.failed++;
      issues.errors.push(`${endpoint}: ${error.message}`);
    }
  }
  
  console.log(`   ✅ Passed: ${testResults.courseBuilder.passed}`);
  console.log(`   ❌ Failed: ${testResults.courseBuilder.failed}`);
}

// 4. Test Q-Bank Manager
function testQBankManager() {
  console.log('\n4️⃣ Testing Q-Bank Manager...');
  
  const qbankEndpoints = [
    'src/app/api/admin/qbanks/route.ts',
    'src/app/api/admin/qbanks/[id]/route.ts',
    'src/app/api/admin/qbanks/[id]/questions/route.ts',
    'src/app/api/admin/qbank/route.ts',
    'src/app/api/admin/qbank/categories/route.ts',
  ];
  
  for (const endpoint of qbankEndpoints) {
    const filePath = join(projectRoot, endpoint);
    try {
      if (!existsSync(filePath)) {
        testResults.qbankManager.failed++;
        issues.brokenEndpoints.push(`Missing: ${endpoint}`);
        continue;
      }
      
      const content = readFileSync(filePath, 'utf-8');
      
      // Check for validation
      if (!content.includes('extractAndValidate') && content.includes('request.json()')) {
        testResults.qbankManager.failed++;
        issues.validationIssues.push(`${endpoint}: Missing input validation`);
      }
      
      testResults.qbankManager.passed++;
    } catch (error) {
      testResults.qbankManager.failed++;
      issues.errors.push(`${endpoint}: ${error.message}`);
    }
  }
  
  console.log(`   ✅ Passed: ${testResults.qbankManager.passed}`);
  console.log(`   ❌ Failed: ${testResults.qbankManager.failed}`);
}

// 5. Test Student Pages
function testStudentPages() {
  console.log('\n5️⃣ Testing Student Pages...');
  
  const studentPages = [
    'src/app/student/dashboard/page.tsx',
    'src/app/student/courses/page.tsx',
    'src/app/student/courses/[courseId]/page.tsx',
    'src/app/student/quizzes/[quizId]/page.tsx',
    'src/app/student/qbanks/[id]/page.tsx',
    'src/app/student/profile/page.tsx',
  ];
  
  for (const page of studentPages) {
    const filePath = join(projectRoot, page);
    try {
      if (!existsSync(filePath)) {
        testResults.studentPages.failed++;
        issues.brokenEndpoints.push(`Missing: ${page}`);
        continue;
      }
      
      const content = readFileSync(filePath, 'utf-8');
      
      // Check for error handling
      if (!content.includes('try') && !content.includes('catch') && content.includes('fetch')) {
        testResults.studentPages.failed++;
        issues.errors.push(`${page}: Missing error handling for API calls`);
      }
      
      // Check for loading states
      if (!content.includes('isLoading') && !content.includes('loading')) {
        testResults.studentPages.failed++;
        issues.missingFeatures.push(`${page}: Missing loading state`);
      }
      
      testResults.studentPages.passed++;
    } catch (error) {
      testResults.studentPages.failed++;
      issues.errors.push(`${page}: ${error.message}`);
    }
  }
  
  console.log(`   ✅ Passed: ${testResults.studentPages.passed}`);
  console.log(`   ❌ Failed: ${testResults.studentPages.failed}`);
}

// 6. Test Data Sync
function testDataSync() {
  console.log('\n6️⃣ Testing Data Sync...');
  
  const syncEndpoints = [
    'src/app/api/student/chapters/complete/route.ts',
    'src/app/api/student/quizzes/[quizId]/submit/route.ts',
    'src/app/api/student/video-progress/route.ts',
    'src/app/api/student/enroll/route.ts',
  ];
  
  for (const endpoint of syncEndpoints) {
    const filePath = join(projectRoot, endpoint);
    try {
      if (!existsSync(filePath)) {
        testResults.dataSync.failed++;
        issues.brokenEndpoints.push(`Missing: ${endpoint}`);
        continue;
      }
      
      const content = readFileSync(filePath, 'utf-8');
      
      // Check for dual-table sync
      if (endpoint.includes('complete')) {
        if (!content.includes('markChapterComplete')) {
          testResults.dataSync.failed++;
          issues.syncIssues.push(`${endpoint}: Not using data-manager for chapter completion`);
        }
      }
      
      if (endpoint.includes('submit')) {
        if (!content.includes('submitQuiz')) {
          testResults.dataSync.failed++;
          issues.syncIssues.push(`${endpoint}: Not using data-manager for quiz submission`);
        }
      }
      
      if (endpoint.includes('enroll')) {
        if (!content.includes('enrollStudent')) {
          testResults.dataSync.failed++;
          issues.syncIssues.push(`${endpoint}: Not using data-manager for enrollment`);
        }
      }
      
      // Check for validation
      if (!content.includes('extractAndValidate') && content.includes('request.json()')) {
        testResults.dataSync.failed++;
        issues.validationIssues.push(`${endpoint}: Missing input validation`);
      }
      
      testResults.dataSync.passed++;
    } catch (error) {
      testResults.dataSync.failed++;
      issues.errors.push(`${endpoint}: ${error.message}`);
    }
  }
  
  console.log(`   ✅ Passed: ${testResults.dataSync.passed}`);
  console.log(`   ❌ Failed: ${testResults.dataSync.failed}`);
}

// 7. Check for common issues
function checkCommonIssues() {
  console.log('\n7️⃣ Checking for Common Issues...');
  
  const apiDir = join(projectRoot, 'src/app/api');
  const apiFiles = getAllFiles(apiDir, ['.ts']);
  
  for (const file of apiFiles) {
    try {
      const content = readFileSync(file, 'utf-8');
      const relativePath = file.replace(projectRoot + '\\', '').replace(projectRoot + '/', '');
      
      // Check for console.log
      if (content.includes('console.log') || content.includes('console.error')) {
        issues.inconsistencies.push(`${relativePath}: Still using console.log`);
      }
      
      // Check for status case
      if (content.includes("'Published'") || content.includes("'Active'")) {
        issues.inconsistencies.push(`${relativePath}: Using uppercase status values`);
      }
      
      // Check for missing validation
      if (content.includes('request.json()') && !content.includes('extractAndValidate') && !content.includes('TODO: Add validation')) {
        issues.validationIssues.push(`${relativePath}: Missing input validation`);
      }
      
      // Check for missing error handling
      if (content.includes('await') && !content.includes('try') && !content.includes('catch')) {
        issues.errors.push(`${relativePath}: Missing error handling`);
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  console.log(`   Found ${issues.inconsistencies.length} inconsistencies`);
  console.log(`   Found ${issues.validationIssues.length} validation issues`);
  console.log(`   Found ${issues.errors.length} error handling issues`);
}

function getAllFiles(dir, extensions = []) {
  let results = [];
  try {
    const list = readdirSync(dir);
    for (const file of list) {
      const filePath = join(dir, file);
      try {
        const stat = statSync(filePath);
        if (stat && stat.isDirectory()) {
          if (!file.startsWith('.') && file !== 'node_modules' && file !== '.next') {
            results = results.concat(getAllFiles(filePath, extensions));
          }
        } else {
          if (extensions.length === 0 || extensions.some(ext => file.endsWith(ext))) {
            results.push(filePath);
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  return results;
}

// Main execution
async function main() {
  testAuthentication();
  testStudentManagement();
  testCourseBuilder();
  testQBankManager();
  testStudentPages();
  testDataSync();
  checkCommonIssues();
  
  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: Object.values(testResults).reduce((sum, cat) => sum + cat.passed + cat.failed, 0),
      totalPassed: Object.values(testResults).reduce((sum, cat) => sum + cat.passed, 0),
      totalFailed: Object.values(testResults).reduce((sum, cat) => sum + cat.failed, 0),
    },
    testResults,
    issues,
  };
  
  // Save JSON report
  const jsonReportPath = join(projectRoot, 'COMPREHENSIVE_PLATFORM_TEST_REPORT.json');
  writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));
  
  // Generate markdown report
  const mdReport = generateMarkdownReport(report);
  const mdReportPath = join(projectRoot, 'COMPREHENSIVE_PLATFORM_TEST_REPORT.md');
  writeFileSync(mdReportPath, mdReport);
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total Tests: ${report.summary.totalTests}`);
  console.log(`✅ Passed: ${report.summary.totalPassed}`);
  console.log(`❌ Failed: ${report.summary.totalFailed}`);
  console.log(`\n📄 Reports saved:`);
  console.log(`   - ${jsonReportPath}`);
  console.log(`   - ${mdReportPath}`);
}

function generateMarkdownReport(report) {
  let md = `# Comprehensive Platform Test Report\n\n`;
  md += `**Date:** ${report.timestamp}\n`;
  md += `**Status:** ${report.summary.totalFailed > 0 ? '❌ Issues Found' : '✅ All Tests Passed'}\n\n`;
  md += `---\n\n`;
  
  md += `## 📊 Summary\n\n`;
  md += `- **Total Tests:** ${report.summary.totalTests}\n`;
  md += `- **Passed:** ${report.summary.totalPassed}\n`;
  md += `- **Failed:** ${report.summary.totalFailed}\n\n`;
  
  md += `## 🧪 Test Results by Category\n\n`;
  for (const [category, results] of Object.entries(report.testResults)) {
    md += `### ${category}\n`;
    md += `- ✅ Passed: ${results.passed}\n`;
    md += `- ❌ Failed: ${results.failed}\n\n`;
  }
  
  md += `## 🔍 Issues Found\n\n`;
  
  if (report.issues.errors.length > 0) {
    md += `### ❌ Errors (${report.issues.errors.length})\n\n`;
    report.issues.errors.slice(0, 20).forEach(issue => {
      md += `- ${issue}\n`;
    });
    if (report.issues.errors.length > 20) {
      md += `- ... and ${report.issues.errors.length - 20} more\n`;
    }
    md += `\n`;
  }
  
  if (report.issues.syncIssues.length > 0) {
    md += `### 🔄 Sync Issues (${report.issues.syncIssues.length})\n\n`;
    report.issues.syncIssues.forEach(issue => {
      md += `- ${issue}\n`;
    });
    md += `\n`;
  }
  
  if (report.issues.mismatches.length > 0) {
    md += `### ⚠️ Data Mismatches (${report.issues.mismatches.length})\n\n`;
    report.issues.mismatches.forEach(issue => {
      md += `- ${issue}\n`;
    });
    md += `\n`;
  }
  
  if (report.issues.inconsistencies.length > 0) {
    md += `### 🔀 Inconsistencies (${report.issues.inconsistencies.length})\n\n`;
    report.issues.inconsistencies.slice(0, 30).forEach(issue => {
      md += `- ${issue}\n`;
    });
    if (report.issues.inconsistencies.length > 30) {
      md += `- ... and ${report.issues.inconsistencies.length - 30} more\n`;
    }
    md += `\n`;
  }
  
  if (report.issues.validationIssues.length > 0) {
    md += `### 🛡️ Validation Issues (${report.issues.validationIssues.length})\n\n`;
    report.issues.validationIssues.slice(0, 30).forEach(issue => {
      md += `- ${issue}\n`;
    });
    if (report.issues.validationIssues.length > 30) {
      md += `- ... and ${report.issues.validationIssues.length - 30} more\n`;
    }
    md += `\n`;
  }
  
  if (report.issues.brokenEndpoints.length > 0) {
    md += `### 🔧 Broken Endpoints (${report.issues.brokenEndpoints.length})\n\n`;
    report.issues.brokenEndpoints.forEach(issue => {
      md += `- ${issue}\n`;
    });
    md += `\n`;
  }
  
  if (report.issues.missingFeatures.length > 0) {
    md += `### 📋 Missing Features (${report.issues.missingFeatures.length})\n\n`;
    report.issues.missingFeatures.forEach(issue => {
      md += `- ${issue}\n`;
    });
    md += `\n`;
  }
  
  return md;
}

main().catch(console.error);


